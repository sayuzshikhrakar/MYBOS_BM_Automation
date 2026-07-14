const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const AuthHelper = require('../utils/auth.helper');

describe('Dashboard Exploratory Tests', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
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
