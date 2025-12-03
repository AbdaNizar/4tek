const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

/**
 * Génère un PDF à partir d'un template Handlebars.
 *
 * options = {
 *   template: 'invoice.html', // nom du fichier dans templates/pdf-templates
 *   variables: {...}          // données pour le template
 * }
 */
exports.generatePdf = async (options) => {
    if (!options || !options.template) {
        console.error('[generatePdf] options.template manquant');
        return null;
    }

    // ✅ On calcule le chemin du template **relatif au fichier generatePdf.js**
    // pour que ça marche en dev ET en prod (dist, pm2, etc.)
    const templateDir = path.resolve(__dirname, '../../templates/pdf-templates');
    const file = path.join(templateDir, options.template);

    // Logs utiles (à regarder en prod)
    console.log('[generatePdf] NODE_ENV:', process.env.NODE_ENV);
    console.log('[generatePdf] process.cwd():', process.cwd());
    console.log('[generatePdf] __dirname:', __dirname);
    console.log('[generatePdf] templateDir:', templateDir);
    console.log('[generatePdf] templatePath:', file);

    try {
        if (!fs.existsSync(file)) {
            console.error('[generatePdf] Template file does not exist:', file);
            return null;
        }

        // Helpers Handlebars
        handlebars.registerHelper('money', (n, currency = 'TND') => {
            const num = Number(n || 0);
            return `${num.toFixed(2)} ${currency}`;
        });

        handlebars.registerHelper('eq', (a, b) => a === b);

        handlebars.registerHelper('add', (a, b) => Number(a || 0) + Number(b || 0));

        const html = fs.readFileSync(file, { encoding: 'utf-8' });
        const template = handlebars.compile(html, { noEscape: true });
        const htmlToSend = template(options.variables || {});

        // 🧠 IMPORTANT :
        // - En dev, Puppeteer peut utiliser Chromium inclus.
        // - En prod, si PUPPETEER_SKIP_DOWNLOAD=true, il faut CHROME_BIN=/usr/bin/chromium-browser (ou similaire)
        const executablePath = process.env.CHROME_BIN || undefined;
        console.log('[generatePdf] Using executablePath =', executablePath || '(bundled Chromium)');

        let browser;

        try {
            browser = await puppeteer.launch({
                executablePath, // peut être undefined, Puppeteer gère si Chromium est présent
                headless: 'new', // ou true selon ta version Node/Puppeteer
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
                ignoreDefaultArgs: ['--disable-extensions'],
            });
        } catch (launchErr) {
            console.error('[generatePdf] Failed to launch browser:', launchErr);

            // 🔁 Tentative de fallback sans executablePath
            if (executablePath) {
                console.log('[generatePdf] Retry launch without executablePath...');
                try {
                    browser = await puppeteer.launch({
                        headless: 'new',
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                        ],
                        ignoreDefaultArgs: ['--disable-extensions'],
                    });
                } catch (fallbackErr) {
                    console.error('[generatePdf] Fallback launch also failed:', fallbackErr);
                    return null;
                }
            } else {
                // Pas de CHROME_BIN et pas de Chromium dispo
                return null;
            }
        }

        try {
            const page = await browser.newPage();
            await page.setContent(htmlToSend, { waitUntil: ['domcontentloaded', 'networkidle0'] });
            await page.emulateMediaType('screen');

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' },
            });

            await browser.close();
            return pdf;
        } catch (pageErr) {
            console.error('[generatePdf] Error while generating PDF:', pageErr);
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('[generatePdf] Error closing browser after page error:', closeErr);
            }
            return null;
        }
    } catch (error) {
        console.error('[generatePdf] Unexpected error:', error);
        return null;
    }
};
