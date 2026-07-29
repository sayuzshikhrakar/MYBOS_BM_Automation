const allureReporter = require('@wdio/allure-reporter').default;

class BasePage {
    /**
     * Prints an action log and adds it as a step in the Allure report
     */
    log(message) {
        const time = new Date().toLocaleTimeString();
        // WebdriverIO's spec reporter aggressively swallows terminal logs,
        // so we inject the action directly into the Allure Report!
        try {
            allureReporter.addStep(`[ACTION] ${message}`);
        } catch (e) { }

        console.log(`\x1b[36m[${time}] [ACTION]\x1b[0m ${message}`);
    }

    /**
     * Waits for an element to be displayed and then taps/clicks it.
     */
    async waitAndTap(selector, elementName = 'Element', timeout = 15000) {
        this.log(`Tapping on: ${elementName}`);
        const el = typeof selector === 'string' ? await $(selector) : selector;
        await el.waitForDisplayed({ timeout });
        await el.click();
    }

    /**
     * Waits for an element to be displayed, clears its text, and sets a new value.
     */
    async clearAndType(selector, value, elementName = 'Input Field', timeout = 10000) {
        const logValue = elementName.toLowerCase().includes('password') ? '********' : value;
        this.log(`Typing "${logValue}" into: ${elementName}`);
        const el = typeof selector === 'string' ? await $(selector) : selector;
        await el.waitForDisplayed({ timeout });
        await el.clearValue();
        await el.setValue(value);
    }

    /**
     * Taps a dropdown, waits for an option to appear, and clicks it.
     */
    async selectDropdownOption(dropdownSelector, optionText, dropdownName = 'Dropdown') {
        await this.waitAndTap(dropdownSelector, dropdownName);
        this.log(`Selecting option: "${optionText}"`);
        const option = await $(`//*[contains(@content-desc, "${optionText}") or contains(@text, "${optionText}")]`);
        await option.waitForDisplayed({ timeout: 10000 });
        await option.click();
    }

    // ✅ Matches ANY building header without needing a specific building name!
    get btnBuildingSelector() {
        return $('//android.view.View[contains(@content-desc, "\n")]');
    }

    /**
     * Tries to find and dismiss the Android notification permission popup across devices and emulators
     */
    async dismissPermissionPopup(timeout = 5000) {
        try {
            // Using a very explicit UIAutomator XPath since the ID locator across packages can be flaky
            const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button" or contains(@text, "ALLOW") or contains(@text, "Allow")]');
            
            if (await allowBtn.waitForDisplayed({ timeout }).then(() => true).catch(() => false)) {
                this.log('Dismissing Permission Popup...');
                
                // Calculate center coordinates to perform a raw W3C tap, bypassing system security restrictions
                const location = await allowBtn.getLocation();
                const size = await allowBtn.getSize();
                const tapX = Math.round(location.x + size.width / 2);
                const tapY = Math.round(location.y + size.height / 2);

                await driver.performActions([{
                    type: 'pointer',
                    id: 'finger_allow',
                    parameters: { pointerType: 'touch' },
                    actions: [
                        { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
                        { type: 'pointerDown', button: 0 },
                        { type: 'pause', duration: 100 },
                        { type: 'pointerUp', button: 0 }
                    ]
                }]);
                await driver.releaseActions();
                await browser.pause(1000);
                this.log('Permission popup dismissed!');
            }
        } catch (e) {
            // Do nothing if it doesn't appear
        }
    }
}

module.exports = BasePage;
