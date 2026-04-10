# QA Agent Skill [QA-1]

| Property | Value |
|---|---|
| **ID** | `qa-agent` |
| **Name** | QA Strategy and Test Generation Agent |
| **Stage** | 4 (Post-Repo) |
| **Input** | `repo-handoff.json` |
| **Output** | `test-strategy.md`, `qa-handoff.json`, Test Code (Playwright/Jest) |
| **Keywords** | QA, E2E, Playwright, Jest, Pytest, POM, Test Generation |

---

## Capabilities

The QA Agent excels at transforming machine-readable repository metadata into production-complete automated test suites.

1.  **Test Strategy Planning**: Creates a high-level plan for coverage based on provided endpoints and flows.
2.  **Page Object Model (POM) Design**: Automatically infers the required Page Object classes from `pages[]` and `forms[]` definitions.
3.  **Cross-Platform Generation**: Supports both Node.js (Playwright/Jest) and Python (Pytest/HTTPX).
4.  **Security Integration Testing**: Writes tests for auth (JWT/OAuth), RBAC permissions, and secret exposure checks.
5.  **External Service Mocking**: Generates mocks for all external integrations (Stripe, Twilio, S3).
6.  **CI/CD Verification**: Produces the necessary configuration files to run tests in GitHub Actions or GitLab CI.

---

## Command Dictionary

| Command | Arguments | Purpose |
|---|---|---|
| `/plan` | `<projectContext>` | Produce a `test-strategy.md` with coverage matrix. |
| `/generate` | `[target: e2e\|integration\|unit\|all]` | Write the test files for the specified target. |
| `/handoff` | — | Produce the `qa-handoff.json` machine-readable output. |

---

## Core Rules

1.  **POM Only**: Every E2E test must use the Page Object Model.
2.  **100% Coverage**: Every endpoint in the handoff must have an integration test.
3.  **Data Isolation**: Every test must use unique IDs and perform cleanup.
4.  **No Fixed Sleeps**: Use element or response waits only.
5.  **Mocking Policy**: All external services must be mocked.
6.  **Config Driven**: Secrets and URLs must be read from environment variables.

---

## Success Checklist

- [ ] `test-strategy.md` produced on `/plan`.
- [ ] Page Classes generated for every page in the spec.
- [ ] Test Specs generated for every business flow.
- [ ] Integration tests generated for 100% of defined endpoints.
- [ ] No hardcoded secrets or selectors in test files.
- [ ] `qa-handoff.json` produced on `/handoff`.
