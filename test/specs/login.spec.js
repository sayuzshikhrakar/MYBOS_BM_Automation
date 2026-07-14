const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');

describe('Authentication & Login Page Validation', () => {

    before(async () => {
        await driver.switchContext('NATIVE_APP');
    });

    beforeEach(async () => {
        // Restart the app to guarantee a clean state between test cases
        await driver.execute('mobile: clearApp', { appId: 'com.mybosapps.bmapp.stg' });

        // Grant notification permissions via ADB to suppress the flaky system popup
        try {
            (() => {
                const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
                return require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
            })();
        } catch (e) {
            console.log('Note: ADB permission grant failed, popup might appear.');
        }

        await driver.activateApp('com.mybosapps.bmapp.stg');

        // Ensure we are on the login screen
        await browser.pause(1500);

        await LoginPage.inputEmail.clearValue();
        await LoginPage.inputPassword.clearValue();
    });

    // it('Should keep Sign In button ENABLED when fields are empty', async () => {
    //     // Both fields are empty (from beforeEach)
    //     expect(await LoginPage.btnSignIn.isEnabled()).toBe(true);
    // });

    // it('Should keep Sign In button ENABLED when Email format is invalid', async () => {
    //     await LoginPage.inputEmail.setValue('invalid-email-format');
    //     expect(await LoginPage.btnSignIn.isEnabled()).toBe(true);
    // });

    // it('Should display error for invalid email and valid password', async () => {
    //     await LoginPage.login('wrong.email@example.com', 'asdfasdf');

    //     try {
    //         expect(await LoginPage.btnSignIn.isDisplayed()).toBe(true);
    //     } catch (e) {
    //         const source = await driver.getPageSource();
    //         require('fs').writeFileSync('login_error_source.xml', source);
    //         throw e;
    //     }
    //     await browser.pause(3000); // Allow error toast to disappear
    // });

    // it('Should display error for valid email and invalid password', async () => {
    //     const username = process.env.TEST_USER || 'sayuz.shikhrakar+james@ebpearls.com';
    //     await LoginPage.login(username, 'wrongpassword123');

    //     // Assert we are still on the login screen
    //     expect(await LoginPage.btnSignIn.isDisplayed()).toBe(true);
    //     await browser.pause(3000); // Allow error toast to disappear
    // });

    it('Should login successfully with valid credentials and handle notification popup', async () => {
        const username = process.env.TEST_USER || 'sayuz.shikhrakar+james@ebpearls.com';
        const password = process.env.TEST_PASS || 'asdfasdf';

        await LoginPage.login(username, password);

        // Handle the Android notification permission popup using the centralized BasePage method
        await LoginPage.dismissPermissionPopup(10000);

        // Wait for the Dashboard Home tab to appear
        try {
            await DashboardPage.waitForHome();
        } catch (e) {
            const source = await driver.getPageSource();
            require('fs').writeFileSync('login_stuck_source.xml', source);
            throw new Error(`Failed to reach Dashboard. Screen dumped to login_stuck_source.xml: ${e.message}`);
        }
        expect(await DashboardPage.tabHome.isDisplayed()).toBe(true);
    });
});
