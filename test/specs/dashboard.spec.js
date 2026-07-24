const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
<<<<<<< HEAD
const AuthHelper = require('../utils/auth.helper');
const buildingData = require('../data/building.information.json');

describe('Dashboard Exploratory Tests', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
=======
const WelcomePage = require('../pageobjects/welcome.page');
const BuildingData = require('../data/building.data.json');
const BasePage = require('../pageobjects/base.page');

describe('Dashboard Exploratory Tests', () => {
    beforeEach(async () => {
        // Authenticate before running dashboard tests
        const username = process.env.TEST_USER || 'sayuz.shikhrakar+james@ebpearls.com';
        const password = process.env.TEST_PASS || 'asdfasdf';

        await driver.switchContext('NATIVE_APP');

        // Grant notification permissions via ADB to suppress the flaky system popup
        try {
            const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
            require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
        } catch (e) {
            console.log('Note: ADB permission grant failed, popup might appear.');
        }

        // Handle Welcome Page if app was launched/reset
        if (await WelcomePage.isWelcomePageDisplayed()) {
            await WelcomePage.clickSignIn();
            await LoginPage.inputEmail.waitForDisplayed({ timeout: 15000 });
        }

        // Dismiss any left-over popup menus or overlays
        const isPopupOpen = await $('~Dismiss menu').isDisplayed().catch(() => false);
        if (isPopupOpen) {
            await driver.back().catch(() => { });
            await browser.pause(1000);
        }

        // Go back to the dashboard if we are nested in subpages
        for (let i = 0; i < 3; i++) {
            const onDashboard = await DashboardPage.tabHome.isDisplayed().catch(() => false);
            if (onDashboard) break;
            const onLogin = await LoginPage.inputEmail.isDisplayed().catch(() => false);
            if (onLogin) break;
            await driver.back().catch(() => { });
            await browser.pause(1000);
        }

        // Check if logged in
        const hasHome = await DashboardPage.tabHome.isDisplayed().catch(() => false);
        if (!hasHome) {
            try {
                await LoginPage.login(username, password);
                await DashboardPage.waitForHome();
            } catch (e) {
                const source = await driver.getPageSource();
                require('fs').writeFileSync('login_stuck_source.xml', source);
                throw new Error(`Failed to login. UI dumped to login_stuck_source.xml: ${e.message}`);
            }
        }

        await browser.pause(2000); // Give widgets a moment to render
>>>>>>> 1ba5ac1 (refactoring code)
    });

    it('Should validate Navigation Tabs', async () => {
        await DashboardPage.tabHome.waitForDisplayed({ timeout: 15000 });
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabCases.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabInspections.isDisplayed()).toBe(true);
        expect(await DashboardPage.tabMore.isDisplayed()).toBe(true);
    });

    it('Should render Dashboard Data Widgets', async () => {
        await DashboardPage.widgetResidents.waitForDisplayed({ timeout: 15000 });
        expect(await DashboardPage.widgetResidents.isDisplayed()).toBe(true);
    });

    it('Should open the Hamburger Menu', async () => {
        await DashboardPage.btnHamburger.waitForDisplayed({ timeout: 15000 });
        await DashboardPage.btnHamburger.click();
        await browser.pause(2000);
        await driver.back();
        await browser.pause(1000);
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
    });

<<<<<<< HEAD
    it('Should switch building to QA Building', async () => {
        // Click the Hamburger menu to open sidebar
        await DashboardPage.btnHamburger.click();
        await browser.pause(2000);

        require('fs').writeFileSync('sidebar.xml', await driver.getPageSource());

        // Click on the down arrow button to open building list
        await DashboardPage.btnBuildingDropdown.click();
        await browser.pause(1000);

        // Switch to building using name from JSON
        const buildingName = buildingData.buildingName;
        await DashboardPage.buildingOption(buildingName).click();
        await browser.pause(2000);

        // Verify we are back on the dashboard (e.g., Home tab is displayed)
=======
    it('Should switch the QA automation designated building', async () => {
        await DashboardPage.selectBuilding(BuildingData.buildingName);
        await browser.pause(2000);
>>>>>>> 1ba5ac1 (refactoring code)
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
    });
});
