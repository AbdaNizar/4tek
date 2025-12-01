// lib/pdf/generatePdf.js
const puppeteer = require('puppeteer');

const path       = require('path');
const fs         = require('fs');
const handlebars = require('handlebars');

exports.generatePdf = async (options) => {
    if (!options || !options.template) return null;

    const file = path.join(__dirname, `../../templates/pdf-templates/${options.template}`);

    try {
        // Helpers
        handlebars.registerHelper('money', (n, currency = 'TND') => {
            const num = Number(n || 0);
            return `${num.toFixed(2)} ${currency}`;
        });
        handlebars.registerHelper('eq', (a, b) => a === b);
        handlebars.registerHelper('add', (a, b) => Number(a || 0) + Number(b || 0)); // 👈 NEW

        const html = fs.readFileSync(file, { encoding: 'utf-8' });
        const template = handlebars.compile(html, { noEscape: true });
        const htmlToSend = template(options.variables || {});

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
