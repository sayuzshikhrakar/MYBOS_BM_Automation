const BasePage = require('./base.page');
const WelcomePage = require('./welcome.page');

class LoginPage extends BasePage {
    // Locators based on the native representation of the WebView
    get inputEmail() { return $('//*[@resource-id="email"]'); }
    get inputPassword() { return $('//*[@resource-id="current-password"]'); }
    get btnSignIn() { return $('//*[@resource-id="loginBtn"]'); }
    get textErrorMessage() { return $('//*[@text="Invalid email or password"]'); }

    async login (username, password) {
        this.log('Starting Login Flow...');
        if (await WelcomePage.isWelcomePageDisplayed()) {
            await WelcomePage.clickSignIn();
        }
        await this.inputEmail.waitForDisplayed({ timeout: 15000 });

        await this.clearAndType(this.inputEmail, username, 'Email Field');
        await this.clearAndType(this.inputPassword, password, 'Password Field');

        if (driver.isAndroid) {
            try { await driver.hideKeyboard(); } catch(e) {}
        }
        await browser.pause(500); // Wait for keyboard to fully hide before clicking sign in
        
        await this.waitAndTap(this.btnSignIn, 'Sign In Button');
        this.log('Login credentials submitted.');
        
        // Handle Google Smart Lock "Save password to Google?" dialog if it appears
        await browser.pause(2000); // Give it time to animate in
        
        const isSignInVisible = await this.btnSignIn.isDisplayed().catch(() => false);
        if (!isSignInVisible) {
            this.log('Sign in button is obscured (likely by Google Smart Lock). Pressing BACK to dismiss.');
            try {
                await driver.pressKeyCode(4); // Keycode 4 is BACK
                await browser.pause(1000);
            } catch (e) {
                this.log('Failed to press back: ' + e.message);
            }
        }
    }
}

module.exports = new LoginPage();
