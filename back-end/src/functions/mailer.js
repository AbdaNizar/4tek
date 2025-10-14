const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const {
    SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
} = process.env;

const transporter = nodemailer.createTransport(
    {

        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: String(SMTP_SECURE || 'false') === 'true',
        requireTLS: true,
        auth: SMTP_USER ? {user: SMTP_USER, pass: SMTP_PASS} : undefined,
        tls: {
            servername: process.env.SMTP_HOST || 'mail.4tek.tn',
            rejectUnauthorized: true
        }
    }
);


async function sendMail({to, subject, html, text}) {
    const info = await transporter.sendMail({
        from: `"${"4tek"}" <${MAIL_FROM || SMTP_USER}>`,
        to,
        subject,
        text: text || "",
        html: html.replace('%%LOGO_URL%%', 'cid:brandLogo'),
        attachments: [
            {filename: 'logo.png', path: path.join(__dirname, '../assets/logo.png'), cid: 'brandLogo'}
        ]
    });

    console.log("✅ Mail envoyé:", info.messageId);
    return info;
}


function load(file) {
    return fs.readFileSync(path.join(__dirname, '..', 'templates', file), 'utf8');
}

function fill(template, map) {
    let html = template;
    for (const [key, value] of Object.entries(map)) {
        const re = new RegExp(`%%${key}%%`, 'g');
        html = html.replace(re, value ?? '');
    }
    return html;
}

function renderBase(contentHtml, vars = {}) {
    const base = load('base.html');
    const map = {
        SUBJECT: vars.subject || 'Notification 4tek',
        PREHEADER: vars.preheader || '',
        BRAND_NAME: vars.brandName || '4tek',
        ACCENT: vars.accent || '#22d3ee',
        // SUPPORT_EMAIL: vars.supportEmail || 'support@4tek.tn',
        // FACEBOOK_URL: vars.facebookUrl || 'https://facebook.com/',
        // INSTAGRAM_URL: vars.instagramUrl || 'https://instagram.com/',
        YEAR: String(new Date().getFullYear()),
        CONTENT: contentHtml || ''
    };
    return fill(base, map);
}

module.exports = {load, fill, renderBase, sendMail};

