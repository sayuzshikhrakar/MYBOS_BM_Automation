const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const BuildingData = require('../data/building.data.json');
const AuthHelper = require('../utils/auth.helper');

describe('Dashboard Exploratory Tests', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
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

    it('Should switch the QA automation designated building', async () => {
        await DashboardPage.selectBuilding(BuildingData.buildingName);
        await browser.pause(2000);
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
    });
});
