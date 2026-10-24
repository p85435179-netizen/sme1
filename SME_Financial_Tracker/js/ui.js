let toastTimer;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').style.display = 'block';
  toastTimer = setTimeout(() => {
    $('#toast').style.display = 'none';
  }, 5000);
}

function heading(title, subtitle, actions = '') {
  return `<div class="eyebrow">${esc(new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</div>
    <div class="heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions">${actions}</div></div>`;
}

function stat(title, value, detail, symbol = '◇') {
  return `<article class="card stat"><div class="stathead">${esc(title)}<span class="badgeicon">${symbol}</span></div><div class="value">${esc(value)}</div><div class="trend">${esc(detail)}</div></article>`;
}

function input(label, name, type = 'text', value = '', required = true) {
  const usernameRules =
    name === 'username' ? 'minlength="3" pattern="[a-zA-Z0-9._@+\\-]{3,160}"' : '';
  const limits =
    type === 'number'
      ? 'min="0.01" max="999999999" step="0.01"'
      : type === 'password'
        ? 'minlength="10" maxlength="200" autocomplete="new-password"'
        : type === 'text'
          ? 'maxlength="160"'
          : '';
  return `<label for="field-${name}">${esc(label)}</label><input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} ${limits} ${usernameRules}>`;
}

function selectField(label, name, options, selected = '') {
  return `<label for="field-${name}">${esc(label)}</label><select id="field-${name}" name="${name}" required>${options.map(([value, text]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
}

function closeModal() {
  $('#modal').close();
}

function openModal(title, fields, submit, label = 'Save') {
  $('#modalTitle').textContent = title;
  $('#fields').innerHTML = fields;
  $('#form-error').textContent = '';
  const button = $('#form button[type=submit]');
  button.textContent = label;
  button.disabled = false;
  $('#form').onsubmit = async (event) => {
    event.preventDefault();
    if (button.disabled || !event.target.reportValidity()) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    $('#form-error').textContent = '';
    try {
      const data = new FormData(event.target);
      for (const field of event.target.querySelectorAll(
        'input[type=text][required],textarea[required]',
      )) {
        if (!field.value.trim()) throw new Error('Complete all required text fields.');
      }
      await submit(data);
    } catch (error) {
      $('#form-error').textContent = error.message;
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  };
  $('#modal').showModal();
}

function download(name, rows) {
  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            String(value ?? '')
              .replace(/^[\s]*[=+@-]/, "'$&")
              .replace(/"/g, '""') +
            '"',
        )
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV exported');
}

function showHelp() {
  if (role === 'Super Admin') {
    openModal('Super Admin guide', '<p>Open Registrations to review business owner applications. Approve an application to enable sign-in, or reject it to deny access.</p>', async () => closeModal(), 'Done');
    return;
  }
  openModal(
    'Workspace guide',
    '<p>Business Owners are administrators for their own business. They manage users, approve team registrations, set opening cash, and can permanently delete records.</p><p>Finance Staff record income and expenses, edit transactions, and manage invoices and payments. They cannot manage users or permanently delete records.</p><p>Managers can view dashboards, transaction history, financial summaries and reports. They cannot change financial records or business settings.</p><p>Cash balance is opening cash plus recorded receipts minus recorded spending. Unpaid invoices do not count as receipts. This is basic financial tracking, not a tax-filing or full accounting system.</p>',
    async () => closeModal(),
    'Done',
  );
}

function showNotifications() {
  if (role === 'Super Admin') {
    openModal('Registration updates', '<p>' + users.filter((account) => account.approval_status === 'Pending').length + ' business owner registration(s) awaiting review.</p>', async () => closeModal(), 'Done');
    return;
  }
  if (role === 'Manager') {
    const summary = totals(
      transactions.filter((record) => record.date.startsWith(today().slice(0, 7))),
    );
    openModal(
      'Business performance',
      '<p>Current month income: ' +
        money(summary.income) +
        '</p><p>Expenses: ' +
        money(summary.expense) +
        '</p><p>Net profit: ' +
        money(summary.income - summary.expense) +
        '</p>',
      async () => closeModal(),
      'Done',
    );
    return;
  }
  const pendingUsers = users.filter((user) => user.approval_status === 'Pending').length;
  const overdue = invoices.filter(
    (invoice) => !['Paid', 'Cancelled'].includes(invoice.status) && invoice.due_date < today(),
  ).length;
  const teamMessage =
    role === 'Business Owner' ? '<p>' + pendingUsers + ' pending team registration(s).</p>' : '';
  openModal(
    'Workspace updates',
    teamMessage + '<p>' + overdue + ' overdue invoice(s).</p>',
    async () => closeModal(),
    'Done',
  );
}
