> [!IMPORTANT]
> This guide is a ONE-TIME project bootstrap only. Boilerplate examples in 
> Sections 6–8 are for verifying your setup works — they are NOT the 
> authoring standard. Once setup is verified, all actual test/page-object 
> creation must follow APPIUM_SKILL.md, including BasePage inheritance, 
> AC-change handling, and naming conventions — even if it means rewriting 
> the boilerplate examples below.

# Appium + WebdriverIO Hybrid Automation Setup Guide

This guide will allow you to quickly bootstrap a robust, enterprise-grade test automation project for Hybrid Mobile Apps (Flutter + WebView). It is designed so that a new colleague can run these steps in an empty root folder and have a fully functioning testing framework in minutes.

## 1. Project Initialization & Dependencies

Open your terminal in an empty directory and run the following block to initialize the project, install all necessary dependencies, and create the required folder structure:

```bash
# 1. Initialize a new Node project
npm init -y

# 2. Install WebdriverIO, Appium Driver, and Allure Reporting
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter webdriverio appium-uiautomator2-driver @wdio/allure-reporter allure-commandline @wdio/appium-service

# 3. Create the Page Object Model (POM) directory structure
mkdir -p test/specs test/pageobjects test/config
```

## 2. Environment Capabilities (`capabilities.json`)

Create a `capabilities.json` file in the root directory. This explicitly maps your target environment parameters, keeping your configuration reusable and making it easier for IDE MCP tools to connect.

```json
{
    "android": {
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": "Emulator",
        "appium:udid": "127.0.0.1:6555",
        // ⚠️ CRITICAL: Replace these placeholders with your actual app package and main activity before running tests!
        "appium:appPackage": "<YOUR_APP_PACKAGE>",
        "appium:appActivity": "<YOUR_MAIN_ACTIVITY>",
        "appium:newCommandTimeout": 240
    }
}
```

## 3. IDE Appium MCP Integration (`mcp_config.json`)

To let your AI IDE (like Antigravity) inspect the live UI hierarchy of your app and write locators automatically, configure your IDE's MCP server. 

> [!WARNING]  
> The current `@gavrix/appium-mcp@latest` package contains a bug in `pressHomeButton.js` that crashes the MCP server on startup. Until this is fixed upstream, you must install it globally and patch it.

**Step 1: Install and Patch Globally**
1. Run `npm i -g @gavrix/appium-mcp`
2. Open the globally installed file (e.g., `~/.nvm/versions/node/v24.16.0/lib/node_modules/@gavrix/appium-mcp/tools/pressHomeButton.js`)
3. Change `const schema = z.object({});` to `const schema = {};` and save.

**Step 2: Configure `mcp_config.json`**
Open your `mcp_config.json` (typically at `~/.gemini/config/mcp_config.json`) and configure it to point to your *patched* global installation:

```json
{
    "mcpServers": {
        "appium-mcp": {
            "command": "node",
            "args": [
                // Make sure to replace this with your actual absolute path to the global node_modules
                "<YOUR_HOME_DIRECTORY>/.nvm/versions/node/<YOUR_NODE_VERSION>/lib/node_modules/@gavrix/appium-mcp/server.js"
            ],
            "env": {
                // replace these as needed
                "ANDROID_HOME": "<YOUR_HOME_DIRECTORY>/Android/Sdk",
                "CAPABILITIES_CONFIG": "<YOUR_PROJECT_PATH>/capabilities.json"
            }
        }
    }
}
```

## 4. Configure `package.json` Scripts

Update your `package.json` to include the execution and reporting scripts. Add the following to the `"scripts"` block:

```json
  "scripts": {
    "clear-app": "adb shell pm clear <YOUR_APP_PACKAGE>",
    "test": "npm run wdio",
    "prewdio": "npm run clear-app",
    "wdio": "wdio run wdio.conf.js",
    "report": "allure generate allure-results --clean --single-file -o allure-report",
    "allure:open": "allure open allure-report"
  }
```

> [!IMPORTANT]  
> `prewdio`/`clear-app` is a ONE-TIME pre-suite safety net only — it guarantees 
> a clean device before the very first test starts (useful in CI where the 
> emulator may have leftover state from a previous job). **It is NOT your 
> per-test isolation strategy.** Per-test isolation is handled by 
> `mobile: clearApp` inside `beforeEach()` — see APPIUM_SKILL.md, "App State 
> Management & Test Isolation." Every individual test resets itself; this 
> npm script just covers you before test #1 runs.

