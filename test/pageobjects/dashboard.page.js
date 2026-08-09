const BasePage = require('./base.page');
const { execSync } = require('child_process');

class DashboardPage extends BasePage {
    // Navigation Tabs (Bottom Bar)
    get tabHome() { return $('~Home'); }
    get tabCases() { return $('~Cases'); }
    get tabInspections() { return $('~Inspections'); }
    get tabMore() { return $('~More'); }

    // Header Elements
    get btnHamburger() { return $('//android.view.View/android.widget.ImageView[1]'); }
    // Header Building Selector Text
    get btnBuildingSelector() {
        return $('//android.view.View[contains(@content-desc, "Kipps") or contains(@content-desc, "\n")]');
    }

    // Dynamic selector for building options inside the open dropdown menu
    getBuildingOption(buildingName) {
        return $(`//*[@content-desc[contains(., "${buildingName}")]]`);
    }

    // Dashboard Widgets
    get widgetMaintenance() { return $('~Maintenance Request'); }
    get widgetResidents() { return $('~Residents'); }
    get widgetParcels() { return $('~Parcels'); }
    get widgetContractors() { return $('~Contractors'); }
    get widgetLibrary() { return $('~Library'); }

    async waitForHome() {
        this.log('Waiting for Dashboard to load...');
        await this.tabHome.waitForDisplayed({ timeout: 30000 });
    }

    async isCurrentBuilding(buildingName) {
        try {
            const headerEl = await $(`//*[contains(@content-desc, "${buildingName}")]`);
            return await headerEl.isDisplayed().catch(() => false);
        } catch (e) {
            return false;
        }
    }

    async selectBuilding(buildingName) {
        const alreadyActive = await this.isCurrentBuilding(buildingName);
        if (alreadyActive) {
            this.log(`Building "${buildingName}" is already active. Skipping building switch.`);
            return;
        }

        this.log(`Switching active building to "${buildingName}" via hamburger menu...`);

        const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';

        this.log('Tapping Hamburger menu button...');
        await this.btnHamburger.waitForDisplayed({ timeout: 15000 });
        await this.btnHamburger.click();
        await browser.pause(2000);

        this.log('Tapping building switcher inside hamburger drawer...');
        const drawerBuildingSwitcher = await $('//*[@tooltip-text="Show menu" or contains(@content-desc, "Kipps") or contains(@content-desc, "Lane") or contains(@content-desc, "QA")]');
        await drawerBuildingSwitcher.waitForDisplayed({ timeout: 10000 });
        await drawerBuildingSwitcher.click();
        await browser.pause(2000);

        this.log(`Selecting building option matching: "${buildingName}"`);
        let buildingOption = this.getBuildingOption(buildingName);

        // Check if visible immediately
        let isVisible = await buildingOption.isDisplayed().catch(() => false);

        // If not visible immediately (item is lower down in popup list), scroll down using ADB swipe
        if (!isVisible) {
            this.log(`Scrolling popup list to find "${buildingName}"...`);
            for (let i = 0; i < 6; i++) {
                try {
                    execSync(`adb -s ${activeUdid} shell input swipe 285 850 285 350 400`);
                } catch (adbErr) {
                    console.log('ADB swipe error: ' + adbErr.message);
                }
                await browser.pause(1000);
                isVisible = await buildingOption.isDisplayed().catch(() => false);
                if (isVisible) break;
            }
        }

        await buildingOption.waitForDisplayed({ timeout: 15000 });
        await buildingOption.click();
        await browser.pause(2000);
        this.log(`Building "${buildingName}" selected successfully.`);
    }
}

module.exports = new DashboardPage();
