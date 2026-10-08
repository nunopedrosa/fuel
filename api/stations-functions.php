<?php
/**
 * Shared station-proxy helpers (used by api/stations.php and scripts/check-stations.php).
 */

const ES_FUEL_COLS = [
    'Precio Gasoleo A', 'Precio Gasoleo Premium', 'Precio Gasolina 95 E5',
    'Precio Gasolina 95 E10', 'Precio Gasolina 95 E5 Premium', 'Precio Gasolina 98 E5',
    'Precio Gasolina 98 E10', 'Precio Gases licuados del petróleo',
    'Precio Gas Natural Comprimido', 'Precio Gas Natural Licuado',
    'Precio Gasolina 95 E85', 'Precio Adblue',
];

const STATIONS_PROXY_PROVIDERS = ['pt-dgeg', 'es-minetur'];

function cacheDir() {
    $override = getenv('FUELLOG_CACHE_DIR');
    if ($override !== false && $override !== '') {
        if (!is_dir($override)) @mkdir($override, 0750, true);
        return $override;
    }
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

/** @return array{stations:array,count:int} */
function stationsSearchFromIndex(array $idx, $fuel, $lat, $lon, $radius) {
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
    return ['stations' => array_slice($out, 0, 200), 'count' => $count];
}

/**
 * Validate POST body for station search. Returns ['ok'=>true,...] or ['ok'=>false,'code'=>int,'error'=>string].
 */
function parseStationsRequest(array $in) {
    $provider = isset($in['provider']) ? (string)$in['provider'] : 'pt-dgeg';
    if (!in_array($provider, STATIONS_PROXY_PROVIDERS, true)) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid provider'];
    }
    $fuel = isset($in['fuel']) ? (string)$in['fuel'] : '';
    if ($provider === 'pt-dgeg' && !preg_match('/^\d{1,6}$/', $fuel)) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid fuel'];
    }
    if ($provider === 'es-minetur' && !in_array($fuel, ES_FUEL_COLS, true)) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid fuel'];
    }
    $lat = isset($in['lat']) ? filter_var($in['lat'], FILTER_VALIDATE_FLOAT) : false;
    $lon = isset($in['lon']) ? filter_var($in['lon'], FILTER_VALIDATE_FLOAT) : false;
    if ($lat === false || $lat < -90 || $lat > 90) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid lat'];
    }
    if ($lon === false || $lon < -180 || $lon > 180) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid lon'];
    }
    $radius = isset($in['radius']) ? filter_var($in['radius'], FILTER_VALIDATE_FLOAT) : false;
    if ($radius === false) {
        return ['ok' => false, 'code' => 400, 'error' => 'Invalid radius'];
    }
    $radius = max(1, min(1000, $radius));
    return ['ok' => true, 'provider' => $provider, 'fuel' => $fuel, 'lat' => $lat, 'lon' => $lon, 'radius' => $radius];
}

function indexCacheFile($dir, $provider, $fuel) {
    return $dir . '/' . $provider . '-' . ($provider === 'es-minetur' ? 'all' : $fuel) . '.json';
}
