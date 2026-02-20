<?php
/**
 * Proxy for Gati API (Tamannaah BS). Forwards /api/TamannaahBS/* to http://3.109.131.101:816/api/TamannaahBS/*
 * Upload this file to your server root and add the rewrite rule in .htaccess (see GATI_API_PROXY_SETUP.md).
 */
$path = isset($_GET['path']) ? trim($_GET['path']) : '';
if ($path === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'Missing path']);
    exit;
}

$base = 'http://3.109.131.101:816/api/TamannaahBS';
$url = $base . '/' . $path;

$headers = [];
$token = null;
foreach (getallheaders() as $k => $v) {
    if (strtolower($k) === 'authorizationtoken') {
        $token = $v;
        break;
    }
}
if ($token !== null) {
    $headers[] = 'AuthorizationToken: ' . $token;
}
$headers[] = 'Content-Type: application/json';

$opts = [
    'http' => [
        'method' => 'GET',
        'header' => implode("\r\n", $headers),
        'timeout' => 30,
        'ignore_errors' => true
    ]
];
$ctx = stream_context_create($opts);
$response = @file_get_contents($url, false, $ctx);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'Gati API unreachable']);
    exit;
}

$code = 200;
if (isset($http_response_header[0]) && preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $m)) {
    $code = (int) $m[1];
}
http_response_code($code);
header('Content-Type: application/json');
echo $response;
