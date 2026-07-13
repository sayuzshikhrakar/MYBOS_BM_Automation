---
name: playwright-testcase
description: >
  QA automation: writing Playwright + Cucumber tests for this repository.
  Use when adding testcases, feature files, step definitions, page objects, or
  extending existing Playwright+Cucumber automation. The code under test is NOT
  deployed — all locators must be derived from the plan.md Playwright Locator Map
  and Builder source files, not from a live browser session.
user-invocable: false
version: 6.0.0
---

# Playwright Testcase Authoring

> Locator naming rules, fallback priority order, dynamic testid syntax, and the
> Locator Contract are all defined in `agents.md`.
> This skill contains repository structure and authoring patterns only.

---

## Source-First Authoring (No Live Browser)

The CMS code is NOT deployed when tests are written. You cannot navigate to a running
app. All locator decisions must come from source files and the plan.

Reading order before writing a single line of test code:

1. `plan.md ## Playwright Locator Map` — the authoritative list of every
   `data-testid`, its JSX form, the file it lives in, and its fallback locator.
2. `build-handoff.md ## Locator Audit` — confirms which testids the Builder
   actually placed in JSX (✅ / ❌). Read from disk at
   `<featurePath>/plans/build-handoff.md`.
3. Source files listed in `build-handoff.md ## Files Changed` — grep each file
   for `data-testid` occurrences to independently verify the audit.
4. `agents.md ## Playwright Locator Contract` — naming rules and dynamic testid syntax.
5. `agents.md ## Fallback Locator Strategy` — the priority order to use when a
   planned testid is absent or unconfirmed.

---

## Handling Missing Testids (Gap Resolution Protocol)

For every row in `plan.md ## Playwright Locator Map`, classify it before writing
the test that uses it:

| Classification | Condition | Action |
| --- | --- | --- |
| **Exact** | Testid confirmed ✅ in Locator Audit AND found by grep in source | Use `page.getByTestId('<id>')` |
| **Fallback** | Testid NOT confirmed ❌ in Locator Audit OR absent from grep | Apply fallback strategy from `agents.md`; mark row "Fallback" in Locator Coverage Audit |
| **Not covered — Builder gap** | Testid absent from source AND fallback is also absent or unstable | Do NOT fabricate a locator; mark row "Not covered — Builder gap" in Locator Coverage Audit; surface in output as a blocking warning |

A "Not covered — Builder gap" row means: the Builder missed a required testid.
The QA agent must surface this in the output section **## Blocking Gaps** so that
the n8n workflow or a human can act on it before the tests are run.

> **Never silently fall back and pretend coverage is complete.**
> A missing testid that the test simply skips over is a silent failure.
> Report it explicitly.

---

## Framework Context

| Item | Value |
| --- | --- |
| Cucumber entrypoint | `tests/support/cucumber.js` |
| World + lifecycle | `tests/support/world.ts` — **never modify** |
| Features | `tests/features/**/*.feature` |
| Steps | `tests/steps/**/*.ts` |
| Page objects | `tests/pages/**/*.ts` |
| Fixtures | `tests/fixtures/**/*.json` |
| Shared helpers | `tests/pages/common/table.ts`, `pagination.ts`, `dropdown.ts`, `generatedata.ts` |

- Use `this.page` from the existing world. Do not call `chromium.launch()` in step files.
- Do not create `*.spec.ts` files unless explicitly requested.
- Do not modify `tests/support/world.ts`.

---

## Repo Path Mapping

