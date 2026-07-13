const BasePage = require('./base.page');

class LoginPage extends BasePage {
    // Locators based on the native representation of the WebView
    get inputEmail() { return $('//*[@resource-id="email"]'); }
    get inputPassword() { return $('//*[@resource-id="current-password"]'); }
    get btnSignIn() { return $('//*[@resource-id="loginBtn"]'); }
    get textErrorMessage() { return $('//*[@text="Invalid email or password"]'); } // This is a generic guess, we can refine it if we know the exact error text

    async login (username, password) {
        this.log('Starting Login Flow...');
        await this.inputEmail.waitForDisplayed({ timeout: 45000 });
        
        // Self-healing email input
        this.log(`Typing "${username}" into: Email Field`);
        for (let i = 0; i < 3; i++) {
            await this.inputEmail.click();
            await browser.pause(500);
            await this.inputEmail.clearValue();
            await browser.keys([...username]);
            await browser.pause(500);
            const val = await this.inputEmail.getText();
            if (val && val.includes(username)) break;
            this.log('Retry typing email...');
        }
        
        await this.inputPassword.waitForDisplayed();
        
        // Self-healing password input
        this.log('Typing "********" into: Password Field');
        for (let i = 0; i < 3; i++) {
            await this.inputPassword.click();
            await browser.pause(500);
            await this.inputPassword.clearValue();
            await browser.keys([...password]);
            await browser.pause(500);
            const val = await this.inputPassword.getText();
            if (val && val.length > 0) break; 
            this.log('Retry typing password...');
        }
        
        if (driver.isAndroid) {
            try { await driver.hideKeyboard(); } catch(e) {}
        }
        await browser.pause(500); // Wait for keyboard to fully hide before clicking sign in
        
        await this.waitAndTap(this.btnSignIn, 'Sign In Button');
        this.log('Login credentials submitted.');
        
        // Handle Google Smart Lock "Save password to Google?" dialog if it appears
        // The popup is a system-level overlay that obscures the app.
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
