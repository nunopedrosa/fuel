<?php
/**
 * Offline regression checks for api/stations.php (no upstream network).
 */
require_once __DIR__ . '/../api/stations-functions.php';

function check($cond, $msg) {
    if (!$cond) {
        fwrite(STDERR, "stations check failed: $msg\n");
        exit(1);
    }
}

$fixtureDir = __DIR__ . '/fixtures/providers';

$ptRaw = file_get_contents($fixtureDir . '/pt-dgeg-search.json');
$ptIdx = buildIndex('pt-dgeg', '2101', $ptRaw);
check($ptIdx['count'] === 1, 'PT index count');
$ptSearch = stationsSearchFromIndex($ptIdx, '2101', 38.72, -9.14, 50);
check($ptSearch['count'] === 1, 'PT radius search');
check(abs($ptSearch['stations'][0]['price'] - 1.799) < 0.001, 'PT price');

$esRaw = file_get_contents($fixtureDir . '/es-minetur-search.json');
$esIdx = buildIndex('es-minetur', 'Precio Gasoleo A', $esRaw);
check($esIdx['count'] === 1, 'ES index count');
$esSearch = stationsSearchFromIndex($esIdx, 'Precio Gasoleo A', 40.4168, -3.7038, 50);
check($esSearch['count'] === 1, 'ES radius search');
check($esSearch['stations'][0]['id'] === 'ES-9001', 'ES station id preserved');

$bad = parseStationsRequest(['provider' => 'evil', 'fuel' => '2101', 'lat' => 0, 'lon' => 0, 'radius' => 10]);
check(!$bad['ok'] && $bad['code'] === 400, 'reject unknown provider');
$badFuel = parseStationsRequest(['provider' => 'pt-dgeg', 'fuel' => 'not-a-code', 'lat' => 0, 'lon' => 0, 'radius' => 10]);
check(!$badFuel['ok'], 'reject invalid PT fuel code');
$ok = parseStationsRequest(['fuel' => '2101', 'lat' => 38.7, 'lon' => -9.1, 'radius' => 25]);
check($ok['ok'] && $ok['provider'] === 'pt-dgeg' && $ok['radius'] == 25, 'default provider and radius clamp');

$cacheDir = sys_get_temp_dir() . '/fuellog-stations-check-' . getmypid();
@mkdir($cacheDir, 0750, true);
putenv('FUELLOG_CACHE_DIR=' . $cacheDir);
$file = indexCacheFile($cacheDir, 'pt-dgeg', '2101');
file_put_contents($file, json_encode($ptIdx));
check(is_file($file) && strpos($file, $cacheDir) === 0, 'cache file stays inside cache dir');

echo "stations checks passed\n";
