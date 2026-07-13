---
name: appium-webdriverio-testcase
description: >
  QA automation: writing Appium + WebdriverIO tests for mobile applications.
  Use this skill when generating test cases, page objects, or extending mobile automation suites.
  Contains strict guidelines for locator strategies, state management, and handling mobile-specific OS overlays.
user-invocable: false
version: 1.0.0
---

# Appium Testcase Authoring

> This skill file serves as the Standard Operating Procedure (SOP) for authoring stable and maintainable mobile automated tests using Appium and WebdriverIO.

---

## Framework Context & Architecture

| Component | Convention |
| --- | --- |
| Architecture | Page Object Model (POM) |
| Test Runner | WebdriverIO |
| Spec Files | `test/specs/**/*.spec.js` |
| Page Objects | `test/pageobjects/**/*.page.js` |
| Reporting | Standalone Allure HTML |

- **Strict Separation of Concerns:** Spec files (`.spec.js`) should ONLY contain test logic and assertions. All locators (`$()`, `$$()`) and interaction methods MUST be encapsulated within Page Object files (`.page.js`).

---

## Parsing Acceptance Criteria (Internal Reasoning Only)

Before writing any code, mentally break the Acceptance Criteria into 
Given / When / Then — this is a THINKING step, not an output format. 
This project does NOT use Cucumber/Gherkin syntax. Do not create .feature 
files or Given()/When()/Then() step definitions.

Mapping rule:
- "Given" → setup/preconditions → goes in `beforeEach()` or start of the `it()` block
- "When" → user action → calls Page Object methods (e.g. `await loginPage.login(...)`)
- "Then" → expected outcome → becomes a WebdriverIO assertion (e.g. `expect(...).toBeDisplayed()`)

Each distinct scenario (happy path, edge case, negative case) from the AC 
becomes ONE `it()` block inside a `describe()` block, written in standard 

Mocha/WebdriverIO syntax:

```javascript
describe('Login Feature', () => {
    it('should_navigate_to_dashboard_when_valid_credentials_entered', async () => {
        // Given
        await loginPage.open();
        // When
        await loginPage.login('user@test.com', 'validPass123');
        // Then
        await expect(dashboardPage.header).toBeDisplayed();
    });
});
```

---

## Handling Acceptance Criteria Changes (Existing Features)

Before writing any new file, ALWAYS check if a spec or page object for this 
feature already exists.

**Step 1 — Search first:**
Look in `test/specs/**/*.spec.js` and `test/pageobjects/**/*.page.js` for 
a file matching the feature name (e.g. "Login" → `login.spec.js`, 
`login.page.js`). Do NOT assume the feature is new.

**Step 2 — If an existing file is found, diff the new AC against it:**
- **New scenario/criteria** → ADD a new `it()` block. Reuse existing 
  Page Object locators/methods wherever they already cover the needed 
  element or action — do not redefine them.
- **Changed scenario/criteria** → MODIFY only the specific `it()` block 
  and/or Page Object method affected. Leave all unrelated tests and 
  methods untouched.
- **Removed scenario/criteria** → Do NOT delete the test. Mark it 
  obsolete instead:
```javascript
  it.skip('should_X_when_Y — OBSOLETE: removed per AC update 2026-07', async () => {
      ...
  });
```
  This preserves history and avoids silently losing coverage.

**Step 3 — Locator reuse check:**
Before adding any new `get locatorName()` to a Page Object, scan that 
file (and `BasePage`) for an existing locator/method that already does 
the job. Never create a duplicate locator for the same element.

**Step 4 — If no existing file is found:**
Proceed as a new feature, following the standard structure defined 
throughout this SOP.

---

## Test Data Sourcing

If the Acceptance Criteria does not include concrete test data values 
(emails, passwords, names, IDs), do NOT invent realistic-looking fake 
data silently. Instead:
1. Ask the user to supply real/valid test data, OR
2. If instructed to proceed without it, generate obvious placeholder 
   values (e.g. `PLACEHOLDER_EMAIL`, `PLACEHOLDER_PASSWORD`) and flag 
   them clearly in a comment so they are never mistaken for real data.

**File Format:**
- Use `test/data/<feature>.data.json` for static literal values 
  (names, dropdown options, dates, expected messages).
- Use `test/data/<feature>.data.js` ONLY when the data requires 
  computation (e.g. relative dates like "tomorrow", dynamically 
  generated IDs). JSON cannot contain expressions or functions.
- NEVER put passwords, tokens, or credentials in `.json` or `.js` 
  fixture files — these belong in `.env` and are read via 
  `process.env.VARIABLE_NAME`.

**Loading JSON data in a spec:**
```javascript
const loginData = require('../data/login.data.json');
```

