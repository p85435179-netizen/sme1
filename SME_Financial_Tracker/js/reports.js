function reportRecords() {
  return transactions.filter(
    (record) =>
      record.status === 'Approved' &&
      (!reportFrom || record.date >= reportFrom) &&
      (!reportTo || record.date <= reportTo),
  );
}
function reportDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function setReportPeriod(value, draw = true) {
  reportPeriod = value;
  const current = new Date(today() + 'T12:00:00');
  const start = new Date(current);
  const end = new Date(current);
  if (value === 'Daily') {
  } else if (value === 'Weekly') {
    start.setDate(current.getDate() - ((current.getDay() + 6) % 7));
    end.setDate(start.getDate() + 6);
  } else if (value === 'Monthly') {
    start.setDate(1);
    end.setMonth(current.getMonth() + 1, 0);
  } else if (value === 'Annual') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  } else {
    reportFrom = '';
    reportTo = '';
    if (draw) render();
    return;
  }
  reportFrom = reportDateKey(start);
  reportTo = reportDateKey(end);
  if (draw) render();
}
function applyReportDates() {
  const from = $('#report-from').value,
    to = $('#report-to').value;
  if (from && to && from > to) {
    toast('Start date must be before end date.');
    return;
  }
  reportFrom = from;
  reportTo = to;
  reportPeriod = 'Custom';
  render();
}
function reportsPage() {
  if (!reportFrom && !reportTo && reportPeriod === 'Monthly') setReportPeriod('Monthly', false);
  const records = reportRecords(),
    summary = totals(records);
  const headingText = page === 'Financial Summary' ? 'Financial Summary' : 'Financial Reports';
  return (
    heading(
      headingText,
      'Recorded income − recorded expenses = net profit. Unpaid invoices are excluded.',
      '<button onclick="exportReport()">⇩ Export report</button>',
    ) +
    `<section class="card panel filters"><label>Report period<select aria-label="Report period" onchange="setReportPeriod(this.value)">${['Daily', 'Weekly', 'Monthly', 'Annual', 'All dates', 'Custom'].map((value) => `<option ${reportPeriod === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label>From<input id="report-from" type="date" value="${reportFrom}"></label><label>To<input id="report-to" type="date" value="${reportTo}"></label><button onclick="applyReportDates()">Apply dates</button></section><div class="stats">${stat('Total Income', money(summary.income), 'Selected reporting period', '↗')}${stat('Total Expenses', money(summary.expense), 'Selected reporting period', '↘')}${stat('Net Profit', money(summary.income - summary.expense), 'Income − expenses', '₱')}${stat('Cash Balance', money(cashBalance()), 'Available now · all recorded dates', '▣')}</div><section class="card panel"><h2>Category summary</h2><p>${records.length} recorded transaction(s) in this report.</p><div class="tablewrap"><table><thead><tr><th>CATEGORY</th><th>INCOME</th><th>EXPENSES</th><th>NET</th></tr></thead><tbody>${[
      ...new Set(records.map((record) => record.category)),
    ]
      .sort()
      .map((category) => {
        const values = totals(records.filter((record) => record.category === category));
        return `<tr><td>${esc(category)}</td><td>${money(values.income)}</td><td>${money(values.expense)}</td><td>${money(values.income - values.expense)}</td></tr>`;
      })
      .join(
        '',
      )}</tbody></table></div>${records.length ? '' : '<div class="empty">No recorded transactions in this period.</div>'}</section><section class="card panel tablepanel"><h2>Report transactions</h2>${recordRows(records)}</section>`
  );
}
function financialSummaryPage() {
  return reportsPage();
}
function exportReport() {
  const records = reportRecords(),
    summary = totals(records);
  download('financial-' + reportPeriod.toLowerCase().replaceAll(' ', '-') + '-report.csv', [
    ['Business', currentUser.business],
    ['Period', reportFrom || 'All dates', reportTo || 'Present'],
    ['Total income', summary.income],
    ['Total expenses', summary.expense],
    ['Net profit', summary.income - summary.expense],
    ['Opening cash balance', Number(currentUser.opening_balance || 0)],
    ['Current cash balance', cashBalance()],
    [],
    ['ID', 'Date', 'Source', 'Description', 'Category', 'Type', 'Amount'],
    ...records.map((record) => [
      record.id,
      record.date,
      record.source,
      record.name,
      record.category,
      record.type,
      record.amount,
    ]),
  ]);
}
