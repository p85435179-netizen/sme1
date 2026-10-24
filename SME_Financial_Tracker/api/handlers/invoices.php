<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}
if (
    !in_array(
        $action,
        ['invoice_create', 'invoice_update', 'invoice_payment', 'invoice_cancel', 'invoice_delete'],
        true,
    )
) {
    return;
}
requireRole('Business Owner', 'Finance Staff');
$id = isset($input['id']) ? validateId($input['id']) : null;
$database->beginTransaction();
$invoice = $id ? invoiceRecord($id) : null;
if ($action !== 'invoice_create' && !$invoice) {
    respondError('Select an invoice.');
}
if (in_array($action, ['invoice_create', 'invoice_update'], true)) {
    $number = validateText($input['invoice_number'] ?? null, 100);
    $customer = validateText($input['customer'] ?? null);
    $date = validateDate($input['date'] ?? null);
    $due = validateDate($input['due_date'] ?? null);
    $amount = validateAmount($input['amount'] ?? null);
    $notes = $input['notes'] ?? '';
    if (!is_string($notes) || mb_strlen($notes) > 1000) {
        respondError('Notes must be at most 1,000 characters.');
    }
    if ($due < $date || $date > date('Y-m-d')) {
        respondError('Invoice date must be on or before today; due date cannot precede it.');
    }
    if ($action === 'invoice_create') {
        queryDatabase(
            'INSERT INTO billing_invoices (workspace_id,created_by,invoice_number,customer,date,due_date,amount,notes) VALUES (?,?,?,?,?,?,?,?)',
            [$workspaceId, $userId, $number, $customer, $date, $due, $amount, trim($notes)],
        );
        $id = (int) $database->lastInsertId();
    } else {
        if ($amount < (float) $invoice['paid_amount']) {
            respondError('Invoice amount cannot be less than payments already received.');
        }
        $firstPayment = queryDatabase('SELECT MIN(date) FROM invoice_payments WHERE invoice_id=?', [
            $id,
        ])->fetchColumn();
        if ($firstPayment && $date > $firstPayment) {
            respondError('Invoice date cannot be after an existing payment.');
        }
        $paid = (float) $invoice['paid_amount'];
        $status = $paid == 0 ? 'Unpaid' : ($paid == $amount ? 'Paid' : 'Partially paid');
        $statement = queryDatabase(
            'UPDATE billing_invoices SET invoice_number=?,customer=?,date=?,due_date=?,amount=?,notes=?,status=?,version=version+1 WHERE id=? AND version=?',
            [
                $number,
                $customer,
                $date,
                $due,
                $amount,
                trim($notes),
                $status,
                $id,
                validateId($input['version'] ?? null),
            ],
        );
        if (!$statement->rowCount()) {
            respondError('Invoice changed. Refresh before editing.', 409);
        }
    }
    audit(
        $action === 'invoice_create' ? 'Invoice created' : 'Invoice updated',
        $number . ' · ' . $customer,
    );
} elseif ($action === 'invoice_payment') {
    if ($invoice['status'] === 'Cancelled') {
        respondError('Reopen the invoice before recording payment.');
    }
    $paid = validateNonnegativeAmount($input['paid_amount'] ?? null);
    if ($paid > (float) $invoice['amount']) {
        respondError('Payments cannot exceed the invoice total.');
    }
    $date = validateDate($input['date'] ?? null);
    if ($date < $invoice['date'] || $date > date('Y-m-d')) {
        respondError('Payment date must be between the invoice date and today.');
    }
    $difference = round($paid - (float) $invoice['paid_amount'], 2);
    $status =
        $paid == 0 ? 'Unpaid' : ($paid == (float) $invoice['amount'] ? 'Paid' : 'Partially paid');
    $statement = queryDatabase(
        'UPDATE billing_invoices SET paid_amount=?,status=?,version=version+1 WHERE id=? AND version=?',
        [$paid, $status, $id, validateId($input['version'] ?? null)],
    );
    if (!$statement->rowCount()) {
        respondError('Invoice changed. Refresh before updating payment.', 409);
    }
    if ($difference != 0) {
        $type = $difference > 0 ? 'Income' : 'Expense';
        $description =
            ($difference > 0 ? 'Invoice payment: ' : 'Invoice payment reversal: ') .
            $invoice['invoice_number'];
        queryDatabase(
            "INSERT INTO transactions (date,name,category,type,amount,source,status,user_id,workspace_id) VALUES (?,?,?,?,?,?,'Approved',?,?)",
            [
                $date,
                $description,
                $difference > 0 ? 'Sales' : 'Refunds',
                $type,
                abs($difference),
                $invoice['customer'],
                $userId,
                $workspaceId,
            ],
        );
        $transactionId = (int) $database->lastInsertId();
        queryDatabase(
            'INSERT INTO invoice_payments (invoice_id,transaction_id,amount,date,user_id) VALUES (?,?,?,?,?)',
            [$id, $transactionId, $difference, $date, $userId],
        );
    }
    audit(
        'Invoice payment updated',
        $invoice['invoice_number'] .
            ' · total received PHP ' .
            $paid .
            ' · change PHP ' .
            $difference,
    );
} elseif ($action === 'invoice_cancel') {
    if ((float) $invoice['paid_amount'] != 0) {
        respondError('Reverse all payments before cancelling this invoice.');
    }
    $statement = queryDatabase(
        "UPDATE billing_invoices SET status='Cancelled',version=version+1 WHERE id=? AND version=?",
        [$id, validateId($input['version'] ?? null)],
    );
    if (!$statement->rowCount()) {
        respondError('Invoice changed. Refresh before cancelling.', 409);
    }
    audit('Invoice cancelled', $invoice['invoice_number']);
} else {
    requireRole('Business Owner');
    if (($input['confirm'] ?? false) !== true) {
        respondError('Confirm invoice deletion first.');
    }
    $statement = queryDatabase(
        'UPDATE billing_invoices SET version=version+1 WHERE id=? AND version=?',
        [$id, validateId($input['version'] ?? null)],
    );
    if (!$statement->rowCount()) {
        respondError('Invoice changed. Refresh before deleting.', 409);
    }
    $payments = queryDatabase('SELECT transaction_id FROM invoice_payments WHERE invoice_id=?', [
        $id,
    ])->fetchAll();
    queryDatabase('DELETE FROM invoice_payments WHERE invoice_id=?', [$id]);
    foreach ($payments as $payment) {
        queryDatabase('DELETE FROM transactions WHERE id=? AND workspace_id=?', [
            $payment['transaction_id'],
            $workspaceId,
        ]);
    }
    queryDatabase('DELETE FROM billing_invoices WHERE id=?', [$id]);
    audit(
        'Invoice deleted',
        $invoice['invoice_number'] . ' · removed linked receipts of PHP ' . $invoice['paid_amount'],
    );
}
$database->commit();
respondJson(['ok' => true, 'id' => $id]);
