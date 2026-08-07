---
name: appium-webdriverio-testcase
description: >
  QA automation: writing Appium + WebdriverIO tests for mobile applications.
  Use this skill when generating test cases, page objects, or extending mobile automation suites.
  Contains strict guidelines for locator strategies, state management, and handling mobile-specific OS overlays.
user-invocable: false
version: 1.1.0
---

# Appium Testcase Authoring

> This skill file serves as the Standard Operating Procedure (SOP) for authoring stable and maintainable mobile automated tests using Appium and WebdriverIO in this project (`MYBOS_BM_Automation`).

---

## Framework Context & Architecture

| Component | Convention |
| --- | --- |
| Architecture | Page Object Model (POM) |
| Test Runner | WebdriverIO |
| App Package | `com.mybosapps.bmapp.stg` |
| Spec Files | `test/specs/**/*.spec.js` |
| Page Objects | `test/pageobjects/**/*.page.js` |
| Test Utilities | `test/utils/**/*.js` (`auth.helper.js`, `utils.js`) |
| Test Data | `test/data/**/*.data.json` |
| Reporting | Standalone Allure HTML |

- **Strict Separation of Concerns:** Spec files (`.spec.js`) should ONLY contain test logic and assertions. All locators (`$()`, `$$()`) and interaction methods MUST be encapsulated within Page Object files (`.page.js`).
- **Reusable Utilities:** Authentication lifecycle (`AuthHelper`) and field verification helpers (`Utils`) belong in `test/utils/`.

---

## Parsing Acceptance Criteria (Internal Reasoning Only)

Before writing any code, mentally break the Acceptance Criteria into Given / When / Then — this is a THINKING step, not an output format. This project does NOT use Cucumber/Gherkin syntax. Do not create `.feature` files or `Given()`/`When()`/`Then()` step definitions.

Mapping rule:
- "Given" → setup/preconditions → goes in `beforeEach()` or start of the `it()` block (e.g. `await AuthHelper.ensureLoggedIn()`)
- "When" → user action → calls Page Object methods (e.g. `await loginPage.login(...)`)
- "Then" → expected outcome → becomes a WebdriverIO assertion (e.g. `await expect(dashboardPage.tabHome).toBeDisplayed()`)

Each distinct scenario (happy path, edge case, negative case) from the AC becomes ONE `it()` block inside a `describe()` block, written in standard Mocha/WebdriverIO syntax:

```javascript
describe('Login Feature', () => {
    it('should_navigate_to_dashboard_when_valid_credentials_entered', async () => {
        // Given
        await loginPage.open();
        // When
        await loginPage.login('user@test.com', 'validPass123');
        // Then
        await expect(dashboardPage.tabHome).toBeDisplayed();
    });
});
```

---

## Handling Acceptance Criteria Changes (Existing Features)

Before writing any new file, ALWAYS check if a spec or page object for this feature already exists.

**Step 1 — Search first:**
Look in `test/specs/**/*.spec.js` and `test/pageobjects/**/*.page.js` for a file matching the feature name (e.g. "Residents" → `residents.spec.js`, `residents.page.js`). Do NOT assume the feature is new.

**Step 2 — If an existing file is found, diff the new AC against it:**
- **New scenario/criteria** → ADD a new `it()` block. Reuse existing Page Object locators/methods wherever they already cover the needed element or action — do not redefine them.
- **Changed scenario/criteria** → MODIFY only the specific `it()` block and/or Page Object method affected. Leave all unrelated tests and methods untouched.
- **Removed scenario/criteria** → Do NOT delete the test. Mark it obsolete instead:
```javascript
  it.skip('should_X_when_Y — OBSOLETE: removed per AC update 2026-07', async () => {
      ...
  });
```
  This preserves history and avoids silently losing coverage.

**Step 3 — Locator reuse check:**
Before adding any new `get locatorName()` to a Page Object, scan that file (and `BasePage`) for an existing locator/method that already does the job. Never create a duplicate locator for the same element.

**Step 4 — If no existing file is found:**
Proceed as a new feature, following the standard structure defined throughout this SOP.

---

## Test Data Sourcing

If the Acceptance Criteria does not include concrete test data values (emails, passwords, names, IDs), do NOT invent realistic-looking fake data silently. Instead:
1. Ask the user to supply real/valid test data, OR
2. If instructed to proceed without it, generate obvious placeholder values (e.g. `PLACEHOLDER_EMAIL`, `PLACEHOLDER_PASSWORD`) and flag them clearly in a comment so they are never mistaken for real data.

