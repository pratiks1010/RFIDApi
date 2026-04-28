<?php
/**
 * Proxy for Feronia API. Forwards /api/Feronia/getTAGIT_StockData to
 * http://192.168.29.245:83/sjedataservice.asmx/getTAGIT_StockData
 */
$path = isset($_GET['path']) ? trim($_GET['path']) : '';
if ($path === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'Missing path']);
    exit;
}

$base = 'http://192.168.29.245:83/sjedataservice.asmx';
$url = $base . '/' . ltrim($path, '/');

$headers = [];
$auth = null;
foreach (getallheaders() as $k => $v) {
    if (strtolower($k) === 'authorization') {
        $auth = $v;
        break;
    }
}
if ($auth !== null) {
    $headers[] = 'Authorization: ' . $auth;
}
$headers[] = 'Accept: application/json, text/plain, */*';

$opts = [
    'http' => [
        'method' => 'GET',
        'header' => implode("\r\n", $headers),
        'timeout' => 45,
        'ignore_errors' => true
    ]
];
$ctx = stream_context_create($opts);
$response = @file_get_contents($url, false, $ctx);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'Feronia API unreachable']);
    exit;
}

$code = 200;
if (isset($http_response_header[0]) && preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $m)) {
    $code = (int) $m[1];
}
http_response_code($code);
header('Content-Type: application/json');
echo $response;
