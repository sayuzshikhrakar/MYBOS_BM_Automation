const BasePage = require('./base.page');

class ResidentsPage extends BasePage {
    // Exact locators from UI dump
    get inputSearch() { return $('//android.widget.EditText'); }
    // The dropdown is the 2nd ImageView inside the ScrollView (index="2" -> XPath is 1-indexed so it's 3rd but wait, let's use the content-desc default)
    get dropdownResidentType() { return $('~All Residents'); }
    // The list of residents is inside the ScrollView -> View index=3 -> View index=0 -> View elements
    get listResidents() { return $$('//android.view.View[contains(@content-desc, "' + "\n" + '")]'); }
    get textEmptyState() { return $('//*[@content-desc="Currently there are no residents" or @text="Currently there are no residents"]'); } // Assuming it has a semantic label if empty

    // Dynamic locators based on index (since text is hidden in this Flutter view)
    getResident(index) {
        return $(`(//android.view.View[contains(@content-desc, "` + "\n" + `")])[${index + 1}]`);
    }

    getBtnViewDetails(index) {
        return this.getResident(index);
    }

    getBtnEmail(index) {
        return $(`(//android.view.View[contains(@content-desc, "` + "\n" + `")])[${index + 1}]//android.widget.ImageView[1]`);
    }

    getBtnPhone(index) {
        return $(`(//android.view.View[contains(@content-desc, "` + "\n" + `")])[${index + 1}]//android.widget.ImageView[2]`);
    }

    // Interaction Methods
    async waitForListOrEmptyState() {
        this.log('Waiting for Resident list to populate or show empty state...');
        const AuthHelper = require('../utils/auth.helper');
        try {
            await browser.waitUntil(async () => {
                // Check if JWT token invalid error is on screen
                if (await AuthHelper.isTokenInvalid()) {
                    this.log('WARNING: JWT Token invalid error detected while waiting for Resident list! Triggering session recovery...');
                    await AuthHelper.ensureLoggedIn();
                    return false;
                }
                const list = await this.listResidents;
                if (list.length > 0) return true;
                try {
                    return await this.textEmptyState.isDisplayed();
                } catch (e) {
                    return false;
                }
            }, {
                timeout: 15000,
                timeoutMsg: 'Expected list to populate or empty state to show'
            });
        } catch (e) {
            const source = await driver.getPageSource();
            require('fs').writeFileSync('list_stuck_source.xml', source);
            throw new Error(`${e.message}. UI dumped to list_stuck_source.xml`);
        }
    }

    async searchFor(keyword) {
        this.log(`Searching for resident keyword: "${keyword}"`);
        await this.waitAndTap(this.inputSearch, 'Search Input');
        await this.inputSearch.setValue(keyword + '\n');
        try {
            await driver.pressKeyCode(66); // Press Enter just in case \n isn't enough
        } catch (e) { }
        await browser.pause(2000); // Wait for filtering to complete
        await driver.hideKeyboard().catch(() => { });
    }

    async selectType(type) {
        await this.selectDropdownOption(this.dropdownResidentType, type, 'Resident Type Dropdown');
    }

    async viewDetailsFor(index) {
        await this.waitAndTap(await this.getBtnViewDetails(index), `Resident Item (Index ${index})`);
    }

    async contactViaEmail(index) {
        await this.waitAndTap(await this.getBtnEmail(index), `Email Button for Resident (Index ${index})`);
    }

    async contactViaPhone(index) {
        await this.waitAndTap(await this.getBtnPhone(index), `Phone Button for Resident (Index ${index})`);
    }
}

module.exports = new ResidentsPage();
