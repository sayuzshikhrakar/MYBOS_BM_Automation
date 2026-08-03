const BasePage = require('./base.page');

class ContractorsPage extends BasePage {
    // Sub-Tabs
    get tabContacts() { return $('//*[contains(@content-desc, "Contact") or contains(@text, "Contact")]'); }
    get tabCompany() { return $('//*[contains(@content-desc, "Company") or contains(@text, "Company") or contains(@content-desc, "Companies")]'); }
    get tabExpiredInsurance() { return $('//*[contains(@content-desc, "Expired") or contains(@text, "Expired")]'); }

    // Search and Filter Elements
    get inputSearch() { return $('//android.widget.EditText'); }
    get dropdownCategory() { return $('//*[contains(@content-desc, "All") or contains(@text, "All")]'); }

    // List & Empty State Locators
    get listContractors() { return $$('//*[contains(@content-desc, "' + "\n" + '") and not(contains(@content-desc, "Tab ")) and not(contains(@content-desc, "Contractors"))]'); }
    get textEmptyState() { return $('//*[@content-desc[contains(., "No contractors")] or @content-desc[contains(., "no")] or @text[contains(., "No")] or @content-desc[contains(., "Empty")]]'); }

    // Dynamic locators based on 0-indexed position in list
    getContractorItem(index) {
        return $(`(//*[contains(@content-desc, "` + "\n" + `") and not(contains(@content-desc, "Tab ")) and not(contains(@content-desc, "Contractors"))])[${index + 1}]`);
    }

    getBtnEmail(index) {
        return $(`(//*[contains(@content-desc, "` + "\n" + `") and not(contains(@content-desc, "Tab ")) and not(contains(@content-desc, "Contractors"))])[${index + 1}]//android.widget.ImageView[1]`);
    }

    getBtnPhone(index) {
        return $(`(//*[contains(@content-desc, "` + "\n" + `") and not(contains(@content-desc, "Tab ")) and not(contains(@content-desc, "Contractors"))])[${index + 1}]//android.widget.ImageView[2]`);
    }

    getBtnDocument(index) {
        return this.getContractorItem(index);
    }

    // Interaction Methods

    /**
     * Navigates between the Contacts, Company, and Expired Insurance sub-tabs
     */
    async selectTab(tabName) {
        this.log(`Switching to sub-tab: "${tabName}"`);
        const isSearchVisible = await this.inputSearch.isDisplayed().catch(() => false);
        if (isSearchVisible) {
            await this.inputSearch.clearValue().catch(() => { });
        }
        const tabEl = await $(`//*[contains(@content-desc, "${tabName}") or contains(@text, "${tabName}")]`);
        await this.waitAndTap(tabEl, `Sub-Tab "${tabName}"`);
        await browser.pause(1500);
    }

    /**
     * Waits for either the contractor list to populate or the empty state to appear
     */
    async waitForListOrEmptyState() {
        this.log('Waiting for Contractor list to populate or show empty state...');
        const AuthHelper = require('../utils/auth.helper');
        try {
            await browser.waitUntil(async () => {
                // Check if JWT token invalid error is on screen
                if (await AuthHelper.isTokenInvalid()) {
                    this.log('WARNING: JWT Token invalid error detected while waiting for Contractor list! Triggering session recovery...');
                    await AuthHelper.ensureLoggedIn();
                    return false;
                }
                const list = await this.listContractors;
                if (list.length > 0) return true;
                try {
                    return await this.textEmptyState.isDisplayed();
                } catch (e) {
                    return false;
                }
            }, {
                timeout: 15000,
                timeoutMsg: 'Expected contractor list to populate or empty state to show'
            });
        } catch (e) {
            const source = await driver.getPageSource();
            require('fs').writeFileSync('contractors_list_stuck.xml', source);
            throw new Error(`${e.message}. UI dumped to contractors_list_stuck.xml`);
        }
    }

    /**
     * Automatically types a search keyword into the search bar
     */
    async searchFor(keyword) {
        this.log(`Searching for contractor keyword: "${keyword}"`);
        await this.waitAndTap(this.inputSearch, 'Search Input');
        await this.inputSearch.clearValue().catch(() => { });
        await this.inputSearch.setValue(keyword);
        await driver.pressKeyCode(66).catch(() => { }); // Android KEYCODE_ENTER triggers Flutter onChanged
        await driver.keys(['Enter']).catch(() => { });
        await browser.pause(3000); // Allow automatic debounced filtering to complete in normal mode
        await driver.hideKeyboard().catch(() => { });
    }

    /**
     * Selects a category from the "All" category dropdown
     */
    async selectCategory(categoryName) {
        this.log(`Filtering by category: "${categoryName}"`);
        try {
            await this.selectDropdownOption(this.dropdownCategory, categoryName, 'Category Dropdown');
        } catch (e) {
            this.log(`Option "${categoryName}" not found in dropdown. Closing dropdown menu...`);
            await driver.back().catch(() => { });
        }
        await browser.pause(1500);
    }

    /**
     * Opens the contractor detail screen for the given list index
     */
    async viewDetailsFor(index) {
        const item = this.getContractorItem(index);
        await this.waitAndTap(item, `Contractor Item (Index ${index})`);
    }

    /**
     * Triggers the quick email action for the contractor card at the given index
     */
    async contactViaEmail(index) {
        const btnEmail = this.getBtnEmail(index);
        await this.waitAndTap(btnEmail, `Email Button for Contractor (Index ${index})`);
    }

    /**
     * Triggers the quick phone action for the contractor card at the given index
     */
    async contactViaPhone(index) {
        const btnPhone = this.getBtnPhone(index);
        await this.waitAndTap(btnPhone, `Phone Button for Contractor (Index ${index})`);
    }

    /**
     * Opens the document viewer for an expired insurance record
     */
    async viewExpiredDocument(index) {
        const btnDoc = this.getBtnDocument(index);
        await this.waitAndTap(btnDoc, `Document Attachment (Index ${index})`);
    }
}

module.exports = new ContractorsPage();