**Example `login.data.json`:**
```json
{
  "validUser": {
    "email": "qa.test01@company.com",
    "password_env_key": "TEST_USER_PASSWORD"
  },
  "invalidPassword": {
    "email": "qa.test01@company.com",
    "password": "wrongpass123"
  }
}
```
Note: for the valid user, the password is NOT stored directly — 
`password_env_key` points to the `.env` variable name instead. 
The spec/page object reads it via `process.env[data.password_env_key]`.

---
## Locator Strategy & Priority Order

Mobile UI trees are notoriously deep and differ slightly across screen sizes. Avoid overly complex XPaths that rely on nested hierarchies.

### 1. Primary: Accessibility ID
This is the most performant, cross-platform, and stable locator. It maps to `content-desc` on Android and `accessibilityIdentifier` on iOS.
```javascript
// Preferred approach
get tabHome() { return $('~Home'); } 
```

### 2. Secondary: Resource ID / Name
If no accessibility ID exists, rely on the exact element ID.
```javascript
// Android Example
get inputEmail() { return $('//*[@resource-id="com.company.app:id/email_input"]'); }

// iOS Example
get inputEmail() { return $('~email_input'); }
```

### 3. Fallback: Class + Text
When dealing with non-semantic elements, scope by UI class and exact text.
```javascript
get btnSubmit() { return $('//android.widget.Button[@text="Submit"]'); }
```

---

## App State Management & Test Isolation (Critical)

Mobile automation is highly susceptible to flakiness caused by app state carrying over between sequential test runs (e.g., remaining logged in). 

**Rule:** Every test suite MUST explicitly reset the app state before execution. Use Appium's native `clearApp` command rather than manually clicking through a logout flow.

```javascript
beforeEach(async () => {
    // Restart the app to guarantee a clean state between test cases
    const appId = process.env.APP_BUNDLE_ID || 'com.example.app';
    
    await driver.execute('mobile: clearApp', { appId: appId });
    await driver.activateApp(appId);
});
```

---

## Handling System Overlays (Android Permissions)

Modern mobile operating systems (especially Android 13+) employ strict security measures that block automated, synthetic touches from interacting with sensitive system-level dialogs (like Notification or Location permission popups).

**Rule:** DO NOT attempt to find and click the "ALLOW" button via the UI tree. It is highly prone to silent failures.

**Solution:** Force the permission natively via ADB backend execution immediately after clearing the app state, but *before* activating the app.

```javascript
beforeEach(async () => {
    const appId = process.env.APP_BUNDLE_ID || 'com.example.app';
    const deviceSerial = process.env.APPIUM_DEVICE || 'emulator-5554';
    
    await driver.execute('mobile: clearApp', { appId: appId });
    
    // Grant permissions via ADB to suppress flaky OS overlays
    try {
        require('child_process').execSync(`adb -s ${deviceSerial} shell pm grant ${appId} android.permission.POST_NOTIFICATIONS`);
    } catch (e) {
        console.log('Note: ADB permission grant failed, manual popup handling may be required.');
    }
    
    await driver.activateApp(appId);
});
```

---

## Page Object Best Practices

### Base Page Class (OOP Foundation — Required)
Every Page Object MUST extend a shared `BasePage` class. Common interaction 
logic (tapping, waiting, scrolling) belongs in `BasePage`, NOT duplicated 
in individual page files. Before writing a new helper method, check 
`test/pageobjects/base.page.js` first — if a similar method already 
exists, reuse or extend it instead of writing a new one.

```javascript
// test/pageobjects/base.page.js
class BasePage {
  async waitAndTap(selector, timeout = 15000) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    await el.click();
  }
}
module.exports = BasePage;
```

```javascript
// test/pageobjects/login.page.js
const BasePage = require('./base.page');

class LoginPage extends BasePage {
  get inputEmail() { return $('~email_input'); }
}
module.exports = new LoginPage();
```
### Explicit Waits over Hard Pauses
Mobile views require unpredictable time to render network responses and animations. Never use `browser.pause()` for syncing state. Always use explicit waits.

```javascript
// CORRECT
async waitForHome() {
    await this.tabHome.waitForDisplayed({ timeout: 15000 });
}

// INCORRECT (Avoid)
async waitForHome() {
    await browser.pause(5000); 
}
```
### Input Field Handling (Text Boxes)
Before typing into an input field on mobile, always ensure it is 
explicitly cleared. Appium's `setValue` command can sometimes append 
text to existing hint labels on certain OS versions.

```javascript
async login(username, password) {
    await this.inputEmail.clearValue();
    await this.inputEmail.setValue(username);
}
```

**Rule:** Reusable text-entry logic belongs in `BasePage`, not duplicated 
per page object.

```javascript
// BasePage
async clearAndType(selector, value) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout: 10000 });
    await el.clearValue();
    await el.setValue(value);
}
```

Usage in a page object:
```javascript
async login(username, password) {
    await this.clearAndType(this.inputEmail, username);
    await this.clearAndType(this.inputPassword, password);
}
```

---

