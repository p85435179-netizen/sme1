<?php

return [
    'driver' => getenv('DB_DRIVER') ?: 'mysql',
    'sqlite_path' => getenv('LEDGERLY_DB_PATH') ?: __DIR__ . '/../data/ledgerly.sqlite',
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_NAME') ?: 'sme',
    'username' => getenv('DB_USER') ?: 'root',
    'password' => getenv('DB_PASSWORD') ?: '',
];


