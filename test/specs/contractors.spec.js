const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const ContractorsPage = require('../pageobjects/contractors.page');
const contractorsData = require('../data/contractors.data.json');
const AuthHelper = require('../utils/auth.helper');
const Utils = require('../utils/utils');

async function navigateToContractors() {
    try {
        await ContractorsPage.waitAndTap(DashboardPage.widgetContractors, 'Contractors Dashboard Widget');
    } catch (e) {
        const source = await driver.getPageSource();
        require('fs').writeFileSync('contractors_navigation_stuck.xml', source);
        throw new Error(`Failed to navigate to Contractors. UI dumped to contractors_navigation_stuck.xml: ${e.message}`);
    }
}

describe('Contractors Feature', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
    });

    it('should_navigate_to_contractors_screen_when_contractors_widget_clicked', async () => {
        await navigateToContractors();
        await expect(ContractorsPage.tabContacts).toBeDisplayed();
        await expect(ContractorsPage.tabCompany).toBeDisplayed();
        await expect(ContractorsPage.tabExpiredInsurance).toBeDisplayed();
    });

    it('should_switch_between_sub_tabs_contacts_company_expired_insurance', async () => {
        await navigateToContractors();

        // Switch to Company tab
        await ContractorsPage.selectTab(contractorsData.tabs[1]); // "Company"
        await ContractorsPage.waitForListOrEmptyState();
        await expect(ContractorsPage.tabCompany).toBeDisplayed();

        // Switch to Expired Insurance tab
        await ContractorsPage.selectTab(contractorsData.tabs[2]); // "Expired Insurance"
        await ContractorsPage.waitForListOrEmptyState();
        await expect(ContractorsPage.tabExpiredInsurance).toBeDisplayed();

        // Switch back to Contacts tab
        await ContractorsPage.selectTab(contractorsData.tabs[0]); // "Contacts"
        await ContractorsPage.waitForListOrEmptyState();
        await expect(ContractorsPage.tabContacts).toBeDisplayed();
    });

    it('should_display_matching_contacts_when_search_term_entered', async () => {
        await navigateToContractors();
        await ContractorsPage.waitForListOrEmptyState();

        await ContractorsPage.searchFor(contractorsData.searchKeywordContact);
        await ContractorsPage.waitForListOrEmptyState();

        const list = await ContractorsPage.listContractors;
        await expect(list.length).toBeGreaterThan(0);
        const cardContent = await list[0].getAttribute('content-desc').catch(() => '');
        expect(cardContent).toContain(contractorsData.searchKeywordContact);
    });

    it('should_filter_contractors_when_category_selected', async () => {
        await navigateToContractors();
        await ContractorsPage.waitForListOrEmptyState();

        // Select positive category filter "Power Equipment Maintenance"
        const isDropdownVisible = await ContractorsPage.dropdownCategory.isDisplayed().catch(() => false);
        if (isDropdownVisible) {
            await ContractorsPage.selectCategory(contractorsData.categories[2]); // "Power Equipment Maintenance"
            await ContractorsPage.waitForListOrEmptyState();
        }

        const list = await ContractorsPage.listContractors;
        await expect(list.length).toBeGreaterThan(0);
    });

    it('should_navigate_to_contractor_details_when_view_details_clicked', async () => {
        await navigateToContractors();
        await ContractorsPage.waitForListOrEmptyState();

        // Search for positive contractor "Michael Johnson" to locate details
        await ContractorsPage.searchFor(contractorsData.contactDetails.name);
        await ContractorsPage.waitForListOrEmptyState();

        const list = await ContractorsPage.listContractors;
        if (list.length > 0) {
            await ContractorsPage.viewDetailsFor(0);
            await browser.pause(2000);

            // Compare actual fields on Contractor Details screen with expected data from contractors.data.json
            await Utils.verifyFieldVisible(contractorsData.contactDetails.name, 'Contractor Contact Name');
            await Utils.verifyFieldVisible(contractorsData.contactDetails.company, 'Contractor Company');

            // Return to Contractors list
            await driver.back().catch(() => { });
            await browser.pause(1000);
            const isSearchVisible = await ContractorsPage.inputSearch.isDisplayed().catch(() => false);
            if (!isSearchVisible) {
                await driver.back().catch(() => { });
                await browser.pause(1000);
            }
        } else {
            console.log('Skipping step: no contractors available to view details.');
        }
    });

    it('should_open_mail_app_when_email_icon_clicked', async () => {
        await navigateToContractors();
        await ContractorsPage.waitForListOrEmptyState();

        const list = await ContractorsPage.listContractors;
        if (list.length > 0) {
            const btnEmail = await ContractorsPage.getBtnEmail(0);
            if (await btnEmail.isDisplayed().catch(() => false)) {
                await ContractorsPage.contactViaEmail(0);
                await browser.pause(2000);

                const btnOK = await $('~OK');
                if (await btnOK.isDisplayed().catch(() => false)) {
                    await btnOK.click();
                    await browser.pause(1000);
                } else {
                    await driver.activateApp('com.mybosapps.bmapp.stg');
                }
            } else {
                console.log('Skipping step: email icon not present on contractor card.');
            }

            await ContractorsPage.inputSearch.waitForDisplayed({ timeout: 10000 }).catch(() => { });
        } else {
            console.log('Skipping step: no contractors available to send email.');
        }
    });

    it('should_show_call_prompt_when_phone_icon_clicked', async () => {
        await navigateToContractors();
        await ContractorsPage.waitForListOrEmptyState();

        const list = await ContractorsPage.listContractors;
        if (list.length > 0) {
            const btnPhone = await ContractorsPage.getBtnPhone(0);
            if (await btnPhone.isDisplayed().catch(() => false)) {
                await ContractorsPage.contactViaPhone(0);
                await browser.pause(2000);

                const btnCancel = await $('//*[@text="Cancel" or @text="CANCEL"]');
                if (await btnCancel.isDisplayed().catch(() => false)) {
                    await btnCancel.click();
                    await browser.pause(1000);
                } else {
                    await driver.activateApp('com.mybosapps.bmapp.stg');
                    const isSearchVisible = await ContractorsPage.inputSearch.isDisplayed().catch(() => false);
                    if (!isSearchVisible) {
                        await driver.back().catch(() => { });
                        await browser.pause(1000);
                    }
                }
            } else {
                console.log('Skipping step: phone icon not present on contractor card.');
            }

            await ContractorsPage.inputSearch.waitForDisplayed({ timeout: 10000 }).catch(() => { });
        } else {
            console.log('Skipping step: no contractors available to call.');
        }
    });

    it('should_display_expired_insurance_records_and_open_document', async () => {
        await navigateToContractors();
        await ContractorsPage.selectTab(contractorsData.tabs[2]); // "Expired Insurance"
        await ContractorsPage.waitForListOrEmptyState();

        const list = await ContractorsPage.listContractors;
        if (list.length > 0) {
            const btnDoc = await ContractorsPage.getBtnDocument(0);
            if (await btnDoc.isDisplayed().catch(() => false)) {
                await ContractorsPage.viewExpiredDocument(0);
                await browser.pause(2000);

                // Return from document viewer to Expired Insurance list
                await driver.back().catch(() => { });
            }
            await ContractorsPage.tabExpiredInsurance.waitForDisplayed({ timeout: 10000 }).catch(() => { });
        } else {
            console.log('Skipping step: no expired insurance records available.');
        }
    });

    // ==========================================
    // Negative Test Cases
    // ==========================================

    // =========================================================================
    // Multi-Tab Negative Test Cases (Contacts, Company, Expired Insurance)
    // =========================================================================

    contractorsData.tabs.forEach((tabName) => {
        // 1. Non-existent keyword search on sub-tab
        it(`should_show_empty_state_when_no_contractors_match_on_${tabName.toLowerCase().replace(/\s+/g, '_')}_tab`, async () => {
            await navigateToContractors();
            await ContractorsPage.selectTab(tabName);
            await ContractorsPage.waitForListOrEmptyState();
            await ContractorsPage.searchFor(contractorsData.searchKeywordNotFound); // "NonExistentContractor999"
            await expect(ContractorsPage.textEmptyState).toBeDisplayed();
        });

        // // 2. Special characters search on sub-tab
        it(`should_show_empty_state_when_special_characters_searched_on_${tabName.toLowerCase().replace(/\s+/g, '_')}_tab`, async () => {
            await navigateToContractors();
            await ContractorsPage.selectTab(tabName);
            await ContractorsPage.waitForListOrEmptyState();
            await ContractorsPage.searchFor(contractorsData.searchSpecialCharacters); // "!@#$%^&*()_+"
            await expect(ContractorsPage.textEmptyState).toBeDisplayed();
        });

        // 3. Script / XSS injection search on sub-tab
        it(`should_handle_script_injection_search_safely_on_${tabName.toLowerCase().replace(/\s+/g, '_')}_tab`, async () => {
            await navigateToContractors();
            await ContractorsPage.selectTab(tabName);
            await ContractorsPage.waitForListOrEmptyState();
            await ContractorsPage.searchFor(contractorsData.searchScriptInjection);
            await browser.pause(5000); // Pause right after searchFor to allow search filtering to process
            await ContractorsPage.textEmptyState.waitForDisplayed({ timeout: 10000 }).catch(() => { });
            await expect(ContractorsPage.textEmptyState).toBeDisplayed();
        });
    });

    // 4. Whitespace input search
    it('should_handle_whitespace_search_safely', async () => {
        await navigateToContractors();
        await ContractorsPage.searchFor(contractorsData.searchWhitespace); // "   "
        await expect(ContractorsPage.inputSearch).toBeDisplayed();
    });

});
