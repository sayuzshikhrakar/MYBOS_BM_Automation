const BasePage = require('./base.page');

class DashboardPage extends BasePage {
    // Navigation Tabs (Bottom Bar)
    get tabHome () { return $('~Home'); }
    get tabCases () { return $('~Cases'); }
    get tabInspections () { return $('~Inspections'); }
    get tabMore () { return $('~More'); }

    // Header Elements
    // The hamburger menu doesn't have a content-desc, but it's the first ImageView in the top bar.
    // Using a more stable hierarchical xpath:
    get btnHamburger () { return $('//android.view.View/android.widget.ImageView[1]'); }

    // Dashboard Widgets (Inside ScrollView)
    get widgetMaintenance () { return $('~Maintenance Request'); }
    get widgetResidents () { return $('~Residents'); }
    get widgetParcels () { return $('~Parcels'); }

    async waitForHome() {
        this.log('Waiting for Dashboard to load...');
        await this.tabHome.waitForDisplayed({ timeout: 30000 });
    }
}

module.exports = new DashboardPage();
