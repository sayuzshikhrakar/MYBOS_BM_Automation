const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const ResidentsPage = require('../pageobjects/residents.page');

describe('Debug Context', () => {
    it('Should print contexts', async () => {
        const username = process.env.TEST_USER || 'sayuz.shikhrakar+james@ebpearls.com';
        const password = process.env.TEST_PASS || 'asdfasdf';

        await driver.switchContext('NATIVE_APP');
        await driver.execute('mobile: clearApp', { appId: 'com.mybosapps.bmapp.stg' });
        try {
            (() => {
            const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
            return require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
        })();
        } catch(e) {}
        await driver.activateApp('com.mybosapps.bmapp.stg');

        await LoginPage.login(username, password);
        await DashboardPage.waitForHome();

        await ResidentsPage.waitAndTap(DashboardPage.widgetResidents);
        await browser.pause(5000); // Wait for webview to load
        
        const contexts = await driver.getContexts();
        console.log("====================================================");
        console.log("AVAILABLE CONTEXTS:", contexts);
        console.log("====================================================");
    });
});
