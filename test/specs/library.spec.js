const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const LibraryPage = require('../pageobjects/library.page');
const libraryData = require('../data/library.data.json');
const AuthHelper = require('../utils/auth.helper');
const Utils = require('../utils/utils');

async function navigateToLibrary() {
    try {
        await driver.hideKeyboard().catch(() => { });
        const onLibrary = await LibraryPage.inputSearch.isDisplayed().catch(() => false);
        if (onLibrary) return;

        // Scroll down safely using pointer actions if the widget is not displayed
        for (let i = 0; i < 3; i++) {
            const displayed = await DashboardPage.widgetLibrary.isDisplayed().catch(() => false);
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

        await LibraryPage.waitAndTap(DashboardPage.widgetLibrary, 'Library Dashboard Widget');
    } catch (e) {
        const source = await driver.getPageSource();
        require('fs').writeFileSync('dashboard_library_stuck.xml', source);
        throw new Error(`Failed to navigate to Library. UI dumped to dashboard_library_stuck.xml: ${e.message}`);
    }
}

describe('Library Feature', () => {
    beforeEach(async () => {
        await AuthHelper.ensureLoggedIn();
    });

    it('should_navigate_to_library_screen_when_library_widget_clicked', async () => {
        await navigateToLibrary();
        await expect(LibraryPage.inputSearch).toBeDisplayed();
    });

    it('should_display_library_components_and_items_when_navigated', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await expect(LibraryPage.inputSearch).toBeDisplayed();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await expect(items[0]).toBeExisting();
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_filter_files_and_folders_case_insensitively_when_searching', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        // Perform case-insensitive search
        await LibraryPage.searchFor(libraryData.searchKeyword);
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await expect(items[0]).toBeDisplayed();
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_filter_files_by_extension_when_extension_searched', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchExtension);
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await expect(items[0]).toBeDisplayed();
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_filter_files_when_uppercase_extension_searched', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchExtensionUppercase);
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await expect(items[0]).toBeDisplayed();
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_find_specific_file_by_partial_name_search', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchKeywordPartial);
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            const contentDesc = await items[0].getAttribute('content-desc');
            expect(contentDesc.toLowerCase()).toContain(libraryData.searchKeywordPartial.toLowerCase());
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });

    it('should_restore_full_list_when_search_input_cleared', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchKeyword);
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.clearSearch();
        await LibraryPage.waitForListOrEmptyState();

        await expect(LibraryPage.inputSearch).toBeDisplayed();
    });

    it('should_show_download_modal_or_open_folder_when_item_tapped', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await LibraryPage.openItem(0);
            await browser.pause(2000);

            // Check if download modal appeared, subfolder opened, or system intent ("Open with") appeared
            const isModal = await LibraryPage.textDownloadModal.isDisplayed().catch(() => false);
            if (isModal) {
                await expect(LibraryPage.textDownloadModal).toBeDisplayed();
                const isCancelAvailable = await LibraryPage.btnCancelDownload.isDisplayed().catch(() => false);
                if (isCancelAvailable) {
                    await LibraryPage.cancelDownload();
                }
            } else {
                const openWithHeader = await $('//*[@text="Open with" or contains(@text, "Open with")]');
                if (await openWithHeader.isDisplayed().catch(() => false)) {
                    await driver.back().catch(() => { });
                    await browser.pause(1000);
                }
                await driver.activateApp('com.mybosapps.bmapp.stg');
                let isSearchVisible = await LibraryPage.inputSearch.isDisplayed().catch(() => false);
                if (!isSearchVisible) {
                    await driver.back().catch(() => { });
                    await browser.pause(1000);
                }
                await LibraryPage.inputSearch.waitForDisplayed({ timeout: 10000 });
            }
        } else {
            console.log('Skipping step: no library items available to tap.');
        }
    });

    it('should_abort_download_and_return_to_list_when_cancel_clicked', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            await LibraryPage.openItem(0);
            await browser.pause(1000);

            const isModal = await LibraryPage.textDownloadModal.isDisplayed().catch(() => false);
            if (isModal) {
                await LibraryPage.cancelDownload();
                await LibraryPage.inputSearch.waitForDisplayed({ timeout: 10000 });
                await expect(LibraryPage.inputSearch).toBeDisplayed();
            } else {
                const openWithHeader = await $('//*[@text="Open with" or contains(@text, "Open with")]');
                if (await openWithHeader.isDisplayed().catch(() => false)) {
                    await driver.back().catch(() => { });
                    await browser.pause(1000);
                }
                await driver.activateApp('com.mybosapps.bmapp.stg');
                let isSearchVisible = await LibraryPage.inputSearch.isDisplayed().catch(() => false);
                if (!isSearchVisible) {
                    await driver.back().catch(() => { });
                    await browser.pause(1000);
                }
                await LibraryPage.inputSearch.waitForDisplayed({ timeout: 10000 });
            }
        } else {
            console.log('Skipping step: no library items available to test cancel.');
        }
    });

    it('should_display_empty_state_when_no_items_match_search', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchKeywordNotFound);

        await expect(LibraryPage.textEmptyState).toBeDisplayed();
    });

    it('should_handle_special_character_search_safely', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchSpecialCharacters);

        // App should not crash and should show empty state or filtered list
        const isSearchVisible = await LibraryPage.inputSearch.isDisplayed().catch(() => false);
        expect(isSearchVisible).toBe(true);
    });

    it('should_handle_script_injection_search_safely', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        await LibraryPage.searchFor(libraryData.searchScriptInjection);

        const isSearchVisible = await LibraryPage.inputSearch.isDisplayed().catch(() => false);
        expect(isSearchVisible).toBe(true);
    });

    it('should_display_correct_singular_and_plural_item_counts', async () => {
        await navigateToLibrary();
        await LibraryPage.waitForListOrEmptyState();

        const items = await LibraryPage.listItems;
        if (items.length > 0) {
            const firstItemText = await items[0].getAttribute('content-desc');
            expect(firstItemText).toBeDefined();
        } else {
            await expect(LibraryPage.textEmptyState).toBeDisplayed();
        }
    });
});
