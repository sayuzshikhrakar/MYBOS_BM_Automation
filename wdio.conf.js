const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let defaultCaps = require('./capabilities.json').android;

const localCapsPath = path.join(__dirname, 'capabilities.local.json');
if (fs.existsSync(localCapsPath)) {
    try {
        const localCaps = require(localCapsPath).android;
        defaultCaps = { ...defaultCaps, ...localCaps };
    } catch (e) {
        console.warn(`Warning: Failed to load capabilities.local.json: ${e.message}`);
    }
}

let targetUdid = defaultCaps['appium:udid'];

try {
    const devicesOutput = execSync('adb devices').toString();
    const lines = devicesOutput.split('\n');
    let defaultDeviceFound = false;
    let fallbackDevice = null;

    for (const line of lines) {
        if (line.trim() === '' || line.includes('List of devices')) continue;
        const [udid, state] = line.split('\t');
        if (state && state.trim() === 'device') {
            if (udid === targetUdid) {
                defaultDeviceFound = true;
                break;
            } else if (!fallbackDevice) {
                fallbackDevice = udid; // Grab the first available alternative device
            }
        }
    }

    if (!defaultDeviceFound && fallbackDevice) {
        console.log(`Default device ${targetUdid} not found. Falling back to emulator: ${fallbackDevice}`);
        targetUdid = fallbackDevice;
    } else if (!defaultDeviceFound && !fallbackDevice) {
        console.warn(`Warning: No connected devices found. Tests will likely fail.`);
    }
} catch (e) {
    console.error('Failed to check adb devices:', e.message);
}

exports.config = {
    // =====================
    // Appium Setup
    // =====================
    // We assume Appium is managed automatically by @wdio/appium-service
    port: 4723,
    logLevel: 'warn', // Reduces the noisy webdriver HTTP logs so we can see our custom action logs
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
        ...defaultCaps,
        'appium:udid': targetUdid,
        'appium:noReset': true // Keep session state between tests
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
        timeout: 120000 // Increased to 120s to accommodate fresh logins after app cache is cleared
    },

    // ==================
    // Execution Controls
    // ==================
    specFileRetries: 1,
    bail: 0,

    // ==================
    // Specify Test Files & Suites
    // ==================
    specs: [
        './test/specs/**/*.js'
    ],
    suites: {
        regression: [
            './test/specs/login.spec.js',
            './test/specs/dashboard.spec.js',
            './test/specs/residents.spec.js',
            './test/specs/contractors.spec.js'
        ],
        smoke: [
            './test/specs/login.spec.js',
            './test/specs/dashboard.spec.js'
        ],
        sanity: [
            './test/specs/login.spec.js'
        ],
        login: [
            './test/specs/login.spec.js'
        ],
        dashboard: [
            './test/specs/dashboard.spec.js'
        ],
        residents: [
            './test/specs/residents.spec.js'
        ],
        contractors: [
            './test/specs/contractors.spec.js'
        ]
    },

    // ==================
    // Reporting
    // ==================
    reporters: [
        ['spec', {
            showConsoleLogs: true,
            realtimeReporting: true
        }],
        ['allure', {
            outputDir: 'allure-results',
            disableWebdriverStepsReporting: true,
            disableWebdriverScreenshotsReporting: false,
        }]
    ],

    // ===================
    // Hooks
    // ===================
    onPrepare: function (config, capabilities) {
        // Automatically delete previous allure reports and screenshots before a run
        const fs = require('fs');
        fs.rmSync('allure-results', { recursive: true, force: true });
        fs.rmSync('allure-report', { recursive: true, force: true });
        fs.rmSync('screenshots', { recursive: true, force: true });
    },

    afterTest: async function (test, context, { error, result, duration, passed, retries }) {
        if (!passed) {
            try {
                console.log(`Test "${test.title}" failed. Capturing failure screenshot...`);
                // Attach screenshot to Allure report
                await driver.takeScreenshot();

                // Also save screenshot to local ./screenshots folder
                const fs = require('fs');
                const path = require('path');
                const screenshotsDir = path.join(__dirname, 'screenshots');
                if (!fs.existsSync(screenshotsDir)) {
                    fs.mkdirSync(screenshotsDir, { recursive: true });
                }
                const sanitizedTitle = test.title.replace(/[^a-zA-Z0-9_-]/g, '_');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filePath = path.join(screenshotsDir, `${sanitizedTitle}_${timestamp}.png`);
                await driver.saveScreenshot(filePath);
                console.log(`Saved failure screenshot to: ${filePath}`);
            } catch (e) {
                console.error('Failed to capture failure screenshot:', e.message);
            }
        }
    },

    afterSession: function (config, capabilities, specs) {
        // Automatically clear app cache and data after tests complete
        try {
            const activeUdid = capabilities['appium:udid'] || capabilities.udid || capabilities.deviceUDID || targetUdid;
            const appId = capabilities['appium:appPackage'] || capabilities.appPackage || 'com.mybosapps.bmapp.stg';
            console.log(`Clearing app data & cache for ${appId}...`);
            execSync(`adb -s ${activeUdid} shell pm clear ${appId}`);
            console.log('App data & cache cleared successfully.');
        } catch (e) {
            console.log('Notice: Failed to clear app data: ' + e.message);
        }
    },

    onComplete: function (exitCode, config, capabilities, results) {
        // Automatically generate and open the allure HTML report after tests complete
        const { execSync, spawn } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        try {
            console.log('Generating Allure Report...');
            execSync('npx allure generate allure-results --clean --single-file -o allure-report');

            // Rename index.html to include timestamp and suite name prefix if present
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/[:.]/g, '-').slice(0, 19);
            const suitePrefix = process.env.SUITE_NAME || 'Test';
            const oldPath = path.join('allure-report', 'index.html');
            const newName = `${suitePrefix}_Report_${timestamp}.html`;
            const newPath = path.join('allure-report', newName);

            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`Test completed! Standalone report generated at: allure-report/${newName}`);

                // Open the report in a detached browser process so terminal exit or Ctrl+C won't close Firefox
                const openCmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
                const args = process.platform === 'win32' ? ['/c', 'start', '""', newPath] : [newPath];

                try {
                    const reportProcess = spawn(openCmd, args, {
                        detached: true,
                        stdio: 'ignore'
                    });
                    reportProcess.unref();
                } catch (e) {
                    console.error('Could not automatically open the report:', e.message);
                }
            }
        } catch (error) {
            console.error('Failed to generate Allure report:', error.message);
        }
    }
};
