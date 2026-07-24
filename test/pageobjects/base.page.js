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
        const option = await $(`~${optionText}`);
        await option.waitForDisplayed({ timeout: 10000 });
        await option.click();
    }

    // ✅ Matches ANY building header without needing a specific building name!
    get btnBuildingSelector() {
        return $('//android.view.View[contains(@content-desc, "\n")]');
    }
}

module.exports = BasePage;
