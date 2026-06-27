import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    try {
        await page.goto('http://localhost:3000/r/mehfil');
        await new Promise(r => setTimeout(r, 3000));
    } catch(e) {
        console.error("GOTO ERROR", e);
    }
    await browser.close();
})();
