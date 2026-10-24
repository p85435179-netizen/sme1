function totals(records = transactions) {
  return records
    .filter((record) => record.status === 'Approved')
    .reduce(
      (total, record) => {
        total[record.type === 'Income' ? 'income' : 'expense'] += Number(record.amount);
        return total;
      },
      { income: 0, expense: 0 },
    );
}

function cashBalance() {
  const summary = totals(transactions.filter((record) => record.date <= today()));
  return Number(currentUser.opening_balance || 0) + summary.income - summary.expense;
}

function monthlyData() {
  const [year, month] = dashboardMonth.split('-').map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const summary = totals(transactions.filter((record) => record.date.startsWith(key)));
    return {
      label: date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
      ...summary,
      profit: summary.income - summary.expense,
    };
  });
}

function monthlyChart() {
  const months = monthlyData();
  const maximum = Math.max(1, ...months.flatMap((month) => [month.income, month.expense]));
  return `<section class="card panel"><h2>Income vs expenses</h2><p>Six months ending ${esc(dashboardMonth)}</p><div class="legend section-note"><span><i class="dot"></i>Income</span><span><i class="dot" style="background:#879aa6"></i>Expenses</span></div><div class="cash-chart" role="img" aria-label="Monthly income and expense chart; detailed values below">${months.map((month) => `<div class="cash-month"><div class="cash-bars"><i style="height:${(month.income / maximum) * 100}%" title="Income ${money(month.income)}"></i><i style="height:${(month.expense / maximum) * 100}%;background:#879aa6" title="Expenses ${money(month.expense)}"></i></div><span>${month.label}</span></div>`).join('')}</div><details><summary>View monthly values</summary><div class="tablewrap"><table><thead><tr><th>MONTH</th><th>INCOME</th><th>EXPENSES</th><th>PROFIT</th></tr></thead><tbody>${months.map((month) => `<tr><td>${month.label}</td><td>${money(month.income)}</td><td>${money(month.expense)}</td><td>${money(month.profit)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}

function profitTrend() {
  const months = monthlyData();
  const min = Math.min(0, ...months.map((month) => month.profit));
  const max = Math.max(1, ...months.map((month) => month.profit));
  const y = (value) => 165 - ((value - min) / (max - min)) * 140;
  const points = months.map((month, index) => `${30 + index * 100},${y(month.profit)}`).join(' ');
  return `<section class="card panel"><h2>Profit trend</h2><p>Monthly income minus expenses</p><svg class="profit-chart" viewBox="0 0 560 205" role="img" aria-label="Six-month profit trend"><line x1="25" x2="540" y1="${y(0)}" y2="${y(0)}" stroke="#d8e2df" stroke-dasharray="4 4"/><polyline points="${points}" fill="none" stroke="#29977b" stroke-width="3"/>${months.map((month, index) => `<circle cx="${30 + index * 100}" cy="${y(month.profit)}" r="4" fill="#29977b"><title>${month.label}: ${money(month.profit)}</title></circle><text x="${30 + index * 100}" y="194" text-anchor="middle" font-size="10" fill="#667a7e">${month.label}</text>`).join('')}</svg><div class="trend-values">${months.map((month) => `<div><small>${month.label}</small><strong>${money(month.profit)}</strong></div>`).join('')}</div></section>`;
}

function expenseGroups() {
  const grouped = { Rent: 0, Salary: 0, Utilities: 0, Supplies: 0, Others: 0 };
  transactions
    .filter(
      (record) =>
        record.status === 'Approved' &&
        record.type === 'Expense' &&
        record.date.startsWith(dashboardMonth),
    )
    .forEach((record) => {
      let category = record.category;
      if (category === 'Payroll') category = 'Salary';
      if (['Electricity', 'Internet'].includes(category)) category = 'Utilities';
      if (!Object.hasOwn(grouped, category)) category = 'Others';
      grouped[category] += Number(record.amount);
    });
  return grouped;
}
function expenseCategories() {
  const grouped = expenseGroups();
  const entries = Object.entries(grouped)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const sum = entries.reduce((total, [, value]) => total + value, 0);
  const colors = ['#29977b', '#6b96c3', '#aa8ac5', '#d5a45e', '#6aa7a1', '#cc817c', '#8c97a3'];
  let offset = 0;
  const gradient = entries
    .map(([, amount], index) => {
      const start = offset;
      offset += (amount / sum) * 100;
      return `${colors[index % colors.length]} ${start}% ${offset}%`;
    })
    .join(',');
  return `<section class="card panel"><h2>Expense categories</h2><p>Where money went in ${esc(dashboardMonth)}</p>${sum ? `<div class="expense-breakdown"><div class="expense-pie" style="background:conic-gradient(${gradient})" role="img" aria-label="Expense share by category"></div><div>${entries.map(([label, amount], index) => `<div class="expense-legend"><i class="dot" style="background:${colors[index % colors.length]}"></i><span>${esc(label)}</span><strong>${((amount / sum) * 100).toFixed(1)}%</strong><small>${money(amount)}</small></div>`).join('')}</div></div>` : '<div class="empty">No expenses recorded for this month.</div>'}</section>`;
}

function overview() {
  const monthRecords = transactions.filter(
    (record) => record.status === 'Approved' && record.date.startsWith(dashboardMonth),
  );
  const summary = totals(monthRecords);
  const highest = Object.entries(expenseGroups()).sort((a, b) => b[1] - a[1])[0];
  return (
    heading(
      'Business dashboard',
      `${currentUser.business} · Financial health at a glance`,
      role !== 'Manager'
        ? '<button class="primary" onclick="editTransaction()">＋ Record transaction</button>'
        : '',
    ) +
    `<div class="dashboard-period"><label for="dashboard-month">Financial month</label><input id="dashboard-month" type="month" value="${dashboardMonth}" onchange="if(this.value){dashboardMonth=this.value;render()}"></div>` +
    `<div class="stats dashboard-stats">${stat('Total Income', money(summary.income), 'Recorded this month', '↗')}${stat('Total Expenses', money(summary.expense), 'Recorded this month', '↘')}${stat('Net Profit', money(summary.income - summary.expense), 'Monthly income − expenses', '₱')}${stat('Cash Balance', money(cashBalance()), 'Opening cash + receipts − spending', '▣')}${stat('Number of Transactions', monthRecords.length, 'Recorded this month', '⇄')}${stat('Highest Expense Category', highest[1] > 0 ? highest[0] : 'None', highest[1] > 0 ? money(highest[1]) + ' this month' : 'No expenses this month', '◔')}</div>` +
    `<div class="finance-chart-grid">${monthlyChart()}${profitTrend()}</div>${expenseCategories()}` +
    `<section class="card panel tablepanel"><div class="panelhead"><h2>Recent transactions</h2><button onclick="go('Transactions')">View history →</button></div>${recordRows([...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 5))}</section>`
  );
}
