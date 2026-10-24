let invoiceQuery = '';
let invoiceStatus = 'All';
function invoiceRows() {
  const records = invoices.filter(
    (invoice) =>
      (invoiceStatus === 'All' || invoice.status === invoiceStatus) &&
      `${invoice.invoice_number} ${invoice.customer}`
        .toLowerCase()
        .includes(invoiceQuery.toLowerCase()),
  );
  return `<div class="tablewrap"><table><thead><tr><th>INVOICE</th><th>DATES</th><th>TOTAL</th><th>RECEIVED</th><th>BALANCE / STATUS</th><th>ACTIONS</th></tr></thead><tbody>${records.map((invoice) => `<tr><td><strong>${esc(invoice.invoice_number)}</strong><small>${esc(invoice.customer)}</small></td><td>${esc(invoice.date)}<small>Due ${esc(invoice.due_date)}</small></td><td>${money(invoice.amount)}</td><td>${money(invoice.paid_amount)}</td><td>${money(invoice.amount - invoice.paid_amount)}<small><span class="pill ${invoice.status === 'Paid' ? '' : invoice.status === 'Cancelled' ? 'rejected' : 'pending'}">${esc(invoice.status)}</span></small></td><td class="row-actions"><button onclick="editInvoice(${invoice.id})">${invoice.status === 'Cancelled' ? 'Edit / Reopen' : 'Edit'}</button>${invoice.status === 'Cancelled' ? '' : `<button onclick="invoicePayment(${invoice.id})">Update payment</button>${invoice.paid_amount === 0 ? `<button onclick="cancelInvoice(${invoice.id})">Cancel</button>` : ''}`}<button onclick="invoiceHistory(${invoice.id})">History</button>${role === 'Business Owner' ? `<button class="danger-text" onclick="deleteInvoice(${invoice.id})">Delete</button>` : ''}</td></tr>`).join('')}</tbody></table></div>${records.length ? '' : '<div class="empty">No invoices found.</div>'}`;
}
function updateInvoices() {
  $('#invoice-results').innerHTML = invoiceRows();
}
function invoicesPage() {
  return (
    heading(
      'Invoice Management',
      'Manage customer invoices and record payments. Only payments received affect income and cash.',
      '<button class="primary" onclick="editInvoice()">＋ Create invoice</button>',
    ) +
    `<section class="card panel"><div class="filters"><input aria-label="Search invoices" placeholder="Search invoice number or customer" value="${esc(invoiceQuery)}" oninput="invoiceQuery=this.value;updateInvoices()"><select aria-label="Invoice status" onchange="invoiceStatus=this.value;updateInvoices()">${['All', 'Unpaid', 'Partially paid', 'Paid', 'Cancelled'].map((status) => `<option ${status === invoiceStatus ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div id="invoice-results">${invoiceRows()}</div></section>`
  );
}
function editInvoice(id) {
  const invoice = id ? invoices.find((item) => item.id === id) : null;
  openModal(
    invoice ? 'Edit invoice' : 'Create invoice',
    input('Invoice number', 'invoice_number', 'text', invoice?.invoice_number || '').replace(
      'maxlength="160"',
      'maxlength="100"',
    ) +
      input('Customer', 'customer', 'text', invoice?.customer || '') +
      input('Invoice date', 'date', 'date', invoice?.date || today()).replace(
        'type="date"',
        `type="date" max="${today()}"`,
      ) +
      input('Due date', 'due_date', 'date', invoice?.due_date || today()) +
      input('Invoice total (PHP)', 'amount', 'number', invoice?.amount || '') +
      `<label for="invoice-notes">Notes (optional)</label><textarea id="invoice-notes" name="notes" maxlength="1000">${esc(invoice?.notes || '')}</textarea>`,
    async (data) => {
      const values = Object.fromEntries(data);
      if (values.due_date < values.date)
        throw new Error('Due date cannot be before the invoice date.');
      if (invoice) Object.assign(values, { id: invoice.id, version: invoice.version });
      await saveAndRefresh(
        invoice ? 'invoice_update' : 'invoice_create',
        values,
        invoice ? 'Invoice updated' : 'Invoice created',
      );
    },
  );
}
function invoicePayment(id) {
  const invoice = invoices.find((item) => item.id === id);
  openModal(
    'Update invoice payment',
    `<p>${esc(invoice.invoice_number)} · total ${money(invoice.amount)} · received ${money(invoice.paid_amount)}</p>` +
      selectField(
        'Payment status',
        'payment_status',
        [
          ['Unpaid', 'Unpaid'],
          ['Partially paid', 'Partially paid'],
          ['Paid', 'Paid'],
        ],
        invoice.status,
      ) +
      input(
        'Total amount received so far (PHP)',
        'paid_amount',
        'number',
        invoice.paid_amount,
      ).replace('min="0.01"', 'min="0"') +
      input('Payment / correction date', 'date', 'date', today()).replace(
        'type="date"',
        `type="date" min="${invoice.date}" max="${today()}"`,
      ) +
      `<p class="section-note">Enter the cumulative total received, not just the latest payment. An increase adds income; a reduction creates a refund/reversal expense. Repeating the same total adds no duplicate transaction.</p>`,
    async (data) => {
      const paid = Number(data.get('paid_amount')),
        status = data.get('payment_status');
      if (paid > invoice.amount) throw new Error('Payment cannot exceed the invoice total.');
      if (status === 'Partially paid' && (paid <= 0 || paid >= invoice.amount))
        throw new Error('A partial payment must be greater than zero and less than the total.');
      await saveAndRefresh(
        'invoice_payment',
        { id, version: invoice.version, paid_amount: paid, date: data.get('date') },
        'Payment status and cash updated',
      );
    },
  );
  const sync = () => {
    const status = $('#field-payment_status').value;
    const amount = $('#field-paid_amount');
    amount.readOnly = status !== 'Partially paid';
    if (status === 'Paid') amount.value = invoice.amount;
    else if (status === 'Unpaid') amount.value = 0;
  };
  $('#field-payment_status').addEventListener('change', sync);
  sync();
}
function cancelInvoice(id) {
  const invoice = invoices.find((item) => item.id === id);
  openModal(
    'Cancel unpaid invoice?',
    `<p>Cancel ${esc(invoice.invoice_number)}? It stays in invoice history and can be reopened by editing.</p>`,
    async () =>
      saveAndRefresh('invoice_cancel', { id, version: invoice.version }, 'Invoice cancelled'),
    'Cancel invoice',
  );
}
function deleteInvoice(id) {
  const invoice = invoices.find((item) => item.id === id);
  openModal(
    'Delete invoice permanently?',
    `<p>Delete ${esc(invoice.invoice_number)} and its linked receipt/reversal transactions? Recorded receipts total ${money(invoice.paid_amount)}. Reports and the cash balance will be recalculated. Activity history is retained.</p>`,
    async () =>
      saveAndRefresh(
        'invoice_delete',
        { id, version: invoice.version, confirm: true },
        'Invoice and linked receipts deleted',
      ),
    'Delete invoice',
  );
}
function invoiceHistory(id) {
  const invoice = invoices.find((item) => item.id === id);
  const history = payments.filter((payment) => Number(payment.invoice_id) === id);
  openModal(
    'Invoice payment history',
    `<p>${esc(invoice.invoice_number)} · ${esc(invoice.customer)}</p><div class="tablewrap"><table><thead><tr><th>DATE</th><th>CHANGE</th><th>RECORDED BY</th></tr></thead><tbody>${history.map((payment) => `<tr><td>${esc(payment.date)}</td><td>${money(payment.amount)}</td><td>${esc(payment.recorded_by)}</td></tr>`).join('')}</tbody></table></div>${history.length ? '' : '<p class="section-note">No payments recorded.</p>'}`,
    async () => closeModal(),
    'Done',
  );
}
