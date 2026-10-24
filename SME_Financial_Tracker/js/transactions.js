function filteredTransactions() {
  const fixedType = page === 'Income' ? 'Income' : page === 'Expenses' ? 'Expense' : null;
  return transactions
    .filter(
      (record) =>
        (!fixedType || record.type === fixedType) &&
        (transactionType === 'All' || fixedType || record.type === transactionType) &&
        (transactionStatus === 'All' || record.status === transactionStatus) &&
        `${record.name} ${record.source || ''} ${record.category} ${record.created_by}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    .sort((left, right) => {
      if (transactionSort === 'amount-high') return right.amount - left.amount;
      if (transactionSort === 'amount-low') return left.amount - right.amount;
      const difference = left.date.localeCompare(right.date) || left.id - right.id;
      return transactionSort === 'oldest' ? difference : -difference;
    });
}

function recordRows(records, showActions = true) {
  const writable = showActions && role !== 'Manager';
  return `<div class="tablewrap"><table><thead><tr><th>TRANSACTION</th><th>DATE</th><th>CATEGORY / SOURCE</th><th>AMOUNT</th><th>STATUS</th>${writable ? '<th>ACTIONS</th>' : ''}</tr></thead><tbody>${records.map((record) => `<tr><td><strong>${esc(record.name)}</strong><small>TX-${String(record.id).padStart(5, '0')} · ${esc(record.type)} · ${esc(record.created_by)}</small></td><td>${esc(record.date)}</td><td>${esc(record.category)}${record.source ? `<small>${esc(record.source)}</small>` : ''}</td><td class="money ${record.type.toLowerCase()}">${record.type === 'Income' ? '+' : '−'}${money(record.amount)}</td><td><span class="pill ${record.status === 'Pending' ? 'pending' : record.status === 'Rejected' ? 'rejected' : ''}">${record.status === 'Approved' ? 'Recorded' : esc(record.status)}</span></td>${writable ? `<td class="row-actions">${record.invoice_id ? '<span class="pill">Invoice receipt</span>' : `<button onclick="editTransaction(${record.id})">Edit</button>${role === 'Business Owner' ? `${record.status !== 'Approved' ? `<button onclick="postLegacyRecord(${record.id})">Post</button>` : ''}<button class="danger-text" onclick="deleteTransaction(${record.id})">Delete</button>` : ''}`}</td>` : ''}</tr>`).join('')}</tbody></table></div>${records.length ? '' : '<div class="empty">No transactions found.</div>'}`;
}

function pagedRecords() {
  const records = filteredTransactions();
  const totalPages = Math.max(1, Math.ceil(records.length / 10));
  pageNumber = Math.max(1, Math.min(pageNumber, totalPages));
  return (
    recordRows(records.slice((pageNumber - 1) * 10, pageNumber * 10)) +
    `<div class="pagination"><span>${records.length} record(s) · Page ${pageNumber} of ${totalPages}</span><div><button ${pageNumber === 1 ? 'disabled' : ''} onclick="changePage(-1)">Previous</button><button ${pageNumber === totalPages ? 'disabled' : ''} onclick="changePage(1)">Next</button></div></div>`
  );
}
function updateRecords() {
  pageNumber = 1;
  $('#record-results').innerHTML = pagedRecords();
}
function changePage(direction) {
  pageNumber += direction;
  $('#record-results').innerHTML = pagedRecords();
}

function transactionsPage() {
  const fixed = page === 'Income' || page === 'Expenses';
  const title =
    page === 'Income'
      ? 'Income Management'
      : page === 'Expenses'
        ? 'Expense Management'
        : 'Transaction History';
  return (
    heading(
      title,
      'Record business activity and keep your finances up to date.',
      `<button onclick="exportData()">⇩ Export CSV</button>${role !== 'Manager' ? '<button class="primary" onclick="editTransaction()">＋ Add record</button>' : ''}`,
    ) +
    `<section class="card panel"><div class="filters"><input aria-label="Search transactions" placeholder="Search description, source, or category" value="${esc(searchQuery)}" oninput="searchQuery=this.value;updateRecords()">${fixed ? '' : `<select aria-label="Transaction type" onchange="transactionType=this.value;updateRecords()">${['All', 'Income', 'Expense'].map((value) => `<option ${transactionType === value ? 'selected' : ''}>${value}</option>`).join('')}</select>`}<select aria-label="Record status" onchange="transactionStatus=this.value;updateRecords()">${[
      ['All', 'All statuses'],
      ['Approved', 'Recorded'],
      ['Pending', 'Legacy pending'],
      ['Rejected', 'Legacy rejected'],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${transactionStatus === value ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select><select aria-label="Sort transactions" onchange="transactionSort=this.value;updateRecords()">${[
      ['newest', 'Newest first'],
      ['oldest', 'Oldest first'],
      ['amount-high', 'Highest amount'],
      ['amount-low', 'Lowest amount'],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${transactionSort === value ? 'selected' : ''}>${label}</option>`,
      )
      .join('')}</select></div><div id="record-results">${pagedRecords()}</div></section>`
  );
}

function updateTransactionForm() {
  const income = $('#field-type').value === 'Income';
  const select = $('#field-category');
  const selected = select.value;
  const list = income
    ? ['Sales', 'Services', 'Other income']
    : categories.filter((value) => !['Sales', 'Services', 'Other income'].includes(value));
  select.innerHTML = list
    .map((value) => `<option ${selected === value ? 'selected' : ''}>${value}</option>`)
    .join('');
  $('#field-source').required = income;
  $('#source-label').textContent = income
    ? 'Source (customer, sales channel, or service)'
    : 'Payee / source (optional)';
}

function editTransaction(id) {
  const record = id ? transactions.find((item) => item.id === id) : null;
  const type = record?.type || (page === 'Expenses' ? 'Expense' : 'Income');
  openModal(
    record ? 'Edit transaction' : 'Record transaction',
    selectField(
      'Type',
      'type',
      [
        ['Income', 'Income'],
        ['Expense', 'Expense'],
      ],
      type,
    ) +
      input('Description', 'name', 'text', record?.name || '') +
      input('Source', 'source', 'text', record?.source || '').replace(
        'for="field-source"',
        'id="source-label" for="field-source"',
      ) +
      input('Amount (PHP)', 'amount', 'number', record?.amount || '') +
      input('Date', 'date', 'date', record?.date || today()).replace(
        'type="date"',
        `type="date" max="${today()}"`,
      ) +
      selectField(
        'Category',
        'category',
        categories.map((value) => [value, value]),
        record?.category || (type === 'Income' ? 'Sales' : 'Rent'),
      ),
    async (data) => {
      const values = Object.fromEntries(data);
      if (record) Object.assign(values, { id: record.id, version: record.version });
      await saveAndRefresh(
        record ? 'transaction_update' : 'transaction_create',
        values,
        record ? 'Transaction updated' : 'Transaction recorded',
      );
    },
  );
  $('#field-type').addEventListener('change', updateTransactionForm);
  updateTransactionForm();
}
function deleteTransaction(id) {
  const record = transactions.find((item) => item.id === id);
  openModal(
    'Delete transaction?',
    `<p>Permanently delete <strong>${esc(record.name)}</strong> for ${money(record.amount)}? Reports and the cash balance will be recalculated. An activity entry is retained.</p>`,
    async () =>
      saveAndRefresh(
        'transaction_delete',
        { id, version: record.version, confirm: true },
        'Transaction deleted',
      ),
    'Delete record',
  );
}
function postLegacyRecord(id) {
  const record = transactions.find((item) => item.id === id);
  openModal(
    'Post legacy record?',
    `<p>Include ${esc(record.name)} in financial totals and cash balance?</p>`,
    async () =>
      saveAndRefresh('transaction_post', { id, version: record.version }, 'Legacy record posted'),
    'Post record',
  );
}
function exportData() {
  download('transactions.csv', [
    ['ID', 'Date', 'Type', 'Description', 'Source', 'Category', 'Amount', 'Status', 'Recorded by'],
    ...filteredTransactions().map((record) => [
      record.id,
      record.date,
      record.type,
      record.name,
      record.source,
      record.category,
      record.amount,
      record.status === 'Approved' ? 'Recorded' : record.status,
      record.created_by,
    ]),
  ]);
}
