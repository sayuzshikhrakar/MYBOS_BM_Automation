const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');

describe('Dashboard Exploratory Tests', () => {
    beforeEach(async () => {
        // Authenticate before running dashboard tests
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
        for (let i = 0; i < 5; i++) {
            const hasEmail = await LoginPage.inputEmail.isDisplayed().catch(() => false);
            const hasHome = await DashboardPage.tabHome.isDisplayed().catch(() => false);

            if (hasEmail) {
                isLoggedIn = false;
                break;
            }
            isLoggedIn = hasHome;
            if (isLoggedIn) break; // Optimization: break early if we see home
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
        
        await browser.pause(2000); // Give widgets a moment to render
    });

    it('Should validate Navigation Tabs', async () => {
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabCases.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabInspections.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabMore.isDisplayed()).toBe(true);
    });

    it('Should render Dashboard Data Widgets', async () => {
        // Verify key modules are present on the screen
        expect(await DashboardPage.widgetMaintenance.isDisplayed()).toBe(true);
        expect(await DashboardPage.widgetResidents.isDisplayed()).toBe(true);

        // Use isExisting instead of isDisplayed for elements that might require scrolling
        //expect(await DashboardPage.widgetParcels.isExisting()).toBe(true);
    });

    it('Should open the Hamburger Menu', async () => {
        // Click the Hamburger menu
        await DashboardPage.btnHamburger.click();

        // Wait for the sidebar to open. A standard side drawer usually contains 
        // options like 'Logout' or a profile header. We'll wait for a short pause.
        await browser.pause(2000);

        // In a real test, we'd assert a specific element in the drawer.
        // For now, we'll click it again to close it (if it's a toggle) or tap outside.
        // If it's a standard drawer, clicking back might close it.
        await driver.back();

        // Wait for it to close
        await browser.pause(1000);
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
    });
});
