// controllers/orders.js
const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/productSchema');
const SHIPPING_FLAT = 8;
const path = require('path');
const { generatePdf } = require('../lib/pdf/generatePdf');
const mapOrderToInvoiceVars = require('../lib/pdf/mapOrderToInvoiceVars');
const {sendMail, renderBase, fill, load} = require("../functions/mailer");
const STATUSES = ['pending','confirmed','shipped','delivered','cancelled'];
const ALLOWED = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped:   ['delivered','confirmed','cancelled'],
    delivered: ['delivered','shipped'],
    cancelled: ['pending','confirmed', 'cancelled']
};

const isObjectId = (v) => mongoose.isValidObjectId(v);
const toInt = (v, def = 1) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildFilter({ q, status, from, to }) {
    const filter = {};
    if (status && STATUSES.includes(status)) filter.status = status;
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q && q.trim()) {
        const s = q.trim();
        const like = new RegExp(esc(s), 'i');
        const or = [
            { 'user.email': like },
            { 'user.name': like },
            { 'user.phone': like },
            { 'items.name': like }
        ];
        if (isObjectId(s)) {
            or.push({ _id: new mongoose.Types.ObjectId(s) });
            or.push({ 'user.id': new mongoose.Types.ObjectId(s) });
        }
        filter.$or = or;
    }
    return filter;
}

function calcLineTotal(price, qty) {
    return Math.max(0, Number(price)) * Math.max(1, Number(qty));
}

// ========== CUSTOMER ==========
exports.create = async (req, res) => {
    try {
        const u = req.user;
        const { items, currency = 'TND', note } = req.body || {};

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Aucun article' });
        }
        if (!u?.phone || !u?.address) {
            return res.status(400).json({ error: 'Complétez votre numéro de téléphone et votre adresse avant de commander.' });
        }

        const productIds = items.map(i => i.productId);
        const dbProducts = await Product.find(
            { _id: { $in: productIds } },
            { price: 1, name: 1 }
        ).lean();

        const byId = new Map(dbProducts.map(p => [String(p._id), p]));
        const safeItems = items.map(i => {
            const p = byId.get(String(i.productId));
            if (!p) throw new Error(`Produit introuvable: ${i.productId}`);
            const price = Number(p.price);
            const qty = Math.max(1, Number(i.qty));
            return {
                productId: i.productId,
                name: i.name || p.name || 'Produit',
                price,
                qty,
                imageUrl: i.imageUrl,
                lineTotal: calcLineTotal(price, qty)
            };
        });

        const subtotal = safeItems.reduce((s, it) => s + it.lineTotal, 0);
        const shippingFee = items.length > 0 ? SHIPPING_FLAT : 0;
        const total = subtotal + shippingFee;

        const order = await Order.create({
            user: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                address: u.address,
                name: u.name
            },
            items: safeItems.map(({ lineTotal, ...rest }) => rest),
            currency, subtotal, shippingFee, total,
            note
        });

        res.status(201).json(order);
    } catch (e) {
        console.error('create order error', e);
        res.status(400).json({ error: e.message || 'Création impossible' });
    }
};

// controllers/orders.js
exports.getMine = async (req, res) => {
    try {
        const page  = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const q = (req.query.q || '').trim();
        const status = (req.query.status || '').trim();

        const filter = { 'user.id': req.user.id };

        // status filter
        const allowed = ['pending','confirmed','shipped','delivered','cancelled'];
        if (status && allowed.includes(status)) {
            filter.status = status;
        }



        const [items, total] = await Promise.all([
            Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Order.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page,
            pageSize: limit,
            pages: Math.max(1, Math.ceil(total / limit))
        });
    } catch (e) {
        console.error('getMine error', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};



// ========== ADMIN ==========
exports.listAdminOrders = async (req, res) => {
    try {
        const page = toInt(req.query.page, 1);
        const pageSize = Math.min(toInt(req.query.pageSize, 20), 100);
        const filter = buildFilter({
            q: req.query.q || '',
            status: req.query.status || '',
            from: req.query.from || '',
            to: req.query.to || ''
        });

        const [items, total] = await Promise.all([
            Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
            Order.countDocuments(filter)
        ]);

        res.json({ items, total, page, pageSize });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Unable to list orders' });
    }
};
exports.getById = async (req, res) => {
    const o = await Order.findById(req.params.id).lean();
    if (!o) return res.status(404).json({ error: 'Commande introuvable' });
    if (String(o.user.id) !== String(req.user.id) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(o);
};

exports.getAdminOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
        const order = await Order.findById(id).lean();
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Unable to fetch order' });
    }
};


exports.updateAdminOrderNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body || {};
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

        const order = await Order.findByIdAndUpdate(
            id,
            { $set: { note: (note || '').trim() } },
            { new: true }
        ).lean();

        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Unable to update note' });
    }
};

