<?php
/**
 * Kumar 916 StockMaster — same pattern as gati-proxy.php / feronia-proxy.php.
 * Apache: .htaccess rewrites /api/kumar916/<path>?query → this file with path=… (see public/.htaccess).
 * Upstream: http://103.87.92.69:8080/<path>?<same query params except path>
 */
$path = isset($_GET['path']) ? trim($_GET['path']) : '';
if ($path === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing path', 'hint' => 'Use /api/kumar916/916Advanced/... per .htaccess rewrite']);
    exit;
}

$params = $_GET;
unset($params['path']);
$query = http_build_query($params);

$upstream = getenv('KUMAR916_UPSTREAM') ?: 'http://103.87.92.69:8080';
$safePath = preg_replace('#\.\.+#', '', $path);
$url = rtrim($upstream, '/') . '/' . ltrim($safePath, '/');
if ($query !== '') {
    $url .= '?' . $query;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'PHP cURL extension required']);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json, text/plain, */*'],
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_FOLLOWLOCATION => false,
]);
$response = curl_exec($ch);
$errno = curl_errno($ch);
$err = curl_error($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => '916 upstream unreachable', 'detail' => $err ?: 'curl failed', 'errno' => $errno]);
    exit;
}

if ($code <= 0) {
    $code = 200;
}
http_response_code($code);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo $response;
