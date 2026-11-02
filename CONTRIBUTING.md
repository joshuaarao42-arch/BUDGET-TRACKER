# Contributing to Vault Budget Tracker

Thank you for contributing to Vault Budget Tracker. Improvements to expense tracking, income management, financial summaries, usability, and reliability are welcome.

## Getting started

```bash
git clone https://github.com/joshuaarao42-arch/BUDGET-TRACKER.git
cd BUDGET-TRACKER
npm install
npm start
```

If the available scripts differ, use the commands listed in `package.json` and the project README. Do not commit local configuration or dependency folders.

## What you can contribute

- Improve income and expense creation, editing, and organization.
- Improve balance summaries and financial dashboards.
- Strengthen authentication, session handling, and input validation.
- Improve responsive layouts, accessibility, and error messages.
- Fix bugs and clarify setup or user documentation.

## Project-specific guidelines

- Test calculations after adding, editing, and deleting transactions.
- Check zero, negative, missing, invalid, and unusually large amounts.
- Keep monetary calculations consistent with the project's existing approach and avoid introducing rounding inconsistencies.
- Ensure a user's financial records cannot be accessed by another user.
- Never commit real financial records, passwords, JWT secrets, access tokens, or environment files.
- Do not claim that client-side validation alone provides secure authentication.

## Development standards

Follow the existing JavaScript, HTML, CSS, and project conventions. Use descriptive names, keep functions focused, validate untrusted input, and avoid adding dependencies without explaining why they are needed.

## Testing your changes

Run the application using the documented workflow. Test the affected transaction, income, expense, authentication, and summary flows. Include sample inputs and expected totals for calculation changes. Do not use real financial information in screenshots or test data.

## Branch and commit workflow

Create a focused branch from the default branch, such as `feature/monthly-summary`, `fix/expense-validation`, or `docs/setup`. Use commit prefixes such as `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, and `test:`.

## Opening a pull request

Describe the financial workflow changed, why the change is needed, how to test it, and the results. Include screenshots for interface changes and sample calculation cases for financial logic. Link a related issue when applicable.

## Reporting issues

Provide reproduction steps, expected and actual results, relevant browser or runtime details, and sanitized screenshots or logs. Never attach real account credentials or financial records.

## Code of conduct

Treat contributors respectfully. Be patient with questions, give actionable feedback, and keep discussions professional and inclusive.
