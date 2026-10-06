<?php
/**
 * api/stations.php — same-origin radius-search proxy for DGEG fuel stations.
 *
 * POST (JSON or form-encoded): {"fuel":int,"lat":float,"lon":float,"radius":float}
 * Returns the stations within the radius (km), sorted by price then distance.
 * The full per-fuel station list is fetched from DGEG at most once per hour and
 * cached in api/cache/ as a 0.1-degree grid index. Request coordinates are
 * never logged or persisted.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function fail($code, $msg) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

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

$fuel = isset($in['fuel']) ? filter_var($in['fuel'], FILTER_VALIDATE_INT) : false;
if ($fuel === false || $fuel <= 0) fail(400, 'Invalid fuel');
$lat = isset($in['lat']) ? filter_var($in['lat'], FILTER_VALIDATE_FLOAT) : false;
$lon = isset($in['lon']) ? filter_var($in['lon'], FILTER_VALIDATE_FLOAT) : false;
if ($lat === false || $lat < -90 || $lat > 90) fail(400, 'Invalid lat');
if ($lon === false || $lon < -180 || $lon > 180) fail(400, 'Invalid lon');
$radius = isset($in['radius']) ? filter_var($in['radius'], FILTER_VALIDATE_FLOAT) : false;
if ($radius === false) fail(400, 'Invalid radius');
$radius = max(1, min(100, $radius));

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

function fetchUpstream($fuel) {
    $url = 'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/PesquisarPostos?idsTiposComb=' . $fuel . '&qtdPorPagina=4000&pagina=1&orderDesc=0';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'FuelLog/1.0 (+https://fuel.trekm.com)',
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        return ($body === false || $code >= 400) ? null : $body;
    }
    $ctx = stream_context_create(['http' => ['timeout' => 20, 'follow_location' => 1, 'user_agent' => 'FuelLog/1.0 (+https://fuel.trekm.com)']]);
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

function normStation($s) {
    return [
        val($s, ['Id', 'id', 'ID', 'IdPosto']),
        val($s, ['Nome', 'nome', 'NomePosto', 'Designacao']) ?: 'Fuel station',
        val($s, ['Marca', 'marca']) ?: '',
        val($s, ['Morada', 'morada']) ?: '',
        val($s, ['Municipio', 'municipio', 'Localidade', 'localidade']) ?: '',
        (string)(val($s, ['DataAtualizacao', 'dataAtualizacao', 'Atualizado']) ?: ''),
        pnum(val($s, ['Latitude', 'latitude', 'Lat', 'lat'])),
        pnum(val($s, ['Longitude', 'longitude', 'Lng', 'lng'])),
        pnum(val($s, ['Preco', 'preco', 'Preço', 'price'])),
    ];
}

function buildIndex($fuel, $raw) {
    $d = json_decode($raw, true);
    $cells = [];
    $n = 0;
    foreach (resultRows($d) as $row) {
        if (!is_array($row)) continue;
        $s = normStation($row);
        if (!is_finite($s[6]) || !is_finite($s[7]) || !is_finite($s[8])) continue;
        $key = intval(floor($s[6] / 0.1)) . '_' . intval(floor($s[7] / 0.1));
        $cells[$key][] = $s;
        $n++;
    }
    return ['ts' => time(), 'fuel' => $fuel, 'count' => $n, 'cells' => $cells];
}

function hav($a, $b, $c, $d) {
    $p = M_PI / 180;
    $x = ($c - $a) * $p;
    $y = ($d - $b) * $p;
    $A = sin($x / 2) ** 2 + cos($a * $p) * cos($c * $p) * sin($y / 2) ** 2;
    return 2 * 6371 * asin(sqrt($A));
}

$dir = cacheDir();
$file = $dir . '/stations-' . $fuel . '.json';
$idx = loadIndex($file);
$stale = false;

if (!$idx || time() - $idx['ts'] > 3600) {
    $lock = fopen($dir . '/stations-' . $fuel . '.lock', 'c');
    if ($lock && flock($lock, LOCK_EX | LOCK_NB)) {
        $raw = fetchUpstream($fuel);
        $new = $raw !== null ? buildIndex($fuel, $raw) : null;
        if ($new && $new['count'] > 0) {
            $tmp = $file . '.tmp-' . getmypid();
            $json = json_encode($new, JSON_INVALID_UTF8_SUBSTITUTE);
            if ($json !== false && file_put_contents($tmp, $json) !== false) rename($tmp, $file);
            $idx = $new;
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
            $dist = hav($lat, $lon, $r[6], $r[7]);
            if ($dist > $radius) continue;
            $out[] = [
                'id' => $r[0], 'name' => $r[1], 'brand' => $r[2], 'address' => $r[3],
                'town' => $r[4], 'updated' => $r[5], 'lat' => $r[6], 'lon' => $r[7],
                'price' => $r[8], 'distance' => round($dist, 2),
            ];
        }
    }
}
usort($out, function ($a, $b) { return $a['price'] <=> $b['price'] ?: $a['distance'] <=> $b['distance']; });
$count = count($out);
$out = array_slice($out, 0, 200);

echo json_encode([
    'stations' => $out,
    'count' => $count,
    'cachedAt' => gmdate('c', $idx['ts']),
    'stale' => $stale,
], JSON_INVALID_UTF8_SUBSTITUTE);