**File Format:**
- Use `test/data/<feature>.data.json` for static literal values (names, dropdown options, dates, expected messages).
- Use `test/data/<feature>.data.js` ONLY when the data requires computation (e.g. relative dates like "tomorrow", dynamically generated IDs). JSON cannot contain expressions or functions.
- NEVER put passwords, tokens, or credentials in `.json` or `.js` fixture files — these belong in `.env` or environment variables (e.g. `process.env.TEST_USER`, `process.env.TEST_PASS`).

**Loading JSON data in a spec:**
```javascript
const residentsData = require('../data/residents.data.json');
```

---

## Locator Strategy & Priority Order

The application uses a hybrid architecture (Flutter + WebView). Mobile UI trees are deep and contain custom widget hierarchies.

### 1. Primary: Accessibility ID
This is the most performant, cross-platform, and stable locator. It maps to `content-desc` on Android and `accessibilityIdentifier` on iOS.
```javascript
// Preferred approach
get tabHome() { return $('~Home'); } 
```

### 2. Secondary: Resource ID / Name
Used for WebView elements or OS controls with explicit IDs.
```javascript
get inputEmail() { return $('//*[@resource-id="email"]'); }
get inputPassword() { return $('//*[@resource-id="current-password"]'); }
```

### 3. Flutter Content-Desc & Multiline Text Matching
In Flutter views, descriptions often contain newlines (`\n`) or dynamic multi-line text blocks.
```javascript
// Match Flutter elements containing newlines
get listResidents() { return $$('//android.view.View[contains(@content-desc, "' + "\n" + '")]'); }

// Index-based dynamic element targeting for lists
getResident(index) {
    return $(`(//android.view.View[contains(@content-desc, "` + "\n" + `")])[${index + 1}]`);
}
```

### 4. UIAutomator / UiSelector Fallback
For Android UI elements without direct ID or text attributes:
```javascript
get textWelcomeHeader() {
    return $('android=new UiSelector().description("Welcome to MYBOS!")');
}
```

---

## App State Management & Test Isolation

Mobile automation requires careful state management to avoid test flakiness and excessive run times. This framework supports two explicit isolation modes:

### Strategy A: Full Fresh Session Isolation (Authentication / Clean State Specs)
For authentication tests (`login.spec.js`), reset the app state before each test case using Appium's native `clearApp` command:

```javascript
beforeEach(async () => {
    const appId = 'com.mybosapps.bmapp.stg';
    await driver.execute('mobile: clearApp', { appId });
    
    // Grant permissions via ADB to suppress flaky OS overlays
    try {
        const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'emulator-5554';
        require('child_process').execSync(`adb -s ${activeUdid} shell pm grant ${appId} android.permission.POST_NOTIFICATIONS`);
    } catch (e) { }
    
    await driver.activateApp(appId);
});
```

### Strategy B: Authenticated Session & Building Context Isolation (Feature Specs)
For feature specs (`dashboard.spec.js`, `residents.spec.js`, `contractors.spec.js`), re-logging in before every test is inefficient. Use `AuthHelper.ensureLoggedIn(targetBuilding)` in `beforeEach()`.

```javascript
const AuthHelper = require('../utils/auth.helper');
const BuildingData = require('../data/building.data.json');

describe('Residents Feature', () => {
    beforeEach(async () => {
        // Ensures active session, handles JWT token recovery, and switches to target building
        await AuthHelper.ensureLoggedIn(BuildingData.buildingName);
    });
});
```

`AuthHelper.ensureLoggedIn()` guarantees:
1. The app is launched and switched to `NATIVE_APP` context.
2. Notification permissions are granted via ADB.
3. Subpage back-navigation is handled safely to prevent app termination.
4. JWT token error dialogs (`isTokenInvalid()`) trigger automatic session recovery.
5. The designated target building (`QA Automation`) is selected.

---

## Handling System Overlays (Android Permissions)

Sensitive system dialogs (like Notification popups) must be handled cleanly to prevent blocking touch events.

**Primary Solution (ADB Grant):** Grant permissions natively via ADB before or after app launch:
```javascript
const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'emulator-5554';
require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
```

**Secondary Solution (UI Popup Dismissal):** If the permission dialog still appears on screen, use the `BasePage.dismissPermissionPopup()` helper, which executes raw W3C touch actions to tap the "ALLOW" button safely.

```javascript
await LoginPage.dismissPermissionPopup(5000);
```

---

## Page Object & Helper Best Practices

### Base Page Class (`test/pageobjects/base.page.js`)
Every Page Object MUST extend `BasePage`. Reusable interaction methods belong in `BasePage`:

```javascript
const BasePage = require('./base.page');

