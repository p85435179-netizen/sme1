const $ = (selector) => document.querySelector(selector);
const categories = [
  'Sales',
  'Services',
  'Other income',
  'Rent',
  'Electricity',
  'Internet',
  'Salary',
  'Supplies',
  'Transportation',
  'Utilities',
  'Marketing',
  'Operations',
  'Payroll',
  'Refunds',
  'Other',
];
let currentUser;
let role = '';
let page = 'Overview';
let transactions = [];
let users = [];
let invoices = [];
let payments = [];
let dashboardMonth = today().slice(0, 7);
let reportPeriod = 'Monthly';
let activities = [];
let databaseDriver = '';
let searchQuery = '';
let transactionType = 'All';
let transactionStatus = 'All';
let transactionSort = 'newest';
let pageNumber = 1;
let reportFrom = '';
let reportTo = '';
let userQuery = '';
let userRole = 'All';
let userStatus = 'All';

function esc(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}

function money(amount) {
  return (
    '₱' +
    Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

async function loadState() {
  const state = await api('state');
  currentUser = state.user;
  role = currentUser.role;
  transactions = state.transactions.map((record) => ({
    ...record,
    amount: Number(record.amount),
    id: Number(record.id),
    version: Number(record.version),
  }));
  users = state.users;
  invoices = state.invoices.map((invoice) => ({
    ...invoice,
    id: Number(invoice.id),
    amount: Number(invoice.amount),
    paid_amount: Number(invoice.paid_amount),
    version: Number(invoice.version),
  }));
  payments = state.payments;
  activities = state.activities;
  databaseDriver = state.database_driver;
}

async function saveAndRefresh(action, data, message) {
  await api(action, data);
  closeModal();
  try {
    await loadState();
    render();
    toast(message);
  } catch (error) {
    toast('Saved successfully. Reload to see the latest data. ' + error.message);
  }
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}