| Domain | features/ | steps/ | pages/ |
| --- | --- | --- | --- |
| admin | `tests/features/admin/` | `tests/steps/admin/` | `tests/pages/admin/` |
| appUser | `tests/features/appUser/` | `tests/steps/appUser/` | `tests/pages/appUser/` |
| faq | `tests/features/faq/` | `tests/steps/faq/` | `tests/pages/faq/` |
| emailTemplate | `tests/features/emailTemplate/` | `tests/steps/emailTemplate/` | `tests/pages/emailTemplate/` |
| taxonomy | `tests/features/taxonomy/` | `tests/steps/taxonomy/` | `tests/pages/taxonomy/` |
| testimonial | `tests/features/testimonial/` | `tests/steps/testimonial/` | `tests/pages/testimonial/` |
| stripeSubscription | `tests/features/stripeSubscription/` | `tests/steps/stripeSubscription/` | `tests/pages/stripeSubscription/` |
| advancePages | `tests/features/advancePages/` | `tests/steps/advancePages/` | `tests/pages/advancePages/` |
| accountSettings | `tests/features/accountSettings/` | `tests/steps/accountSettings/` | `tests/pages/accountSettings/` |
| authentication | `tests/features/zauthentication/` | `tests/steps/authentication/` | `tests/pages/authentication/` |
| web | `tests/features/web/` | `tests/steps/web/` | `tests/pages/web/` |
| webAuthentication | `tests/features/web/webAuthentication/` | `tests/steps/web/webAuthentication/` | `tests/pages/web/webAuthentication/` |

Note: authentication features → `zauthentication/` (z forces last in regression run).

---

## File Naming

Feature files — numeric CRUD prefix, continue the existing sequence in the folder:
```
01add<Domain>.feature
02list<Domain>.feature
03edit<Domain>.feature
04del<Domain>.feature
05disable<Domain>.feature
```

Steps: `add<Domain>.steps.ts` / `list<Domain>.steps.ts` / etc.
Page objects: `add<Domain>.ts` / `list<Domain>.ts` / etc.

Extend existing files rather than creating parallel duplicates.

---

## Tag Naming

| Scenario type | Tag pattern | Example |
| --- | --- | --- |
| CMS add | `@<domain>add` | `@faqadd` |
| CMS list | `@<domain>list` | `@faqlist` |
| CMS edit | `@<domain>edit` | `@faqedit` |
| CMS delete | `@<domain>delete` | `@faqdelete` |
| CMS disable | `@disable<domain>` | `@disableadmin` |
| Web feature | `@web<descriptor>` | `@weblogin` |
| CMS routing | `@cms` | always include for CMS scenarios |
| Web routing | `@web*` | always include for web scenarios |

---

## Page Object Patterns

### Locator construction from plan.md (source-only)

Derive locators exclusively from the Locator Map and Builder source. Do not guess.

```ts
// CORRECT: derived from plan.md Locator Map, confirmed by Locator Audit
private submitButton(): Locator {
  return this.page
    .getByTestId('feature-btn-submit')           // Exact — confirmed in source
    .or(this.page.locator('button[type="submit"]')) // Fallback from Locator Map column
    .first();
}

// CORRECT: fallback because Locator Audit showed ❌ for this testid
private cancelButton(): Locator {
  // NOT COVERED by data-testid — using role fallback (Builder gap documented)
  return this.page.getByRole('button', { name: /cancel/i });
}
```

### Resilient locator (use `.or()` chaining)

Always chain at least one fallback from the "Fallback locator" column of the Locator Map.

> ⚠️ `.or()` unions matches from both locators — it is **not** a priority fallback.
> `.first()` returns whichever element comes first in DOM order, not whichever
> locator matched. A role/name fallback (e.g. `getByRole('button', { name: /submit/i })`)
> can match an unrelated element elsewhere on the page (shared header/footer chrome,
> a repeated label) and silently win over the intended testid'd element. This has
> caused real test failures. See `agents.md ## Fallback Locator Strategy` for the
> full rule. In short:
> - If the testid is confirmed present (an "Exact" row), use `page.getByTestId('<id>')`
>   alone — do not chain a `.or()` "just in case."
> - Never assert `toHaveAttribute(...)`/exact values on a locator built with
>   `.or(page.getByRole(...))` or similar page-wide fallbacks unless the fallback
>   locator is scoped to a container (a section/row/dialog locator, not bare `this.page`).
> - `npm run typecheck` runs `scripts/check-risky-locators.js`, which statically
>   flags this exact shape when used in a `toHaveAttribute(...)` assertion.

```ts
private submitButton(): Locator {
  return this.page
    .getByTestId('feature-btn-submit')
    .or(this.page.getByRole('button', { name: /submit|save|update/i }))
    .first();
}
```