class ResidentsPage extends BasePage {
    get inputSearch() { return $('//android.widget.EditText'); }
}
module.exports = new ResidentsPage();
```

Key `BasePage` methods:
- `waitAndTap(selector, elementName, timeout)`: Waits for display, logs action, and taps element.
- `clearAndType(selector, value, elementName, timeout)`: Clears input and types value (automatically redacts password logs).
- `selectDropdownOption(dropdownSelector, optionText, dropdownName)`: Taps dropdown and selects option matching text.
- `log(message)`: Outputs colored console log and attaches step to Allure report via `allureReporter.addStep('[ACTION] ...')`.
- `dismissPermissionPopup(timeout)`: W3C touch-action fallback for permission popups.

### Verification Utility (`test/utils/utils.js`)
Use `Utils.verifyFieldVisible(expectedValue, fieldLabel, maxScrolls)` for asserting fields on detail screens with automatic W3C pointer scrolling:

```javascript
const Utils = require('../utils/utils');

// Verifies field presence and smoothly scrolls down if off-screen
await Utils.verifyFieldVisible(residentsData.residentName, 'Resident Name');
```

---

## Explicit Waits over Hard Pauses

Never use `browser.pause()` for syncing element display states. Always use explicit waits:

```javascript
// CORRECT
await this.tabHome.waitForDisplayed({ timeout: 15000 });

// INCORRECT (Avoid for element syncing)
await browser.pause(5000); 
```
*(Short `browser.pause(500-1000)` is acceptable only for visual animation settle after screen transitions).*

---

## NPM Script Naming & Suite Execution

Never use spaces in custom npm script names. Use `--suite` and `SUITE_NAME` environment variables in `package.json`:

```json
"scripts": {
    "clear-app": "adb shell pm clear com.mybosapps.bmapp.stg",
    "test": "npm run test:regression",
    "prewdio": "npm run clear-app",
    "wdio": "wdio run wdio.conf.js",
    "test:regression": "SUITE_NAME=RegressionTest wdio run wdio.conf.js --suite regression",
    "test:login": "SUITE_NAME=LoginTest wdio run wdio.conf.js --suite login",
    "test:dashboard": "SUITE_NAME=DashboardTest wdio run wdio.conf.js --suite dashboard",
    "test:residents": "SUITE_NAME=ResidentsTest wdio run wdio.conf.js --suite residents",
    "test:contractors": "SUITE_NAME=ContractorsTest wdio run wdio.conf.js --suite contractors",
    "report": "allure generate allure-results --clean --single-file -o allure-report",
    "allure:open": "allure open allure-report"
}
```

Running tests via suite scripts automatically generates a single-file Allure HTML report in `allure-report/` with a custom timestamped filename (e.g. `ResidentsTest_Report_2026-08-07_10-15-00.html`).

---

## Action Logging & Traceability

To provide visibility during test runs and in Allure reports, interactive Page Object methods and assertions must emit logged steps:

- `BasePage.log()` emits `[ACTION] <message>` and adds an Allure step.
- `Utils.log()` emits `[VERIFY] <message>` and adds an Allure step.
- Pass explicit `elementName` parameters to `waitAndTap()` and `clearAndType()` so logs are human-readable.
- Passwords are automatically redacted (`********`) in log outputs.

---

## Definition of Done

A generated mobile testcase is considered complete when:
- Acceptance Criteria has been mapped to Given/When/Then internally, with each "Then" covered by a distinct assertion.
- Existing specs/page objects were searched FIRST; new AC only created new/modified `it()` blocks without touching unrelated tests.
- Every Page Object extends `BasePage`, and helper logic reuses `BasePage`, `AuthHelper`, or `Utils`.
- Test names follow `should_<expectedBehavior>_when_<condition>`.
- Appropriate isolation strategy is used: `mobile: clearApp` for fresh auth specs, or `AuthHelper.ensureLoggedIn()` for feature specs.
- Dynamic UDID resolution is used for ADB commands (`driver.capabilities['appium:udid']`).
- Page Object Model is strictly enforced (no raw `$()` calls in spec files).
- Explicit waits (`waitForDisplayed`) are used instead of arbitrary pauses.
- Test data is sourced from `test/data/<feature>.data.json` and credentials come from `.env` variables (`TEST_USER`, `TEST_PASS`).
- Running the script produces a passing standalone single-file Allure HTML report.