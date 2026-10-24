<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

function respondError(string $message, int $code = 400): never
{
    global $database;
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}
function respondJson($value): never
{
    echo json_encode($value);
    exit();
}
function validateText($value, int $max = 160): string
{
    if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value)) > $max) {
        respondError('Enter a valid text value (maximum ' . $max . ' characters).');
    }
    return trim($value);
}
function validateAmount($value): float
{
    if (
        !is_numeric($value) ||
        !is_finite((float) $value) ||
        $value < 0.01 ||
        $value > 999999999 ||
        abs((float) $value - round((float) $value, 2)) > 0.000001
    ) {
        respondError('Amount must be between 0.01 and 999,999,999.');
    }
    return round((float) $value, 2);
}
function validateDate($value): string
{
    if (!is_string($value)) {
        respondError('Invalid date.');
    }
    $parsedDate = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$parsedDate || $parsedDate->format('Y-m-d') !== $value) {
        respondError('Invalid date.');
    }
    return $value;
}
function validateChoice($value, array $allowed): string
{
    if (!in_array($value, $allowed, true)) {
        respondError('Invalid selection.');
    }
    return $value;
}

function queryDatabase(string $query, array $args = []): PDOStatement
{
    global $database;
    $statement = $database->prepare($query);
    $statement->execute($args);
    return $statement;
}

function requireOwner(): void
{
    global $isOwner;
    if (!$isOwner) {
        respondError('Owner access required.', 403);
    }
}

function validateUsername($value): string
{
    $username = validateText($value);
    if (!preg_match('/^[a-zA-Z0-9._@+\-]{3,160}$/', $username)) {
        respondError(
            'Username must be 3–160 characters using letters, numbers, dots, underscores, @, + or hyphens.',
        );
    }
    return strtolower($username);
}

function validatePassword($value): string
{
    if (!is_string($value) || strlen($value) < 10 || strlen($value) > 200) {
        respondError('Use a password of 10–200 characters.');
    }
    return $value;
}