exports.deleteAdminOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

        const deleted = await Order.findByIdAndDelete(id).lean();
        if (!deleted) return res.status(404).json({ error: 'Order not found' });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Unable to delete order' });
    }
};

exports.getAdminOrderStats = async (_req, res) => {
    try {
        const rows = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
        const totals = Object.fromEntries(STATUSES.map(s => [s, 0]));
        for (const r of rows) {
            counts[r._id] = r.count;
            totals[r._id] = r.total;
        }

        const overall = await Order.aggregate([
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        res.json({
            byStatus: counts,
            totalsByStatus: totals,
            overall: overall[0] || { count: 0, total: 0 }
        });
    } catch (err) {
        res.status(500).json({ error: err?.message || 'Unable to compute stats' });
    }
};
const STATUS_TITLES = {
    pending:   'En attente',
    confirmed: 'Confirmée',
    shipped:   'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
};

const STATUS_MESSAGES = {
    pending:   `Nous avons bien reçu votre commande et elle est en file d'attente.`,
    confirmed: `Votre commande a été confirmée par notre équipe.`,
    shipped:   `Bonne nouvelle ! Votre commande a été expédiée.`,
    delivered: `Votre commande a été livrée. Merci pour votre confiance.`,
    cancelled: `Votre commande a été annulée. Si ce n’était pas attendu, contactez-nous.`,
};




// controllers/orders.js




exports.updateAdminOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
        if (!status || !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        console.log(status)
        const from = order.status;
        if (!ALLOWED[from]?.includes(status)) {
            return res.status(400).json({ error: `Invalid transition ${from} → ${status}` });
        }

        // Appliquer le nouveau statut
        order.status = status;
        const now = new Date();
        if (status === 'shipped')   order.shippedAt = now;
        if (status === 'delivered') order.deliveredAt = now;
        if (status === 'cancelled') order.canceledAt = now;
        if (status === 'confirmed') order.confirmedAt = now;

        await order.save();

        // Préparer l’email
        const subjectTitle = STATUS_TITLES[order.status] || order.status;
        const prevTitle    = STATUS_TITLES[from] || from;
        const message      = STATUS_MESSAGES[order.status] || `Statut mis à jour : ${subjectTitle}.`;

        const appUrl   = process.env.CLIENT_URL || (req?.protocol && req?.get ? `${req.protocol}://${req.get('host')}` : '');
        const orderUrl = `${appUrl}/mes-commandes`;
        const subject  = `Commande #${order.number || order._id} — ${subjectTitle}`;

        const contentTpl = load(path.join('order-status.html'));
        const content = fill(contentTpl, {
            NAME: order?.user?.name || 'client',
            ORDER_NUMBER: String(order.number || order._id),
            STATUS_TITLE: subjectTitle,
            STATUS_MESSAGE: message,
            PREV_STATUS: prevTitle,
            NEW_STATUS: subjectTitle,
            TOTAL_TND: (order.total || 0).toFixed(2),
            ORDER_URL: orderUrl,
            ACCENT: '#22d3ee',
            TRACKING_BLOCK: '', // tu peux remettre ton bloc tracking si présent
            BRAND_NAME: '4tek',
        });
        const html = renderBase(content, {
            subject,
            preheader: `Statut mis à jour : ${prevTitle} → ${subjectTitle}`,
            brandName: '4tek',
            accent: '#22d3ee',
        });

        // Attache la facture PDF UNIQUEMENT si confirmé
        let attachments = [];
        if (status === 'confirmed') {
            const vars = mapOrderToInvoiceVars(order, {
                brandName: '4tek',
                address: 'Adresse 4tek',
                supportEmail: 'support@4tek.tn',
                phone: '+216 00 000 000',
                accountNo: '123456789',
                accountName: '4tek',
                branchName: 'Agence centrale',
                logo: path.join(__dirname, '../../src/assets/logo.png')
            });
            const pdfBuffer = await generatePdf({
                template: 'invoice.html',
                variables: vars,
            });
            if (pdfBuffer) {
                attachments.push({
                    filename: `Facture-${order.number || order._id}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                });
            }
        }

        try {
            await sendMail({ to: order.user.email, subject, html, attachments });
        } catch (e) {
            console.error('sendMail(order status) error:', e);
        }

        return res.json(order.toObject());
    } catch (err) {
        console.error('updateAdminOrderStatus error:', err);
        return res.status(500).json({ error: err?.message || 'Unable to update status' });
    }
};

