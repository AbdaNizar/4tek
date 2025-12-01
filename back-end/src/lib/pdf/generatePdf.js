// lib/pdf/generatePdf.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

exports.generatePdf = async (options) => {
    if (!options || !options.template) return null;

    // 💡 Chemin du template : à adapter selon ta structure
    const file = path.join(
        process.cwd(),
        'templates',
        'pdf-templates',
        options.template
    );

    try {
        // Petit log utile en prod
        console.log('[generatePdf] Template path:', file);

        if (!fs.existsSync(file)) {
            console.error('[generatePdf] Template file does not exist:', file);
            return null;
        }

        // Helpers
        handlebars.registerHelper('money', (n, currency = 'TND') => {
            const num = Number(n || 0);
            return `${num.toFixed(2)} ${currency}`;
        });

        handlebars.registerHelper('eq', (a, b) => a === b);

        handlebars.registerHelper('add', (a, b) => Number(a || 0) + Number(b || 0));

        const html = fs.readFileSync(file, { encoding: 'utf-8' });
        const template = handlebars.compile(html, { noEscape: true });
        const htmlToSend = template(options.variables || {});

        // 🧠 IMPORTANT : si tu utilises PUPPETEER_SKIP_DOWNLOAD=true
        // il faut renseigner CHROME_BIN (/usr/bin/chromium-browser par ex)
        const executablePath = process.env.CHROME_BIN || undefined;

        if (!executablePath) {
            console.warn(
                '[generatePdf] CHROME_BIN is not set. Puppeteer will try to use bundled Chromium (si dispo).'
            );
        }

        const browser = await puppeteer.launch({
            executablePath, // peut être undefined, Puppeteer gère
            headless: 'new', // ou true selon ta version Node/Puppeteer
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
        });

        const page = await browser.newPage();
        await page.setContent(htmlToSend, { waitUntil: ['domcontentloaded'] });
        await page.emulateMediaType('screen');

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        await browser.close();
        return pdf;
    } catch (error) {
        console.error('Error generatePdf:', error);
        return null;
    }
};
