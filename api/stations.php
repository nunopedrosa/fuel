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

require_once __DIR__ . '/stations-functions.php';

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

$parsed = parseStationsRequest($in);
if (!$parsed['ok']) fail($parsed['code'], $parsed['error']);
$provider = $parsed['provider'];
$fuel = $parsed['fuel'];
$lat = $parsed['lat'];
$lon = $parsed['lon'];
$radius = $parsed['radius'];

$dir = cacheDir();
$file = indexCacheFile($dir, $provider, $fuel);
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

$search = stationsSearchFromIndex($idx, $fuel, $lat, $lon, $radius);

echo json_encode([
    'provider' => $provider,
    'stations' => $search['stations'],
    'count' => $search['count'],
    'cachedAt' => gmdate('c', $idx['ts']),
    'sourceUpdatedAt' => isset($idx['sourceUpdatedAt']) ? $idx['sourceUpdatedAt'] : null,
    'stale' => $stale,
], JSON_INVALID_UTF8_SUBSTITUTE);