This shape is acceptable for `.click()`/`.isVisible()` on a page where the fallback's
role+name is unlikely to repeat (e.g. a form's own submit button). It is **not** safe
to use for `toHaveAttribute(...)` assertions — prefer `getByTestId` alone there, or
scope the fallback to a container locator, e.g. `formRoot.getByRole('button', { name })`.

### Row action helper (implement in every list page object)

```ts
async openFirstRowAction(actionName: string): Promise<void> {
  const row = this.page.locator('.MuiDataGrid-row, tbody tr').first();
  const actionBtn = row
    .locator('[data-field="actions"] button')
    .or(row.getByRole('button', { name: /more|actions|menu|open/i }))
    .or(row.locator('button').last())
    .first();
  await actionBtn.waitFor({ state: 'visible', timeout: 10000 });
  await actionBtn.click();
  await this.page
    .getByRole('menuitem', { name: new RegExp(actionName, 'i') })
    .click();
}
```

### MUI Autocomplete

```ts
private async openDropdown(comboBoxRoot: Locator): Promise<void> {
  const combobox = comboBoxRoot.getByRole('combobox');
  if (await combobox.isVisible().catch(() => false)) {
    await combobox.click();
    return;
  }
  await comboBoxRoot.click();
}

private async selectOption(
  comboBoxRoot: Locator,
  option: { testId: string; label: string }
): Promise<void> {
  await this.openDropdown(comboBoxRoot);
  await this.page
    .getByTestId(option.testId)
    .or(this.page.getByRole('option', { name: option.label, exact: true }))
    .first()
    .click();
}
```

### Toast assertion (immediately after submit)

```ts
async saveForm(): Promise<void> {
  await this.submitButton().click();
  const toast = this.page
    .getByTestId('toast-success')
    .or(this.page.getByRole('alert'))
    .or(this.page.getByText(/saved successfully|updated successfully|success/i))
    .first();
  const visible = await toast.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) {
    console.warn('Success toast not visible; continuing with state verification.');
  }
}
```

### Dynamic testid capture

```ts
// Capture the record id from the first rendered row
const firstRowTestId = await this.page
  .locator('[data-testid^="feature-row-"]')
  .first()
  .getAttribute('data-testid');
const recordId = firstRowTestId?.replace('feature-row-', '');

// Then use it in later interactions
await this.page.getByTestId(`feature-btn-edit-${recordId}`).click();
```

---

## Minimal List-to-Detail Comparison

Prefer the simplest path to verify that a list item matches its detail view.
Derive column-to-field mapping from the Locator Map, not from guessing the DOM.

```ts
// From plan.md Locator Map we know:
// - table container: feature-table → DataTable wraps rows
// - row: feature-row-{id} → data-testid={`feature-row-${item._id}`}
// So: rows are [data-testid^="feature-row-"]

const firstRow = this.page.locator('[data-testid^="feature-row-"]').first();
const cells = await firstRow.locator('td').allInnerTexts();

// Open detail via row action (openFirstRowAction is mandatory in every list page object)
await this.openFirstRowAction('View');

// Assert detail fields — use input.inputValue() with text fallback
const getName = async () => {
  try { return (await this.page.locator('input[name="name"]').inputValue()).trim(); }
  catch { return (await this.page.locator('[data-testid="feature-input-name"]').innerText()).trim(); }
};
expect(await getName()).toBe(cells[0].trim());
```

---

## Filter and Pagination Collection

When a scenario must verify filtered results across pages:

```ts
// Apply filter
await this.page.locator(filterSelector).click();
await this.page.getByRole('option', { name: filterOption, exact: true }).click();
await this.page.waitForLoadState('networkidle');

// Collect values across pages
const collected: string[] = [];
while (true) {
  const rows = this.page.locator('[data-testid^="feature-row-"]');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    collected.push((await rows.nth(i).locator('td').first().innerText()).trim());
  }
  const next = this.page.getByTestId('pagination-btn-next')
    .or(this.page.locator('button[aria-label="Go to next page"]'));
  if (!(await next.isVisible())) break;
  await next.click();
  await this.page.waitForLoadState('networkidle');
}

expect(collected.length).toBeGreaterThan(0);
```

---

## Form Validation Scenarios

Cover these for every editable form in addition to the happy path:

| Edge case | Pattern |
| --- | --- |
| Required fields empty | Clear all required fields at once + save → assert any required message |
| Field below min length | Short value + save → `minMessageForPath('fieldName')` |
| Phone below min digits | < 7 digits + save → `minMessageForPath('phoneNumber')` |
| Field over max length | Too-long value + save → `maxMessageForPath('fieldName')` |

One bulk scenario clears all required fields — not per-field scenarios.

```ts
import {
  minMessageForPath,
  maxMessageForPath,
} from '../../support/centralizedMessage/validationMessages';
```

---

## package.json Scripts (always add after generating tests)

```json
"test:<domain>:<action>": "npx cucumber-js --config tests/support/cucumber.js --tags @<tag>",
"test:<domain>:<action>:chromium": "dotenv -e .env.chromium -- npx cucumber-js --config tests/support/cucumber.js --tags @<tag>",
"test:<domain>:<action>:firefox": "dotenv -e .env.firefox -- npx cucumber-js --config tests/support/cucumber.js --tags @<tag>",
"test:<domain>:<action>:webkit": "dotenv -e .env.webkit -- npx cucumber-js --config tests/support/cucumber.js --tags @<tag>",
"test:<domain>:<action>:all": "npm-run-all test:<domain>:<action>:chromium test:<domain>:<action>:firefox test:<domain>:<action>:webkit"
```

Reuse existing scripts for the same domain/action — never duplicate.

---

## Post-Write Confirmation

After all files are written, confirm:

```
✓ tests/features/<domain>/<file>.feature
✓ tests/steps/<domain>/<file>.steps.ts
✓ tests/pages/<domain>/<file>.ts
✓ package.json scripts added or reused
```

Dry-run check:
```bash
dotenv -e .env.chromium -- npx cucumber-js --dry-run \
  --config tests/support/cucumber.js --tags @<tag>
```

Report pass or list every unresolved step definition.

---

## Locator Coverage Audit (required in every output)

Every row from `plan.md ## Playwright Locator Map` must appear here.

| data-testid from Locator Map | Classification | Used in test file | Step / assertion |
| --- | --- | --- | --- |
| feature-input-name | Exact | tests/pages/feature/addFeature.ts | fill step |
| feature-btn-submit | Exact | tests/pages/feature/addFeature.ts | click step |
| toast-success | Fallback (role alert) | tests/pages/feature/addFeature.ts | toast assertion |
| feature-row-{id} | Dynamic Exact | tests/pages/feature/listFeature.ts | row assertion |
| feature-btn-action-{id} | Fallback (MUI DataGrid) | tests/pages/feature/listFeature.ts | openFirstRowAction |
| feature-btn-delete-{id} | **Not covered — Builder gap** | — | Builder did not place this testid; see ## Blocking Gaps |

Classification values:
- **Exact** — `page.getByTestId('<id>')`, confirmed in Locator Audit and grep
- **Dynamic Exact** — `` page.getByTestId(`prefix-${id}`) ``, confirmed in source
- **Fallback** — planned id missing or ❌ in audit; role/label/text/CSS fallback used
- **Not covered — Builder gap** — testid absent from source AND no stable fallback exists

---

## Blocking Gaps (required section in every output)

List every row that is "Not covered — Builder gap".
If none, write: `No blocking gaps. All locators resolved.`

Example:

```
## Blocking Gaps

The following testids from plan.md ## Playwright Locator Map were not found in
Builder source files and have no stable fallback:

| data-testid | File where it should appear | Impact |
| --- | --- | --- |
| feature-btn-delete-{id} | src/modules/domain/feature/table/useFeatureRowActions.ts | Delete scenario cannot run |

Action required: Builder must add the missing data-testid attributes before
these tests can execute.
```

---

## Definition of Done

A testcase is complete when:

- Scenario has a valid routing tag (`@cms` or `@web*`).
- All step definitions resolve (dry-run passes).
- Page object methods exist for every new UI interaction.
- `package.json` has all four scripts (`base`, `:chromium`, `:firefox`, `:webkit`, `:all`).
- Locator Coverage Audit table is complete with no unexplained gaps.
- `## Blocking Gaps` section is present (empty or populated).
- No browser launch logic outside the shared world.
- Web features: files are in `tests/features/web/`, `tests/steps/web/`, `tests/pages/web/`.
- `npm run report:chromium` is run after tests pass (once the CMS code is deployed).