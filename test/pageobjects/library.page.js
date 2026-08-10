const BasePage = require('./base.page');

class LibraryPage extends BasePage {
    // Locators
    get inputSearch() { return $('//android.widget.EditText'); }
    
    // List of files and folders (Flutter views/images with content-desc containing newline)
    get listItems() { return $$('//*[contains(@content-desc, "' + "\n" + '")]'); }

    get textEmptyState() {
        return $('//*[contains(@content-desc, "No Data Found") or contains(@text, "No Data Found") or contains(@content-desc, "No data found") or contains(@text, "No data found")]');
    }

    get textDownloadModal() {
        return $('//*[contains(@content-desc, "downloading file please wait") or contains(@text, "downloading file please wait")]');
    }

    get btnCancelDownload() {
        return $('//*[@content-desc="Cancel" or @text="Cancel" or contains(@content-desc, "Cancel") or contains(@text, "Cancel")]');
    }

    get btnBack() {
        return $('//android.widget.Button | //android.widget.ImageView[1]');
    }

    // Dynamic locators
    getItem(index) {
        return $(`(//*[contains(@content-desc, "` + "\n" + `")])[${index + 1}]`);
    }

    getItemArrow(index) {
        return $(`(//*[contains(@content-desc, "` + "\n" + `")])[${index + 1}]//android.widget.ImageView[1]`);
    }

    // Methods
    async waitForListOrEmptyState() {
        this.log('Waiting for Library items list to populate or empty state...');
        const AuthHelper = require('../utils/auth.helper');
        try {
            await browser.waitUntil(async () => {
                if (await AuthHelper.isTokenInvalid()) {
                    this.log('WARNING: JWT Token invalid error detected! Triggering session recovery...');
                    await AuthHelper.ensureLoggedIn();
                    const DashboardPage = require('./dashboard.page');
                    await this.waitAndTap(DashboardPage.widgetLibrary, 'Library Dashboard Widget');
                    return false;
                }
                const items = await this.listItems;
                if (items.length > 0) return true;
                try {
                    return await this.textEmptyState.isDisplayed();
                } catch (e) {
                    return false;
                }
            }, {
                timeout: 15000,
                timeoutMsg: 'Expected Library list or empty state'
            });
        } catch (e) {
            const source = await driver.getPageSource();
            require('fs').writeFileSync('library_stuck_source.xml', source);
            throw new Error(`${e.message}. UI dumped to library_stuck_source.xml`);
        }
    }

    async searchFor(keyword) {
        this.log(`Searching Library for: "${keyword}"`);
        await this.waitAndTap(this.inputSearch, 'Search Input');
        await this.inputSearch.setValue(keyword + '\n');
        try {
            await driver.pressKeyCode(66);
        } catch (e) { }
        await browser.pause(2000);
        await driver.hideKeyboard().catch(() => { });
    }

    async clearSearch() {
        this.log('Clearing search input field...');
        await this.waitAndTap(this.inputSearch, 'Search Input');
        await this.inputSearch.clearValue();
        try {
            await driver.pressKeyCode(66);
        } catch (e) { }
        await browser.pause(2000);
        await driver.hideKeyboard().catch(() => { });
    }

    async openItem(index = 0) {
        this.log(`Opening Library item at index ${index}...`);
        const item = this.getItem(index);
        await this.waitAndTap(item, `Library Item (Index ${index})`);
    }

    async openItemViaArrow(index = 0) {
        this.log(`Tapping arrow icon for Library item at index ${index}...`);
        const arrow = this.getItemArrow(index);
        await this.waitAndTap(arrow, `Library Item Arrow (Index ${index})`);
    }

    async cancelDownload() {
        this.log('Tapping Cancel on download progress modal...');
        await this.waitAndTap(this.btnCancelDownload, 'Cancel Download Button');
    }
}

module.exports = new LibraryPage();
