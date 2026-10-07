<?php
/**
 * api/stations.php — same-origin radius-search proxy for public fuel-station data.
 *
 * POST (JSON or form-encoded): {"provider":"pt-dgeg"|"es-minetur","fuel":string,
 * "lat":float,"lon":float,"radius":float}. Requests without "provider" are treated
 * as pt-dgeg. Returns stations within the radius (km), sorted by price then
 * distance. Each provider's dataset is fetched at most once per hour and cached
 * in api/cache/ as a 0.1-degree grid index. Request coordinates are never
 * logged or persisted.
 */

ini_set('memory_limit', '256M');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function fail($code, $msg) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

const ES_FUEL_COLS = [
    'Precio Gasoleo A', 'Precio Gasoleo Premium', 'Precio Gasolina 95 E5',
    'Precio Gasolina 95 E10', 'Precio Gasolina 95 E5 Premium', 'Precio Gasolina 98 E5',
    'Precio Gasolina 98 E10', 'Precio Gases licuados del petróleo',
    'Precio Gas Natural Comprimido', 'Precio Gas Natural Licuado',
    'Precio Gasolina 95 E85', 'Precio Adblue',
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
        echo '{"ok":true}';
        exit;
    }
    http_response_code(405);
    header('Allow: POST');
    fail(405, 'Method not allowed');
}

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $host = explode(':', $_SERVER['HTTP_HOST'] ?: '')[0];
    if (!$originHost || strtolower($originHost) !== strtolower($host)) fail(403, 'Forbidden');
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$provider = isset($in['provider']) ? (string)$in['provider'] : 'pt-dgeg';
if ($provider !== 'pt-dgeg' && $provider !== 'es-minetur') fail(400, 'Invalid provider');
$fuel = isset($in['fuel']) ? (string)$in['fuel'] : '';
if ($provider === 'pt-dgeg' && !preg_match('/^\d{1,6}$/', $fuel)) fail(400, 'Invalid fuel');
if ($provider === 'es-minetur' && !in_array($fuel, ES_FUEL_COLS, true)) fail(400, 'Invalid fuel');
$lat = isset($in['lat']) ? filter_var($in['lat'], FILTER_VALIDATE_FLOAT) : false;
$lon = isset($in['lon']) ? filter_var($in['lon'], FILTER_VALIDATE_FLOAT) : false;
if ($lat === false || $lat < -90 || $lat > 90) fail(400, 'Invalid lat');
if ($lon === false || $lon < -180 || $lon > 180) fail(400, 'Invalid lon');
$radius = isset($in['radius']) ? filter_var($in['radius'], FILTER_VALIDATE_FLOAT) : false;
if ($radius === false) fail(400, 'Invalid radius');
$radius = max(1, min(1000, $radius));

function cacheDir() {
    $d = __DIR__ . '/cache';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    if (!is_dir($d) || !is_writable($d)) {
        $d = sys_get_temp_dir() . '/fuellog-cache';
        if (!is_dir($d)) @mkdir($d, 0750, true);
    }
    return $d;
}

function loadIndex($file) {
    if (!is_file($file)) return null;
    $d = json_decode(file_get_contents($file), true);
    return is_array($d) && isset($d['ts'], $d['cells']) ? $d : null;
}

function upstreamUrl($provider, $fuel) {
    if ($provider === 'es-minetur') {
        return 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
    }
    return 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/PesquisarPostos?idsTiposComb=' . $fuel . '&qtdPorPagina=4000&pagina=1&orderDesc=0';
}

function fetchUpstream($provider, $fuel) {
    $url = upstreamUrl($provider, $fuel);
    $timeout = $provider === 'es-minetur' ? 60 : 20;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'FuelLog/1.0 (+https://fuel.trekm.com)',
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        return ($body === false || $code >= 400) ? null : $body;
    }
    $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'follow_location' => 1, 'user_agent' => 'FuelLog/1.0 (+https://fuel.trekm.com)']]);
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? null : $body;
}

