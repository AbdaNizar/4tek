// controllers/orders.js
const mongoose = require('mongoose');
const path = require('path');

const Order = require('../models/order');
const Product = require('../models/productSchema');
const { generatePdf } = require('../lib/pdf/generatePdf');
const mapOrderToInvoiceVars = require('../lib/pdf/mapOrderToInvoiceVars');
const { sendMail, renderBase, fill, load } = require('../functions/mailer');

const SHIPPING_FLAT = 8;

const STATUSES = ['pending','confirmed','shipped','delivered','cancelled'];
const ALLOWED = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped:   ['delivered','confirmed','cancelled'],
    delivered: ['delivered','shipped'],
    cancelled: ['pending','confirmed', 'cancelled']
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

/* ------------------------------------------------------------------ */
/*                 GÉLAGE DES COÛTS (unitCost) - IDÉMPOTENT           */
/* ------------------------------------------------------------------ */
// Remplit items[].unitCost depuis Product.cost si vide/0.
// N’écrase jamais un unitCost déjà présent.
async function freezeOrderCosts(order) {
    const needIds = order.items
        .filter(it => !it.unitCost || it.unitCost <= 0)
        .map(it => String(it.productId));

    if (needIds.length === 0) return order;

    const prods = await Product.find(
        { _id: { $in: needIds } },
        { cost: 1 }
    ).lean();
    const costMap = new Map(prods.map(p => [String(p._id), Number(p.cost || 0)]));

    order.items = order.items.map(it => {
        if (it.unitCost && it.unitCost > 0) return it;
        it.unitCost = costMap.get(String(it.productId)) || 0;
        return it;
    });

    return order;
}

/* ============================== CUSTOMER ============================== */
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

        // Charger les produits
        const productIds = items.map(i => i.productId);
        const dbProducts = await Product.find(
            { _id: { $in: productIds } },
            { price: 1, name: 1, imageUrl: 1, cost: 1 }
        ).lean();
        const byId = new Map(dbProducts.map(p => [String(p._id), p]));

        // Construire les lignes sûres (geler le coût dès la création)
        const safeItems = items.map(i => {
            const p = byId.get(String(i.productId));
            if (!p) throw new Error(`Produit introuvable: ${i.productId}`);
            const price = Number(p.price || 0);
            const qty = Math.max(1, Number(i.qty));
            return {
                productId: i.productId,
                name: i.name || p.name || 'Produit',
                price,
                qty,
                imageUrl: i.imageUrl || p.imageUrl || '',
                unitCost: Number(p.cost || 0) // ✅ coût gelé ici
            };
        });

        const subtotal = safeItems.reduce((s, it) => s + calcLineTotal(it.price, it.qty), 0);
        const shippingFee = items.length > 0 ? SHIPPING_FLAT : 0;
        const total = subtotal + shippingFee;

        let order = await Order.create({
            user: {
                id: u.id,
                email: u.email,
                phone: u.phone,
                address: u.address,
                name: u.name
            },
            items: safeItems,
            currency, subtotal, shippingFee, total,
            note
        });

        // Filet de sécurité (si certains unitCost étaient restés vides)
        order = await freezeOrderCosts(order);
        await order.save();

        res.status(201).json(order.toObject());
    } catch (e) {
        console.error('create order error', e);
        res.status(400).json({ error: e.message || 'Création impossible' });
    }
};

