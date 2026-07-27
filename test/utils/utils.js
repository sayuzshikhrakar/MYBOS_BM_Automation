const allureReporter = require('@wdio/allure-reporter').default;

class Utils {
    /**
     * Prints a log message and attaches it to the Allure Report
     */
    log(message) {
        const time = new Date().toLocaleTimeString();
        try {
            allureReporter.addStep(`[VERIFY] ${message}`);
        } catch (e) { }

        console.log(`\x1b[32m[${time}] [VERIFY]\x1b[0m ${message}`);
    }

    /**
     * Verifies that a given field value is displayed on the screen.
     * Performs smooth scrolling down if the element is off-screen.
     * 
     * @param {string} expectedValue - The expected text/content-desc to verify.
     * @param {string} fieldLabel - Human-readable label for logging (e.g., 'Resident Name').
     * @param {number} maxScrolls - Maximum number of scroll attempts if off-screen (default: 3).
     */
    async verifyFieldVisible(expectedValue, fieldLabel = 'Field', maxScrolls = 3) {
        if (!expectedValue) {
            console.warn(`[WARN] Skipping verification for ${fieldLabel}: expected value is empty.`);
            return;
        }

        this.log(`Verifying ${fieldLabel}: "${expectedValue}"`);

        // Selector targeting both Flutter content-desc and standard text attributes
        const xpath = `//*[contains(@content-desc, "${expectedValue}") or contains(@text, "${expectedValue}")]`;
        let element = await $(xpath);

        let isVisible = false;
        for (let i = 0; i <= maxScrolls; i++) {
            isVisible = await element.isDisplayed().catch(() => false);
            if (isVisible) break;

            if (i < maxScrolls) {
                // Scroll down smoothly using W3C pointer actions
                await browser.action('pointer')
                    .move({ x: 300, y: 800 })
                    .down()
                    .pause(300)
                    .move({ x: 300, y: 400, duration: 600 })
                    .up()
                    .perform();
                await browser.pause(500);
                element = await $(xpath);
            }
        }

        expect(isVisible).toBe(true);
        this.log(`✓ Verified ${fieldLabel}: "${expectedValue}" is displayed.`);
    }
}

module.exports = new Utils();
