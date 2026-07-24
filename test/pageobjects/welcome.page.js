const BasePage = require('./base.page');

class WelcomePage extends BasePage {
    get textWelcomeHeader() {
        return $('android=new UiSelector().description("Welcome to MYBOS!")');
    }

    get btnSignIn() {
        return $('android=new UiSelector().description("Sign In")');
    }

    async isWelcomePageDisplayed() {
        try {
            return await this.textWelcomeHeader.isDisplayed();
        } catch (e) {
            return false;
        }
    }

    async clickSignIn() {
        this.log('Navigating from Welcome Page to Login Page via "Sign In" button...');
        await this.waitAndTap(this.btnSignIn, 'Sign In Button on Welcome Page');
    }
}

module.exports = new WelcomePage();
