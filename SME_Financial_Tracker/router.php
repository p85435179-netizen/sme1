<?php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('~(?:^|/)(?:data|database|config|exports|tests|\.[^/]*)(?:/|$)~i', $path)) {
    http_response_code(403);
    exit('Forbidden');
}
if (basename($path) === 'workspace.php' || preg_match('~/(store_owner|staff|supplier)/[^/]+\.html$~', $path)) {
    $target = preg_replace('~/(store_owner|staff|supplier)/[^/]+\.html$~', '/workspace.html', $path);
    $target = preg_replace('~/workspace\.php$~', '/workspace.html', $target);
    header('Location: ' . $target, true, 302);
    exit();
}
return false;
