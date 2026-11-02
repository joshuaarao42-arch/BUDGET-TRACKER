# Contributing to Vault Budget Tracker

This project helps students track personal income, expenses, and account balances through a web interface.

## Clone and run
```bash
git clone https://github.com/joshuaarao42-arch/BUDGET-TRACKER.git
cd BUDGET-TRACKER
npm install
npm start
```

## Project-specific contributions
- Improve income and expense entry, editing, and balance summaries.
- Strengthen authentication, session handling, and input validation.
- Improve responsive financial dashboards and accessible forms.
- Improve error messages and handling of missing or invalid amounts.

## Financial-data safeguards
Test balance calculations after adding, editing, and deleting transactions. Check invalid, zero, and unusually large amounts. Keep monetary calculations consistent with the project's existing approach. Never commit real financial records, passwords, JWT secrets, tokens, or environment files. Do not expose one user's data to another.

Use branches such as `feature/monthly-summary` or `fix/expense-validation`. Pull requests must describe the financial workflow changed and the tests performed.