## 5. WebdriverIO Configuration (`wdio.conf.js`)

Create a `wdio.conf.js` file in the root directory. This configuration connects to your local Appium server, dynamically injects the `capabilities.json` we created, and handles Allure report generation and cleanup automatically.

```javascript
exports.config = {
    // =====================
    // Appium Setup
    // =====================
    // We assume Appium is managed automatically by @wdio/appium-service
    port: 4723,
    services: [
        ['appium', {
            args: {
                allowInsecure: 'uiautomator2:chromedriver_autodownload'
            },
            logPath: './'
        }]
    ],
    
    // ============
    // Capabilities
    // ============
capabilities: [{
        maxInstances: 1, // Prevent multiple instances from crashing on physical devices
        ...require('./capabilities.json').android,
        // noReset:true is required here — per-test cleanup is handled explicitly
        // via `mobile: clearApp` in each spec's beforeEach() (see APPIUM_SKILL.md).
        // If Appium force-reinstalls/resets on every session instead, that hook won't matter.
        'appium:noReset': true
    }],
    
    // ==================
    // Global Timeouts
    // ==================
    waitforTimeout: 15000, // Prevents tests from failing instantly on slow loads

    // ==================
    // Framework
    // ==================
    framework: 'mocha',
    mochaOpts: {
        timeout: 60000 // IMPORTANT: Must be higher than waitforTimeout so tests don't prematurely crash
    },
    
    // ==================
    // Specify Test Files
    // ==================
    specs: [
        './test/specs/**/*.js'
    ],
    
    // ==================
    // Reporting
    // ==================
    reporters: ['spec', ['allure', {
        outputDir: 'allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
    }]],

    // ===================
    // Hooks
    // ===================
    onPrepare: function (config, capabilities) {
        // Automatically delete previous allure reports before a run
        const fs = require('fs');
        fs.rmSync('allure-results', { recursive: true, force: true });
        fs.rmSync('allure-report', { recursive: true, force: true });
    },

    onComplete: function(exitCode, config, capabilities, results) {
        // Automatically generate and open the allure HTML report after tests complete
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        try {
            console.log('Generating Allure Report...');
            execSync('npx allure generate allure-results --clean --single-file -o allure-report');
            
            // Rename index.html to include timestamp
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
            const oldPath = path.join('allure-report', 'index.html');
            const newName = `TestReport_${timestamp}.html`;
            const newPath = path.join('allure-report', newName);
            
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`Test completed! Standalone report generated at: allure-report/${newName}`);
                
                // Open the report in the default browser
                const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
                try {
                    execSync(`${openCmd} "${newPath}"`);
                } catch (e) {
                    console.error('Could not automatically open the report.');
                }
            }
        } catch (error) {
            console.error('Failed to generate Allure report:', error.message);
        }
    }
};
```

## 6. Writing Your First Native Test

> [!WARNING]  
> The code below is strictly a boilerplate example! It assumes your application has elements with the accessibility IDs `~Home` and `~Cases`. If your app does not have these elements, the test will fail instantly. **Please update the locators to match your application.**

> [!TIP]
> **Best Practices Discovered:**
> 1. Always use `await element.clearValue()` before entering text to prevent previous test runs from appending text if state was retained.
> 2. Avoid using `await driver.hideKeyboard()` unless absolutely necessary, as it can cause `Mocha Timeout` crashes on certain Android Emulators. Often, Appium can click buttons underneath the keyboard just fine!
> 3. Text locators require exact string matches (e.g. `//*[@text="Error message."]` will fail if you miss the period at the end).
> 4. **Flutter Apps:** For UiAutomator2 to see Flutter widgets as native Accessibility IDs (`~id`), wrap the widget in a `Semantics(identifier: 'id')` or use the `key` property.

## 6.1 Page Object Model (POM) Setup

Instead of hardcoding locators into your tests, create Page Objects to keep 
your code reusable. Every Page Object extends a shared `BasePage` — this is 
required from day one, not something you retrofit later.

First, create `test/pageobjects/base.page.js`:

