describe('Debug', () => {
    it('test timeouts', async () => {
        console.time('With Implicit');
        await $('~NonExistentElement').isDisplayed().catch(() => false);
        console.timeEnd('With Implicit');

        await driver.setTimeout({ implicit: 0 });

        console.time('Without Implicit');
        await $('~NonExistentElement').isDisplayed().catch(() => false);
        console.timeEnd('Without Implicit');
        
        await driver.setTimeout({ implicit: 15000 });
    });
});
