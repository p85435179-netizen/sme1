<?php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('~(?:^|/)(?:data|database|config|exports|tests|\.[^/]*)(?:/|$)~i', $path)) {
    http_response_code(403);
    exit('Forbidden');
}
if (preg_match('~/(store_owner|staff|supplier)/[^/]+\.(?:html|php)$~', $path)) {
    header('Location: ' . preg_replace('~/(store_owner|staff|supplier)/[^/]+\.(?:html|php)$~', '/workspace.php', $path), true, 302);
    exit();
}
if (str_ends_with($path, '.html')) {
    header('Location: ' . substr($path, 0, -5) . '.php', true, 302);
    exit();
}
return false;