### Handling Non-Text Inputs (Dropdowns & Date Pickers)

Not all inputs can be typed into directly. Dropdowns and date pickers 
require interaction patterns, not `setValue()`. Reusable logic for these 
belongs in `BasePage` — never duplicate this per page object.

**Dropdowns:**
First identify the type before writing code:
- **Native OS picker** (Android spinner / iOS wheel) — tap to open, then 
  select the option by matching text within the opened list.
- **Custom app-built dropdown** (button that reveals a list/modal) — tap 
  to open, then treat each option as a standard locator.

```javascript
// BasePage
async selectDropdownOption(dropdownSelector, optionText) {
    await this.waitAndTap(dropdownSelector);
    const option = await $(`//*[@text="${optionText}"]`);
    await option.waitForDisplayed({ timeout: 10000 });
    await option.click();
}
```

**Date Pickers:**
Try in this order, use the first one that applies:
1. **Direct text input** — if the field accepts typed text 
   (`await this.dateField.setValue('07/10/2026')`), always prefer this. 
   Fastest, least flaky.
2. **Tap-through calendar UI** — if the field is read-only and opens a 
   visual calendar, navigate month-by-month then tap the target day.
3. **Computed relative dates** — for AC terms like "today" or "next week," 
   compute the date in JS (`new Date()` + offset) rather than visually 
   hunting for it on the calendar.

```javascript
// BasePage
async selectCalendarDate(dateFieldSelector, targetDay, targetMonthYear) {
    await this.waitAndTap(dateFieldSelector);
    const monthHeader = await $('~calendar_month_label');
    while ((await monthHeader.getText()) !== targetMonthYear) {
        await this.waitAndTap('~calendar_next_month_btn');
    }
    const day = await $(`//*[@text="${targetDay}"]`);
    await day.click();
}
```

**Rule:** The Acceptance Criteria or test data MUST specify the exact 
value to select or type (e.g. `'Nepal'`, `'15 July 2026'`, 
`'qa.test01@company.com'`) — never guess an arbitrary dropdown option, 
calendar date, or text value. If the AC only gives a vague instruction 
with no concrete value, follow the "Test Data Sourcing" rule: ask the 
user, or flag a placeholder clearly.

---

## NPM Script Naming Conventions

Never use spaces in custom npm script names (e.g., `npm run wdio login`), as NPM will parse trailing words as arguments to the base script, causing unintended test suite executions.

Use colon-separated namespaces in `package.json`:

```json
"scripts": {
    "test:login": "wdio run wdio.conf.js --spec test/specs/login.spec.js",
    "test:dashboard": "wdio run wdio.conf.js --spec test/specs/dashboard.spec.js",
    "test:all": "npm run wdio"
}
```

---

## Definition of Done

A generated mobile testcase is considered complete when:
- Acceptance Criteria has been mapped to Given/When/Then internally, 
  with each "Then" covered by a distinct assertion.
- Existing specs/page objects were searched FIRST; new AC only created 
  new/modified `it()` blocks, no unrelated tests were touched, and 
  removed criteria were marked `it.skip()` with an obsolete comment 
  rather than deleted.
- Every Page Object extends `BasePage`, and no locator or interaction 
  method duplicates one that already exists.
- Test names follow `should_<expectedBehavior>_when_<condition>`.
- The script uses `mobile: clearApp` to guarantee complete execution isolation.
- Native system popups are bypassed via backend commands rather than relying on UI clicks.
- The Page Object Model is strictly enforced.
- The test does not contain hardcoded `browser.pause()` syncing.
- Running the script produces a passing standalone Allure HTML report.
- Test data is sourced from `test/data/<feature>.data.json` (or `.js` 
  only when computation is required) — no hardcoded literals in spec 
  files, no credentials outside `.env`.
- Dropdowns and date pickers use reusable `BasePage` methods 
  (`selectDropdownOption`, `selectCalendarDate`) with explicit values — 
  no arbitrary/guessed selections.

---

## Action Logging (Visibility & Traceability)

Automated mobile tests can be slow. To provide visibility into the test execution flow, **all interactive Page Object methods must emit console logs**.

**Rule:** Do not scatter `console.log()` blindly throughout tests. Instead, rely on the unified `log(message)` method provided in `BasePage`.

- `BasePage` methods like `waitAndTap()` and `clearAndType()` already invoke `this.log()` internally. Always provide the optional `elementName` parameter so the logs are readable.
  - *Correct:* `await this.waitAndTap(this.btnSubmit, 'Submit Button');`
  - *Incorrect:* `await this.waitAndTap(this.btnSubmit);`
- For complex, multi-step actions within a Page Object (like `login()`), use `this.log('Message')` to narrate the flow.
  - *Example:* `this.log('Starting Login Flow...');`
- NEVER log passwords or sensitive tokens. The `BasePage.clearAndType` method automatically redacts inputs if the `elementName` contains the word "password".