function resultRows($d) {
    if (!is_array($d)) return [];
    $r = isset($d['resultado']) ? $d['resultado'] : (isset($d['Resultado']) ? $d['Resultado'] : $d);
    if (is_array($r) && array_values($r) === $r) return $r;
    if (is_array($r) && isset($r['items']) && is_array($r['items'])) return $r['items'];
    if (is_array($r) && isset($r['Postos']) && is_array($r['Postos'])) return $r['Postos'];
    return [];
}

function val($o, $keys) {
    foreach ($keys as $k) if (isset($o[$k])) return $o[$k];
    return null;
}

function pnum($x) {
    if ($x === null) return NAN;
    $s = preg_replace('/[^0-9.\-]/', '', str_replace(',', '.', (string)$x));
    return is_numeric($s) ? (float)$s : NAN;
}

function esDateIso($s) {
    $d = DateTime::createFromFormat('d/m/Y H:i:s', trim((string)$s));
    return $d ? $d->format('c') : null;
}

function esTitle($s) {
    $s = trim((string)$s);
    if (function_exists('mb_convert_case')) return mb_convert_case(mb_strtolower($s, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
    return ucwords(strtolower($s));
}

function buildIndex($provider, $fuel, $raw) {
    $d = json_decode($raw, true);
    $cells = [];
    $n = 0;
    $sourceUpdatedAt = null;
    if ($provider === 'es-minetur') {
        $rows = is_array($d) && isset($d['ListaEESSPrecio']) && is_array($d['ListaEESSPrecio']) ? $d['ListaEESSPrecio'] : [];
        $sourceUpdatedAt = isset($d['Fecha']) ? esDateIso($d['Fecha']) : null;
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $lat = pnum(val($row, ['Latitud']));
            $lon = pnum(val($row, ['Longitud (WGS84)']));
            if (!is_finite($lat) || !is_finite($lon)) continue;
            $prices = [];
            foreach (ES_FUEL_COLS as $c) {
                $p = pnum(val($row, [$c]));
                if (is_finite($p)) $prices[$c] = $p;
            }
            if (!$prices) continue;
            $rotulo = (string)(val($row, ['Rótulo']) ?: 'Fuel station');
            $loc = esTitle(val($row, ['Localidad']));
            $key = intval(floor($lat / 0.1)) . '_' . intval(floor($lon / 0.1));
            $cells[$key][] = [
                val($row, ['IDEESS']),
                $loc ? $rotulo . ' · ' . $loc : $rotulo,
                $rotulo,
                (string)(val($row, ['Dirección']) ?: ''),
                (string)(val($row, ['Municipio']) ?: ''),
                (string)($sourceUpdatedAt ?: ''),
                $lat, $lon, $prices,
            ];
            $n++;
        }
    } else {
        foreach (resultRows($d) as $row) {
            if (!is_array($row)) continue;
            $lat = pnum(val($row, ['Latitude', 'latitude', 'Lat', 'lat']));
            $lon = pnum(val($row, ['Longitude', 'longitude', 'Lng', 'lng']));
            $price = pnum(val($row, ['Preco', 'preco', 'Preço', 'price']));
            if (!is_finite($lat) || !is_finite($lon) || !is_finite($price)) continue;
            $key = intval(floor($lat / 0.1)) . '_' . intval(floor($lon / 0.1));
            $cells[$key][] = [
                val($row, ['Id', 'id', 'ID', 'IdPosto']),
                val($row, ['Nome', 'nome', 'NomePosto', 'Designacao']) ?: 'Fuel station',
                (string)(val($row, ['Marca', 'marca']) ?: ''),
                (string)(val($row, ['Morada', 'morada']) ?: ''),
                (string)(val($row, ['Municipio', 'municipio', 'Localidade', 'localidade']) ?: ''),
                (string)(val($row, ['DataAtualizacao', 'dataAtualizacao', 'Atualizado']) ?: ''),
                $lat, $lon, [$fuel => $price],
            ];
            $n++;
        }
    }
    return ['ts' => time(), 'provider' => $provider, 'fuel' => $fuel, 'count' => $n, 'sourceUpdatedAt' => $sourceUpdatedAt, 'cells' => $cells];
}

function hav($a, $b, $c, $d) {
    $p = M_PI / 180;
    $x = ($c - $a) * $p;
    $y = ($d - $b) * $p;
    $A = sin($x / 2) ** 2 + cos($a * $p) * cos($c * $p) * sin($y / 2) ** 2;
    return 2 * 6371 * asin(sqrt($A));
}

$dir = cacheDir();
$file = $dir . '/' . $provider . '-' . ($provider === 'es-minetur' ? 'all' : $fuel) . '.json';
$idx = loadIndex($file);
$stale = false;

if (!$idx || time() - $idx['ts'] > 3600) {
    $lock = fopen($dir . '/' . $provider . '-' . ($provider === 'es-minetur' ? 'all' : $fuel) . '.lock', 'c');
    if ($lock && flock($lock, LOCK_EX | LOCK_NB)) {
        $raw = fetchUpstream($provider, $fuel);
        $new = $raw !== null ? buildIndex($provider, $fuel, $raw) : null;
        unset($raw);
        if ($new && $new['count'] > 0) {
            $tmp = $file . '.tmp-' . getmypid();
            file_put_contents($tmp, json_encode($new, JSON_INVALID_UTF8_SUBSTITUTE));
            unset($new);
            rename($tmp, $file);
            $idx = loadIndex($file);
        } elseif ($idx) {
            $stale = true;
        }
        flock($lock, LOCK_UN);
        fclose($lock);
    } elseif ($idx) {
        $stale = true;
    } else {
        if ($lock) { flock($lock, LOCK_EX); flock($lock, LOCK_UN); fclose($lock); }
        $idx = loadIndex($file);
    }
    if (!$idx) fail(502, 'Upstream unavailable');
    if (time() - $idx['ts'] > 3600) $stale = true;
}

$dlat = $radius / 111.32;
$dlon = $radius / (111.32 * max(0.01, cos(deg2rad($lat))));
$cy0 = intval(floor(($lat - $dlat) / 0.1));
$cy1 = intval(floor(($lat + $dlat) / 0.1));
$cx0 = intval(floor(($lon - $dlon) / 0.1));
$cx1 = intval(floor(($lon + $dlon) / 0.1));

$out = [];
for ($cy = $cy0; $cy <= $cy1; $cy++) {
    for ($cx = $cx0; $cx <= $cx1; $cx++) {
        $key = $cy . '_' . $cx;
        if (empty($idx['cells'][$key])) continue;
        foreach ($idx['cells'][$key] as $r) {
            if (!isset($r[8][$fuel])) continue;
            $dist = hav($lat, $lon, $r[6], $r[7]);
            if ($dist > $radius) continue;
            $out[] = [
                'id' => $r[0], 'name' => $r[1], 'brand' => $r[2], 'address' => $r[3],
                'town' => $r[4], 'updated' => $r[5], 'lat' => $r[6], 'lon' => $r[7],
                'price' => $r[8][$fuel], 'distance' => round($dist, 2),
            ];
        }
    }
}
usort($out, function ($a, $b) { return $a['price'] <=> $b['price'] ?: $a['distance'] <=> $b['distance']; });
$count = count($out);
$out = array_slice($out, 0, 200);

echo json_encode([
    'provider' => $provider,
    'stations' => $out,
    'count' => $count,
    'cachedAt' => gmdate('c', $idx['ts']),
    'sourceUpdatedAt' => isset($idx['sourceUpdatedAt']) ? $idx['sourceUpdatedAt'] : null,
    'stale' => $stale,
], JSON_INVALID_UTF8_SUBSTITUTE);
