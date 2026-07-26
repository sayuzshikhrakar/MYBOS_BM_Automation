const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
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
            (() => {
                const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
                return require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
            })();
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
            await driver.back().catch(() => { });
            await browser.pause(1000);
        }

        // Wait for the app state to settle and check if we are logged in or redirected to login
        let isLoggedIn = false;
        for (let i = 0; i < 8; i++) { // Increased loop count to 8 to give slower emulators more time
            // Check for and dismiss permission popup if it appears
            await LoginPage.dismissPermissionPopup(500); // Short timeout so it doesn't block the loop

            const hasEmail = await LoginPage.inputEmail.isDisplayed().catch(() => false);
            const hasHome = await DashboardPage.tabHome.isDisplayed().catch(() => false);

            if (hasEmail) {
                isLoggedIn = false;
                break;
            }
            if (hasHome) {
                isLoggedIn = true;
                break;
            }
            await browser.pause(1000);
        }

        if (!isLoggedIn) {
            try {
                // Wait for login screen to load and log in
                await LoginPage.inputEmail.waitForDisplayed({ timeout: 25000 });
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
}

module.exports = new AuthHelper();
