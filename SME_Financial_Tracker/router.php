<?php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('~(?:^|/)(?:data|database|config|exports|tests|\.[^/]*)(?:/|$)~i', $path)) {
    http_response_code(403);
    exit('Forbidden');
}
return false;
