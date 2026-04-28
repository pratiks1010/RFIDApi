<?php
/**
 * Proxy for Feronia API (TamannaahBS endpoints hosted on Feronia server).
 * Forwards /api/Feronia/* to http://192.168.29.245:93/api/TamannaahBS/*
 */
$path = isset($_GET['path']) ? trim($_GET['path']) : '';
if ($path === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'Missing path']);
    exit;
}

$base = 'http://192.168.29.245:93/api/TamannaahBS';
$url = $base . '/' . ltrim($path, '/');

$headers = [];
$authToken = null;
foreach (getallheaders() as $k => $v) {
    if (strtolower($k) === 'authorizationtoken') {
        $authToken = $v;
        break;
    }
}
if ($authToken !== null) {
    $headers[] = 'AuthorizationToken: ' . $authToken;
}
$headers[] = 'Content-Type: application/json';
$headers[] = 'Accept: application/json';
$headers[] = 'User-Agent: FeroniaProxy/1.0';

if (!function_exists('curl_init')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => false, 'message' => 'cURL extension is not enabled on server']);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HEADER => false,
]);

$response = curl_exec($ch);
$curlErrNo = curl_errno($ch);
$curlErr = curl_error($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => false,
        'message' => 'Feronia API unreachable',
        'error' => $curlErr ?: 'unknown transport error',
        'errno' => $curlErrNo
    ]);
    exit;
}

if ($code <= 0) $code = 200;
http_response_code($code);
header('Content-Type: application/json');
echo $response;
