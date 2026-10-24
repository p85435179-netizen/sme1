# Caloocan SME Financial Management System

A web application for small businesses to record income and expenses, manage customer invoices, monitor cash and profit, and generate financial reports. It supports Super Admin, Business Owner (Admin), Finance Staff, and Manager accounts. Full accounting, tax filing, inventory, payroll processing, and online payment processing are outside its scope.

## Run in XAMPP

1. Place this folder at `C:\xampp\htdocs\SME_Financial_Tracker`.
2. Start Apache and open `http://localhost/SME_Financial_Tracker/`.
3. Register as **Business Owner (Admin)** with your business name, owner name, username, and password. Each registration creates a pending business owner application. The Super Admin must approve it before sign-in is allowed.
4. In **User Management**, add Finance Staff or Managers. These are the only roles owners can create. Public registration is for Business Owners only.
5. In **Settings**, enter the opening cash balance that existed before your first recorded transaction.
6. Record income and expenses or receive payments against invoices. The dashboard and reports update from the saved ledger.

Existing Business Owner accounts can keep signing in with the same credentials. The separate Super Admin reviews business registrations and can change their own password. Super Admin has no access to business financial records. Existing Admin accounts become owners of their own isolated business; existing Accountants become Finance Staff in their assigned business. No financial records or password hashes are deleted by migration.

## Role permissions

| Feature                                       | Business Owner (Admin) | Finance Staff | Manager |
| --------------------------------------------- | ---------------------- | ------------- | ------- |
| Dashboard, reports and financial summary      | Yes                    | Yes           | Yes     |
| View transaction history                      | Yes                    | Yes           | Yes     |
| Record or edit income and expenses            | Yes                    | Yes           | No      |
| Create/edit invoices and update payments      | Yes                    | Yes           | No      |
| Permanently delete financial records/invoices | Yes, with confirmation | No            | No      |
| Add, edit, remove or approve users            | Finance Staff / Manager only, own business | No            | No      |
| Set business name and opening cash            | Yes                    | No            | No      |
| Export financial CSV reports                  | Yes                    | Yes           | Yes     |
| Change own password                           | Yes                    | Yes           | Yes     |

User removal deletes sign-in access and removes the person from User Management while retaining their financial history. The last active owner cannot be disabled, removed, or demoted. A user can never manage another business by supplying a different user or record ID.

## Modules

- **Dashboard:** current month's income, expenses, net profit, and current cash; a selectable financial month; six-month income-versus-expenses bars; a profit trend; category expense shares; and recent transactions. Visible dashboards refresh in the background every 30 seconds and after records are saved. Forms are not interrupted by automatic refresh.
- **Income Management:** source, description, category (sales/services/other income), amount, date, and automatic transaction ID.
- **Expense Management:** category (rent, electricity, internet, salary, supplies, transportation and others), description, optional payee, amount, date, and automatic transaction ID.
- **Transaction History:** keyword search, type/status filters, sorting, pagination, editing, owner-confirmed deletion, and CSV export.
- **Invoice Management:** invoice number, customer, issue/due dates, total, notes, paid amount, balance, payment status and payment history. Unpaid invoices can be cancelled and reopened.
- **Reports:** daily, weekly (Monday–Sunday), monthly, annual, custom range and all-date reports; category breakdowns; report transactions; and CSV export.
- **Financial Summary:** income minus expenses equals net profit, plus the current cash balance and period totals.
- **User Management:** owner-managed accounts and pending team requests, role assignment, approval/rejection, disabling, removal and password resets.
- **Activity:** financial and account changes remain traceable in business activity history.

## Financial calculations

`Net profit = recorded income - recorded expenses` for the selected period.

`Current cash = opening cash + all recorded receipts through today - all recorded spending through today`.

Opening cash is the amount available before the first transaction recorded in this installation. This is an available-funds summary, not a reconciled bank balance. The system assumes manually logged income and expenses are settled receipts and payments. Unpaid invoices are excluded from income, cash and profit until payment is received.

Invoice payment updates use the **cumulative amount received so far**. A larger total adds income for the difference. A smaller total creates a labelled refund/reversal expense. Repeating the same paid total adds no duplicate ledger entry. Invoice-derived ledger entries cannot be edited or deleted directly; manage the invoice instead. Owner-confirmed invoice deletion removes its linked receipts/reversals and recalculates reports and cash.

New entries post immediately. Older Pending/Rejected records from the previous review-based workflow remain excluded until the owner posts them or an authorized user edits and records them. This preserves their existing review status during migration.

## Database

MySQL/MariaDB is active by default on localhost:3306. The current database is `sme`, accessible through phpMyAdmin. Existing SQLite accounts and data were transferred; `data/ledgerly.sqlite` remains as the pre-migration copy. The older `sme_financial_tracker` MySQL database was preserved. Private data, schema and configuration directories are protected by `.htaccess` under Apache.

Keep Apache and MySQL running in XAMPP. Connection settings are in `config/database.php`: host `127.0.0.1`, port `3306`, database `sme`, username `root`, blank password for this local XAMPP installation. Environment variables `DB_DRIVER`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` can override them. For a fresh installation, `database/database.sql` includes CREATE DATABASE and USE statements. Importing that schema alone does not copy existing records.

The database user needs permission to initialize and migrate tables. The SQLite data directory must be writable. PHP requires mbstring and PDO SQLite (plus PDO MySQL if using MySQL). No Composer or npm dependencies are needed to run the system.

For PHP's local development server:

```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8080 router.php
```

Then open `http://127.0.0.1:8080/`. Always use the router to protect private directories.

## Data preservation and protection

A pre-upgrade source and database snapshot was saved outside the system folder. The migration preserves existing IDs, credentials and monetary records. Previous supplier-related tables remain in old databases but are outside the active system modules. Old role-specific links redirect to the authenticated workspace.

Authentication is checked on `workspace.php` and on each API request. Writes require CSRF tokens, validated inputs and role/business permissions. Edits and payment updates use record versions to detect stale updates. Password resets and access changes revoke older sessions. SQL queries use bound parameters; history views join creators, invoices and payments. Use HTTPS on a hosted server and do not publish saved databases or real database passwords on GitHub.

## Source folders

- `api/`: database initialization/migration, authentication, scoped data reads and record mutations.
- `config/`: database connection settings.
- `database/`: complete SQLite and MySQL schemas.
- `data/`: the saved local database.
- `js/`: authentication, dashboards, income/expense history, invoices, reports, users and settings.
- `workspace.php`: authenticated application shell.

Verification tools and rollback snapshots are kept outside the deployed system folder.



Super Admin User Management lists business owners. Select an owner name or View staff & managers to inspect the Finance Staff and Managers in that owner's business. Team membership is grouped by business, including when a business has more than one owner. This directory does not expose passwords or financial records.

Super Admin can create Super Admin, Business Owner, Finance Staff and Manager accounts in Users > Add user. These accounts are approved immediately. A new owner gets a separate business; team accounts require a business with an active approved owner. Business Owners remain restricted to creating Finance Staff and Managers.
