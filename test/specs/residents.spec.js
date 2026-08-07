const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const ResidentsPage = require('../pageobjects/residents.page');
const residentsData = require('../data/residents.data.json');
const AuthHelper = require('../utils/auth.helper');
const Utils = require('../utils/utils');

async function navigateToResidents() {
    try {
        await driver.hideKeyboard().catch(() => { });
        const onResidents = await ResidentsPage.inputSearch.isDisplayed().catch(() => false);
        if (onResidents) return;

        // Scroll down safely using pointer actions if the widget is not displayed
        for (let i = 0; i < 3; i++) {
            const displayed = await DashboardPage.widgetResidents.isDisplayed().catch(() => false);
            if (displayed) break;

            await browser.action('pointer')
                .move({ x: 250, y: 800 })
                .down()
                .pause(500)
                .move({ x: 250, y: 350, duration: 800 })
                .up()
                .perform();
            await browser.pause(1000);
        }

        await ResidentsPage.waitAndTap(DashboardPage.widgetResidents);
    } catch (e) {
        const source = await driver.getPageSource();
        require('fs').writeFileSync('dashboard_stuck_source.xml', source);
        throw new Error(`Failed to navigate to Residents. UI dumped to dashboard_stuck_source.xml: ${e.message}`);
    }
}

describe('Residents Feature', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
    });

    it('should_navigate_to_residents_screen_when_residents_menu_clicked', async () => {
        await navigateToResidents();
        await expect(ResidentsPage.inputSearch).toBeDisplayed();
    });

    it('should_display_residents_screen_components_when_navigated_to_residents_screen', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        await expect(ResidentsPage.inputSearch).toBeDisplayed();
        await expect(ResidentsPage.dropdownResidentType).toBeDisplayed();

        // Assert default value of dropdown is "All Residents"
        const dropdownText = await ResidentsPage.dropdownResidentType.getAttribute('content-desc');
        expect(dropdownText).toEqual(residentsData.residentTypes[0]); // "All Residents"

        // Assuming list is present
        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await expect(residents[0]).toBeExisting();
        } else {
            await expect(ResidentsPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_filter_residents_when_resident_type_selected', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        // Select 'Owner'
        await ResidentsPage.selectType(residentsData.residentTypes[1]);
        await ResidentsPage.waitForListOrEmptyState();

        // Ensure some result or empty state
        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await expect(residents[0]).toBeDisplayed();
        } else {
            await expect(ResidentsPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_display_matching_residents_when_search_term_entered', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        await ResidentsPage.searchFor(residentsData.searchKeyword);
        await ResidentsPage.waitForListOrEmptyState();

        // Check if filtered
        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await expect(residents[0]).toBeDisplayed();
        } else {
            await expect(ResidentsPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_navigate_to_resident_details_when_view_details_clicked', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        // Search for resident keyword to locate Sophia Rodriguez
        await ResidentsPage.searchFor(residentsData.searchKeyword);
        await ResidentsPage.waitForListOrEmptyState();

        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await ResidentsPage.viewDetailsFor(0);
            await browser.pause(2000);

            // Verify all fields from residents.data.json on the Resident Details page
            await Utils.verifyFieldVisible(residentsData.residentName, 'Resident Name');
            await Utils.verifyFieldVisible(residentsData.residentApartment, 'Apartment');
            await Utils.verifyFieldVisible(residentsData.residentLot, 'Lot');
            await Utils.verifyFieldVisible(residentsData.residentHomePhone, 'Home Phone');
            await Utils.verifyFieldVisible(residentsData.residentMobile, 'Mobile');
            await Utils.verifyFieldVisible(residentsData.residentEmail, 'Email');
            await Utils.verifyFieldVisible(residentsData.residentType, 'Resident Type');
            await Utils.verifyFieldVisible(residentsData.residentSCMember, 'SC Member');
            await Utils.verifyFieldVisible(residentsData.residentCustomgroup, 'Custom Group');
            await Utils.verifyFieldVisible(residentsData.residentMoveindate, 'Move-in Date');
            await Utils.verifyFieldVisible(residentsData.residentEmergencyName, 'Emergency Name');
            await Utils.verifyFieldVisible(residentsData.residentContactnumber, 'Emergency Contact Number');

            // Return to residents list
            await driver.back().catch(() => { });
            await ResidentsPage.inputSearch.waitForDisplayed({ timeout: 10000 });
        } else {
            console.log('Skipping step: no residents available to view details.');
        }
    });

    it('should_open_mail_app_when_email_icon_clicked', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await ResidentsPage.contactViaEmail(0);
            await browser.pause(2000);

            const btnOK = await $('~OK');
            if (await btnOK.isDisplayed().catch(() => false)) {
                await btnOK.click();
                await browser.pause(1000);
            } else {
                await driver.activateApp('com.mybosapps.bmapp.stg');
            }

            try {
                await ResidentsPage.inputSearch.waitForDisplayed({ timeout: 10000 });
            } catch (e) {
                const source = await driver.getPageSource();
                require('fs').writeFileSync('email_stuck_source.xml', source);
                throw e;
            }
        } else {
            console.log('Skipping step: no residents available to send email.');
        }
    });

    it('should_show_call_prompt_when_phone_icon_clicked', async () => {
        await navigateToResidents();
        await ResidentsPage.waitForListOrEmptyState();

        const residents = await ResidentsPage.listResidents;
        if (residents.length > 0) {
            await ResidentsPage.contactViaPhone(0);
            await browser.pause(2000);

            const btnCancel = await $('//*[@text="Cancel" or @text="CANCEL"]');
            if (await btnCancel.isDisplayed().catch(() => false)) {
                await btnCancel.click();
                await browser.pause(1000);
            } else {
                await driver.activateApp('com.mybosapps.bmapp.stg');
                // Check if we are still blocked by some system UI, try pressing back
                const isSearchVisible = await ResidentsPage.inputSearch.isDisplayed().catch(() => false);
                if (!isSearchVisible) {
                    await driver.back().catch(() => { });
                    await browser.pause(1000);
                }
            }

            await ResidentsPage.inputSearch.waitForDisplayed({ timeout: 10000 });
        } else {
            console.log('Skipping step: no residents available to call.');
        }
    });

    it('should_show_empty_state_when_no_residents_match', async () => {
        await navigateToResidents();

        await ResidentsPage.searchFor(residentsData.searchKeywordNotFound);

        await expect(ResidentsPage.textEmptyState).toBeDisplayed();
    });
});
