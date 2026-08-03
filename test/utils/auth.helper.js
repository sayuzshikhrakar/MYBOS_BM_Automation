const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const WelcomePage = require('../pageobjects/welcome.page');
const BuildingData = require('../data/building.data.json');

class AuthHelper {
    /**
     * Ensures the app is securely logged in, on the dashboard state, and switched to the target building (default: QA Automation).
     * Use this in the `beforeEach` block of any spec that requires an authenticated session and building context.
     */
    async ensureLoggedIn(targetBuilding = BuildingData.buildingName) {
        const username = process.env.TEST_USER || 'sayuz.shikhrakar+james@ebpearls.com';
        const password = process.env.TEST_PASS || 'asdfasdf';

        await driver.switchContext('NATIVE_APP');

        // Grant notification permissions via ADB to suppress the flaky system popup
        try {
            const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
            require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
            await driver.activateApp('com.mybosapps.bmapp.stg');
        } catch (e) {
            console.log('Note: ADB permission grant failed, popup might appear.');
        }

        // Wait 3 seconds for splash screen to settle
        await browser.pause(3000);

        // Go back to the dashboard if we are nested in subpages (avoids restarting app and crashing UiAutomator2)
        for (let i = 0; i < 3; i++) {
            const onDashboard = await DashboardPage.tabHome.isDisplayed().catch(() => false);
            if (onDashboard) break;
            const onLogin = await LoginPage.inputEmail.isDisplayed().catch(() => false);
            if (onLogin) break; // Don't press back on the login screen as it closes the app!
            const onWelcome = await WelcomePage.isWelcomePageDisplayed().catch(() => false);
            if (onWelcome) break;
            await driver.hideKeyboard().catch(() => { });
            await driver.back().catch(() => { });
            await browser.pause(1000);
        }

        // Check if the current screen exhibits an "Invalid JWT Token" error
        const isTokenError = await this.isTokenInvalid();
        if (isTokenError) {
            console.log('WARNING: Invalid JWT Token detected on active screen! Re-authenticating session...');
            try {
                const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
                require('child_process').execSync(`adb -s ${activeUdid} shell pm clear com.mybosapps.bmapp.stg`);
                await driver.activateApp('com.mybosapps.bmapp.stg');
            } catch (e) {
                await driver.terminateApp('com.mybosapps.bmapp.stg').catch(() => { });
                await driver.activateApp('com.mybosapps.bmapp.stg').catch(() => { });
            }
            await browser.pause(3000);
        }

        // Wait for the app state to settle and check if we are logged in or redirected to login
        let isLoggedIn = false;
        if (!isTokenError) {
            for (let i = 0; i < 8; i++) { // Increased loop count to 8 to give slower emulators more time
                // Check for and dismiss permission popup if it appears
                await LoginPage.dismissPermissionPopup(500); // Short timeout so it doesn't block the loop

                const hasEmail = await LoginPage.inputEmail.isDisplayed().catch(() => false);
                const hasHome = await DashboardPage.tabHome.isDisplayed().catch(() => false);
                const hasWelcome = await WelcomePage.isWelcomePageDisplayed().catch(() => false);

                if (hasEmail || hasWelcome) {
                    isLoggedIn = false;
                    break;
                }
                if (hasHome) {
                    isLoggedIn = true;
                    break;
                }
                await browser.pause(1000);
            }
        }

        if (!isLoggedIn) {
            try {
                await LoginPage.inputEmail.waitForDisplayed({ timeout: 25000 }).catch(() => { });
                await LoginPage.login(username, password);
                await DashboardPage.waitForHome();
            } catch (e) {
                const source = await driver.getPageSource();
                require('fs').writeFileSync('login_stuck_source.xml', source);
                throw new Error(`Failed to login. UI dumped to login_stuck_source.xml: ${e.message}`);
            }
        }

        await DashboardPage.waitForHome();

        // Automatically ensure the requested building (e.g. QA Automation) is selected
        if (targetBuilding) {
            await DashboardPage.selectBuilding(targetBuilding);
        }

        await browser.pause(1000); // Give widgets a moment to render
    }

    /**
     * Checks if the active UI exhibits an Invalid JWT Token banner or error text
     */
    async isTokenInvalid() {
        try {
            const tokenError = await $('//*[contains(@content-desc, "Invalid JWT Token") or contains(@text, "Invalid JWT Token") or contains(@content-desc, "JWT Token")]');
            return await tokenError.isDisplayed().catch(() => false);
        } catch (e) {
            return false;
        }
    }
}

module.exports = new AuthHelper();
