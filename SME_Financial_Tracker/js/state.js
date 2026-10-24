function html(parts, ...values) {
  return parts.reduce(
    (markup, part, index) => markup + part + (index < values.length ? values[index] : ''),
    '',
  );
}

const $ = (selector) => document.querySelector(selector);

function money(amount) {
  return (
    '₱' +
    Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function esc(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
}

let role = 'Store Owner';
let page = 'Overview';
let searchQuery = '';
let transactionType = 'All';
let chartPeriod = 'Last 6 months';
let transactions = [];
let budgets = [0, 0, 0, 0];
let orders = [];
let invoices = [];
let team = [];
let settings = {};
let currentUser;

const names = {
  'Store Owner': ['Owner', 'O', 'Business owner'],
  Staff: ['Staff', 'S', 'Staff member'],
  Supplier: ['Supplier', 'S', 'Supplier'],
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadState() {
  const state = await api('state');
  currentUser = state.user;
  role = currentUser.role;
  transactions = state.transactions;
  orders = state.orders;
  invoices = state.invoices;
  team = state.team;
  settings = state.settings;
  budgets = settings.budgets || [0, 0, 0, 0];
  const initials = currentUser.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  names[role] = [currentUser.name, initials, currentUser.role];
}

async function mutate(action, data) {
  await api(action, data);
  await loadState();
  render();
}
