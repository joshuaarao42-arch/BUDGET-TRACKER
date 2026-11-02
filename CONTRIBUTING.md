# Contributing to Vault Budget Tracker

Thanks for considering a contribution to Vault Budget Tracker, a web application for tracking personal income, expenses, and balances.

## Set up the project
```bash
git clone https://github.com/joshuaarao42-arch/BUDGET-TRACKER.git
cd BUDGET-TRACKER
npm install
npm start
```
Use the scripts defined in `package.json` if they differ from these commands.

## Contribution priorities
- Improve income and expense entry, editing, and organization.
- Make balance calculations reliable and easy to understand.
- Improve authentication and session handling.
- Enhance responsive layouts, accessibility, and clear financial summaries.
- Improve validation and helpful error messages.

## Financial-data safeguards
- Never commit real personal or financial records, credentials, JWT secrets, or environment files.
- Validate amounts and inputs before saving or calculating balances.
- Avoid floating-point rounding errors in monetary calculations; follow the project's existing money-handling approach.
- Do not expose one user's records to another user.
- Keep authentication changes secure and document any required environment variables without publishing their values.

## Before submitting
Test registration and login, invalid inputs, income and expense changes, balance updates, and relevant responsive views. Include steps to reproduce bug fixes and screenshots for interface changes.

Use focused branches such as `feature/monthly-summary` or `fix/expense-validation`. Explain the change and its test results in your pull request.