exports.getMine = async (req, res) => {
    try {
        const page  = Math.max(1, Number(req.query.page) || 1);
        // ✅ accepte pageSize (front) ou limit (legacy)
        const limit = Math.min(100, Math.max(1, Number(req.query.pageSize || req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const status = (req.query.status || '').trim();

        const filter = { 'user.id': req.user.id };
        const allowed = ['pending','confirmed','shipped','delivered','cancelled'];
        if (status && allowed.includes(status)) filter.status = status;

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

/* =============================== ADMIN =============================== */
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

exports.updateAdminOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
        if (!status || !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const from = order.status;
        if (!ALLOWED[from]?.includes(status)) {
            return res.status(400).json({ error: `Invalid transition ${from} → ${status}` });
        }

        // ✅ si on passe à confirmed/shipped/delivered → s'assurer que le coût est gelé
        if (['confirmed','shipped','delivered'].includes(status)) {
            await freezeOrderCosts(order); // idempotent
        }

        // Appliquer le nouveau statut
        order.status = status;
        const now = new Date();
        if (status === 'shipped')   order.shippedAt   = now;
        if (status === 'delivered') order.deliveredAt = now;
        if (status === 'cancelled') order.canceledAt  = now;
        if (status === 'confirmed') order.confirmedAt = now;

        await order.save();

        // Email client
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
            TRACKING_BLOCK: '',
            BRAND_NAME: '4tek',
        });
        const html = renderBase(content, {
            subject,
            preheader: `Statut mis à jour : ${prevTitle} → ${subjectTitle}`,
            brandName: '4tek',
            accent: '#22d3ee',
        });

        // Joindre facture PDF uniquement quand "confirmed"
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

/* ========================== ADMIN ANALYTICS =========================== */
/**
 * GET /v1/admin/consumption?userId=&from=&to=
 * Retourne:
 *  - summary: { ordersCount, revenue, cost, margin }
 *  - byProduct: [{ productId, productName, qty, revenue, cost, margin }]
 *  - byOrder:   [{ orderId, date, userEmail, itemsRevenue, itemsCost, margin }]
 */
exports.getAdminConsumption = async (req, res) => {
    try {
        const { userId, from, to } = req.query || {};
        const match = {};
        if (userId && isObjectId(userId)) match['user.id'] = new mongoose.Types.ObjectId(userId);
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(from);
            if (to)   match.createdAt.$lte = new Date(to);
        }

        // byProduct
        const byProduct = await Order.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $project: {
                    productId: '$items.productId',
                    productName: '$items.name',
                    qty: '$items.qty',
                    revenue: { $multiply: ['$items.price', '$items.qty'] },
                    cost:    { $multiply: [{ $ifNull: ['$items.unitCost', 0] }, '$items.qty'] }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    productName: { $last: '$productName' },
                    qty: { $sum: '$qty' },
                    revenue: { $sum: '$revenue' },
                    cost: { $sum: '$cost' }
                }
            },
            { $addFields: { margin: { $subtract: ['$revenue', '$cost'] } } },
            { $sort: { revenue: -1 } }
        ]);

        // summary (global sur items)
        const summaryRow = await Order.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    ordersCount: { $addToSet: '$_id' }, // set unique
                    revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    cost: { $sum: { $multiply: [{ $ifNull: ['$items.unitCost', 0] }, '$items.qty'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    ordersCount: { $size: '$ordersCount' },
                    revenue: 1,
                    cost: 1,
                    margin: { $subtract: ['$revenue', '$cost'] }
                }
            }
        ]);
        const summary = summaryRow[0] || { ordersCount: 0, revenue: 0, cost: 0, margin: 0 };

        // byOrder
        const byOrder = await Order.aggregate([
            { $match: match },
            {
                $project: {
                    orderId: '$_id',
                    date: '$createdAt',
                    userEmail: '$user.email',
                    itemsRevenue: {
                        $sum: {
                            $map: {
                                input: '$items',
                                as: 'it',
                                in: { $multiply: ['$$it.price', '$$it.qty'] }
                            }
                        }
                    },
                    itemsCost: {
                        $sum: {
                            $map: {
                                input: '$items',
                                as: 'it',
                                in: { $multiply: [{ $ifNull: ['$$it.unitCost', 0] }, '$$it.qty'] }
                            }
                        }
                    }
                }
            },
            { $addFields: { margin: { $subtract: ['$itemsRevenue', '$itemsCost'] } } },
            { $sort: { date: -1 } }
        ]);

        res.json({ summary, byProduct, byOrder });
    } catch (e) {
        console.error('getAdminConsumption error:', e);
        res.status(500).json({ error: 'Unable to compute consumption' });
    }
};

/**
 * GET /v1/admin/consumption.csv?userId=&from=&to=
 * Export CSV (par produit)
 */
exports.exportAdminConsumptionCsv = async (req, res) => {
    try {
        // on réutilise la logique ci-dessus mais seulement par produit
        req.query = req.query || {};
        const { userId, from, to } = req.query;
        const match = {};
        if (userId && isObjectId(userId)) match['user.id'] = new mongoose.Types.ObjectId(userId);
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(from);
            if (to)   match.createdAt.$lte = new Date(to);
        }

        const rows = await Order.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $project: {
                    productId: '$items.productId',
                    productName: '$items.name',
                    qty: '$items.qty',
                    revenue: { $multiply: ['$items.price', '$items.qty'] },
                    cost:    { $multiply: [{ $ifNull: ['$items.unitCost', 0] }, '$items.qty'] }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    productName: { $last: '$productName' },
                    qty: { $sum: '$qty' },
                    revenue: { $sum: '$revenue' },
                    cost: { $sum: '$cost' }
                }
            },
            { $addFields: { margin: { $subtract: ['$revenue', '$cost'] } } },
            { $sort: { revenue: -1 } }
        ]);

        // CSV
        const header = ['productId','productName','qty','revenue','cost','margin'];
        const lines = [header.join(',')];
        for (const r of rows) {
            lines.push([
                JSON.stringify(String(r._id)),
                JSON.stringify(r.productName || ''),
                r.qty || 0,
                (r.revenue || 0).toFixed(2),
                (r.cost || 0).toFixed(2),
                ((r.revenue || 0) - (r.cost || 0)).toFixed(2)
            ].join(','));
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="consumption.csv"');
        res.send('\uFEFF' + lines.join('\n')); // BOM UTF-8
    } catch (e) {
        console.error('exportAdminConsumptionCsv error:', e);
        res.status(500).json({ error: 'Unable to export CSV' });
    }
};
