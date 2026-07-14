const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');
const WelcomePage = require('../pageobjects/welcome.page');

describe('Authentication & Login Page Validation', () => {

    before(async () => {
        await driver.switchContext('NATIVE_APP');
    });

    beforeEach(async function () {
        // Restart the app to guarantee a clean state between test cases
        await driver.execute('mobile: clearApp', { appId: 'com.mybosapps.bmapp.stg' });

        // Grant notification permissions via ADB to suppress the flaky system popup
        try {
            const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
            require('child_process').execSync(`adb -s ${activeUdid} shell pm grant com.mybosapps.bmapp.stg android.permission.POST_NOTIFICATIONS`);
        } catch (e) {
            console.log('Note: ADB permission grant failed, popup might appear.');
        }

        await driver.activateApp('com.mybosapps.bmapp.stg');
        await browser.pause(2000); // Allow app to settle cleanly after launch

        // Wait until the Welcome Page is displayed after app launch
        await WelcomePage.textWelcomeHeader.waitForDisplayed({ timeout: 15000 });

        const testTitle = (this.currentTest && this.currentTest.title) ? this.currentTest.title : '';
        console.log('BEFORE_EACH executing for test:', testTitle);

        // If this is NOT the Welcome Page spec, navigate from Welcome Page to Login Page
        if (!testTitle.includes('Welcome Page')) {
            await WelcomePage.clickSignIn();
            await LoginPage.inputEmail.waitForDisplayed({ timeout: 15000 });
        }

        // Clear input fields if on login screen
        if (await LoginPage.inputEmail.isDisplayed().catch(() => false)) {
            try {
                await LoginPage.inputEmail.clearValue();
                await LoginPage.inputPassword.clearValue();
            } catch (e) { }
        }
    });

    it('Should navigate from Welcome Page to Login Page when clicking Sign In', async () => {
        // Verify Welcome Page header "Welcome to MYBOS!" is displayed
        expect(await WelcomePage.textWelcomeHeader.isDisplayed()).toBe(true);

        // Verify Sign In button is displayed
        expect(await WelcomePage.btnSignIn.isDisplayed()).toBe(true);

        // Clicking Sign In navigates from Welcome Page to Login Page
        await WelcomePage.clickSignIn();

        // Assert user is navigated to Login screen
        await LoginPage.inputEmail.waitForDisplayed({ timeout: 15000 });
        expect(await LoginPage.inputEmail.isDisplayed()).toBe(true);
    });

    // it('Should keep Sign In button ENABLED when fields are empty', async () => {
    //     await LoginPage.btnSignIn.waitForDisplayed({ timeout: 15000 });
    //     expect(await LoginPage.btnSignIn.isEnabled()).toBe(true);
    // });

    // it('Should keep Sign In button ENABLED when Email format is invalid', async () => {
    //     await LoginPage.inputEmail.waitForDisplayed({ timeout: 15000 });
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

<<<<<<< HEAD
<<<<<<< HEAD
        // Handle the Android notification permission popup using the centralized BasePage method
        await LoginPage.dismissPermissionPopup(10000);
=======
        // Handle the Android notification permission popup if it appears
        try {
            console.log('Waiting for permission popup...');
            await browser.pause(2000); // Give the system popup time to fully animate in

            // Using a very explicit UIAutomator XPath since the ID locator across packages can be flaky
            const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button" or @text="ALLOW"]');
            await allowBtn.waitForDisplayed({ timeout: 10000 });

            // Calculate center coordinates to perform a raw W3C tap, bypassing system security restrictions
            const location = await allowBtn.getLocation();
            const size = await allowBtn.getSize();
            const tapX = Math.round(location.x + size.width / 2);
            const tapY = Math.round(location.y + size.height / 2);

            await driver.performActions([{
                type: 'pointer',
                id: 'finger1',
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: tapX, y: tapY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pause', duration: 100 },
                    { type: 'pointerUp', button: 0 }
                ]
            }]);
            await driver.releaseActions();

            console.log('Permission popup dismissed via coordinate tap!');
        } catch (e) {
            console.log('No permission popup appeared or it timed out: ' + e.message);
        }
>>>>>>> 1ba5ac1 (refactoring code)
=======
        // Handle the Android notification permission popup using the centralized BasePage method
        await LoginPage.dismissPermissionPopup(10000);
>>>>>>> ca61a7a (refactoring the code:auth helper introduction)

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