```javascript
class BasePage {
  async waitAndTap(selector, timeout = 15000) {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    await el.click();
  }
}

module.exports = BasePage;
```

Then create `test/pageobjects/dashboard.page.js`, extending it:

```javascript
const BasePage = require('./base.page');

class DashboardPage extends BasePage {
    get homeTab () { return $('~Home'); }
    get casesIcon () { return $('~Cases'); }

    async waitForHome() {
        await this.homeTab.waitForDisplayed({ timeout: 15000 });
    }
}

module.exports = new DashboardPage();
```

> [!TIP]
> All future Page Objects for this project follow this same pattern — extend 
> `BasePage`, and check it first for reusable methods (`waitAndTap`, etc.) 
> before writing new ones. See APPIUM_SKILL.md, "Base Page Class (OOP 
> Foundation)."


## 6.2 Writing Your First Native Test

Since your app is fully native and you are already logged in to the dashboard, here is the boiler plate for asserting the native UI elements inside a spec file (`test/specs/example.spec.js`) using the POM:

```javascript
const DashboardPage = require('../pageobjects/dashboard.page');

describe('Native Dashboard Flow', () => {
    it('Should assert Native Dashboard elements', async () => {
        
        // Ensure we are in the NATIVE_APP context for Native elements
        await driver.switchContext('NATIVE_APP');
        
        // Wait for the Home tab to display
        await DashboardPage.waitForHome();
        expect(await DashboardPage.homeTab.isDisplayed()).toBe(true);

        // Check if "Cases" is displayed
        expect(await DashboardPage.casesIcon.isDisplayed()).toBe(true);
    });
});
```

## 7. WebView Context Switching (Hybrid Apps)

If your app uses WebViews (e.g., embedded browser, Cordova, or Flutter WebView), you must switch Appium's context from `NATIVE_APP` to the `WEBVIEW` context to interact with HTML elements using standard web locators (like CSS selectors).

Create an example test `test/specs/webview.spec.js`:

```javascript
describe('Hybrid WebView Flow', () => {
    it('Should interact with WebView elements', async () => {
        // 1. Wait for WebView to load in the app
        await browser.pause(5000); 

        // 2. Get all available contexts
        const contexts = await driver.getContexts();
        console.log('Available Contexts:', contexts);
        
        // 3. Find and switch to the WebView context
        const webviewContext = contexts.find(context => context.includes('WEBVIEW'));
        if (!webviewContext) {
            throw new Error('WebView context not found! Make sure setWebContentsDebuggingEnabled(true) is set in your app.');
        }
        await driver.switchContext(webviewContext);

        // 4. Now you can use standard web locators!
        const webElement = await $('.my-web-class');
        expect(await webElement.isDisplayed()).toBe(true);

        // 5. Switch back to native when done
        await driver.switchContext('NATIVE_APP');
    });
});
```

## 8. Alternative UI Discovery (The XML Dump Script)

If the Appium MCP server is flaky or crashes, you can manually grab the locators of your app screen using this simple WebdriverIO script. Create a file `test/specs/dump.spec.js`:

```javascript
describe('UI Dump', () => {
    it('Should dump the UI hierarchy', async () => {
        await driver.switchContext('NATIVE_APP');
        await browser.pause(5000); // Wait for app to settle
        const source = await driver.getPageSource();
        require('fs').writeFileSync('page_source.xml', source);
    });
});
```

Run this script to generate `page_source.xml` in your project root, which you can provide to the AI assistant to easily discover locators without needing manual inspection!

## 9. Execution

1. Start your Android Emulator.
2. Ensure you have updated `capabilities.json` with your actual `<YOUR_APP_PACKAGE>` and `<YOUR_MAIN_ACTIVITY>`.
3. Run the tests!

```bash
npm run wdio
```

The WebdriverIO Appium Service will automatically start the server, the tests will execute, old reports will be cleared, and a standalone single-file HTML report (with a timestamped filename) will be generated in the `allure-report` folder. You can open this file directly in any browser and share it with stakeholders!

## 10. CI/CD Integration (GitHub Actions)

To run your tests headlessly in a CI environment like GitHub Actions, create a workflow file at `.github/workflows/appium.yml`:

```yaml
name: Appium Tests

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Run Appium Tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 29
          target: default
          arch: x86
          profile: Nexus 6
          script: npm run wdio
```
