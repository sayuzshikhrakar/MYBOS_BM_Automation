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

    async waitForHome() {
        this.log('Waiting for Dashboard to load...');
        await this.tabHome.waitForDisplayed({ timeout: 30000 });
    }

    async selectBuilding(buildingName) {
        this.log(`Opening building selector dropdown...`);

        const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';

        // Check if popup menu is already open
        let popupOpened = await $('~Dismiss menu').isDisplayed().catch(() => false);

        if (!popupOpened) {
            // Send ADB hardware touch taps directly to center of building header (X: 540, Y: 185 and Y: 259)
            const coords = [[540, 185], [540, 259], [540, 220]];
            for (const [x, y] of coords) {
                this.log(`ADB tapping building header at (${x}, ${y})...`);
                try {
                    execSync(`adb -s ${activeUdid} shell input tap ${x} ${y}`);
                } catch (e) {
                    console.log('ADB tap fallback error: ' + e.message);
                }
                await browser.pause(1500);

                popupOpened = await $('~Dismiss menu').isDisplayed().catch(() => false);
                if (popupOpened) {
                    this.log('Building selection popup menu opened successfully!');
                    break;
                }
            }
        }

        this.log(`Selecting building option matching: "${buildingName}"`);
        let buildingOption = this.getBuildingOption(buildingName);

        // Check if visible immediately
        let isVisible = await buildingOption.isDisplayed().catch(() => false);

        // If not visible immediately (item is lower down in popup list), scroll down using pointer drag
        if (!isVisible) {
            this.log(`Scrolling popup list to find "${buildingName}"...`);
            for (let i = 0; i < 5; i++) {
                await browser.action('pointer')
                    .move({ x: 300, y: 1800 })
                    .down()
                    .pause(200)
                    .move({ x: 300, y: 700, duration: 600 })
                    .up()
                    .perform();
                await browser.pause(800);
                isVisible = await buildingOption.isDisplayed().catch(() => false);
                if (isVisible) break;
            }
        }

        await buildingOption.waitForDisplayed({ timeout: 15000 });
        await buildingOption.click();
        await browser.pause(1500);
        this.log(`Building "${buildingName}" selected successfully.`);
    }
}

module.exports = new DashboardPage();
