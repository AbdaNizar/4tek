// lib/pdf/mapOrderToInvoiceVars.js
const fs   = require('fs');
const path = require('path');

function guessMimeByExt(p) {
    const ext = String(p || '').toLowerCase();
    if (ext.endsWith('.png'))  return 'image/png';
    if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
    if (ext.endsWith('.svg')) return 'image/svg+xml';
    if (ext.endsWith('.webp'))return 'image/webp';
    return 'application/octet-stream';
}

function toDataUri(absPath) {
    try {
        const mime = guessMimeByExt(absPath);
        const buf  = fs.readFileSync(absPath);
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (e) {
        // En cas d’échec, on renvoie la chaîne d’origine (le template gère l’absence)
        return '';
    }
}

function normalizeLogoInput(logo) {
    if (!logo) return '';
    const s = String(logo);

    // Si déjà une URL http(s) ou data:, on laisse tel quel
    if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s;

    // Si c’est un chemin local -> on essaye data URI
    // Important: résout en chemin absolu
    const abs = path.isAbsolute(s) ? s : path.resolve(process.cwd(), s);
    return toDataUri(abs);
}

module.exports = function mapOrderToInvoiceVars(order, opts = {}) {
    const brandName = opts.brandName || '4tek';
    const currency  = order?.currency || 'TND';

    const subtotal  = Number(order?.subtotal || 0);
    const shipping  = Number(order?.shippingFee || 0);
    const tax       = Number(order?.tax || 0);
    const discount  = Number(order?.discount || 0);

    const grandTotal = Number(
        order?.total != null
            ? order.total
            : subtotal + shipping + tax - discount
    );

    const items = (order?.items || []).map(it => {
        const qty   = Number(it?.qty || 0);
        const price = Number(it?.price || 0);
        return {
            name:        it?.name || 'Article',
            description: it?.description || it?.desc || '',
            qty,
            unitPrice:   price,
            total:       qty * price
        };
    });

    const taxLabel = (order?.taxPercent != null)
        ? `TAX-VAT ${order.taxPercent}%`
        : 'TAX-VAT';

    const discountLabel = (order?.discountPercent != null)
        ? `DISCOUNT ${order.discountPercent}%`
        : 'DISCOUNT';

    // ✅ Normalise & embarque le logo
    const logo = normalizeLogoInput(opts.logo);

    return {
        currency,

        brand: {
            name:   brandName,
            slogan: opts.slogan || 'Votre partenaire technologie',
            logo:   logo || ''
        },

        invoice: {
            title:  'Facture',
            number: String(order?.number || order?._id || ''),
            date:   new Date(order?.createdAt || Date.now()).toLocaleDateString('fr-FR')
        },

        customer: {
            name:    order?.user?.name    || 'Client',
            address: order?.user?.address || '—',
            email:   order?.user?.email   || '',
            phone:   order?.user?.phone   || ''
        },

        payment: {
            accountNo:   opts.accountNo   || '123456789',
            accountName: opts.accountName || brandName,
            branchName:  opts.branchName  || 'Agence centrale'
        },

        items,

        totals: {
            subtotal,
            taxLabel,
            taxAmount: tax,
            discountLabel,
            discountAmount: discount,
            grandTotal
        },

        terms: opts.terms && opts.terms.length ? opts.terms : [
            'Le paiement est dû sous 14 jours.',
            'Tout retour sous 7 jours (conditions applicables).',
            'Conservez cette facture pour vos archives.',
            'Contactez le support pour toute réclamation.'
        ],

        sign: opts.sign || 'Responsable Comptes',

        footer: {
            address: opts.address      || '1, votre adresse ici',
            email:   opts.supportEmail || 'support@4tek.tn',
            phone:   opts.phone        || '+216 00 000 000'
        }
    };
};
