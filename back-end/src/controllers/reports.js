// src/controllers/admin.reports.js
const mongoose = require('mongoose');
const Order = require('../models/order');
const Product = require('../models/productSchema'); // utilisé par $lookup
const { Types } = mongoose;

function parseDay(s) {
    if (!s) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
}

function buildMatch(q) {
    const m = {};

    // période
    const from = parseDay(q.from);
    const to   = parseDay(q.to);
    if (from || to) {
        m.createdAt = {};
        if (from) m.createdAt.$gte = from;
        if (to) {
            const next = new Date(to.getTime() + 24*60*60*1000);
            m.createdAt.$lt = next; // inclure toute la journée "to"
        }
    }

    // userId
    if (q.userId && Types.ObjectId.isValid(String(q.userId))) {
        m['user.id'] = new Types.ObjectId(String(q.userId));
    }

    // statut: par défaut, on exclut cancelled
    if (typeof q.status === 'string' && q.status.trim() !== '') {
        m.status = q.status.trim();
    } else {
        m.status = { $ne: 'cancelled' };
    }

    return m;
}

// pipeline commun: détail d'items + récupération du coût via Product.cost
function withItemsAndCost(match) {
    return [
        { $match: match },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'prod'
            }
        },
        {
            $set: {
                // si pas de produit ou pas de cost -> 0
                unitCost: { $ifNull: [{ $arrayElemAt: ['$prod.cost', 0] }, 0] }
            }
        }
    ];
}

/** GET /v1/admin/reports/summary
 *  -> { ordersCount, revenue, cost, margin }
 *  CA = somme(items.price * qty), hors livraison
 */
exports.getSummary = async (req, res) => {
    try {
        const match = buildMatch(req.query);
        const pipeline = [
            ...withItemsAndCost(match),
            {
                $group: {
                    _id: '$_id',
                    itemsRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    itemsCost:    { $sum: { $multiply: ['$unitCost',   '$items.qty'] } }
                }
            },
            {
                $group: {
                    _id: null,
                    ordersCount: { $sum: 1 },
                    revenue:     { $sum: '$itemsRevenue' },
                    cost:        { $sum: '$itemsCost' }
                }
            },
            {
                $project: {
                    _id: 0,
                    ordersCount: 1,
                    revenue: { $ifNull: ['$revenue', 0] },
                    cost:    { $ifNull: ['$cost', 0] },
                    margin:  { $subtract: [{ $ifNull: ['$revenue', 0] }, { $ifNull: ['$cost', 0] }] }
                }
            }
        ];

        const [doc] = await Order.aggregate(pipeline);
        res.json(doc || { ordersCount: 0, revenue: 0, cost: 0, margin: 0 });
    } catch (err) {
        console.error('getSummary error:', err);
        res.status(500).json({ error: 'Unable to compute summary' });
    }
};

/** GET /v1/admin/reports/consumption
 *  -> { items: [{ productId, productName, qty, revenue, cost, margin }], total }
 */
exports.getConsumption = async (req, res) => {
    try {
        const match = buildMatch(req.query);
        const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit || '500', 10)));

        const pipeline = [
            ...withItemsAndCost(match),
            {
                $group: {
                    _id: '$items.productId',
                    productName: { $last: '$items.name' },
                    qty:         { $sum: '$items.qty' },
                    revenue:     { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    cost:        { $sum: { $multiply: ['$unitCost',   '$items.qty'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    productName: { $ifNull: ['$productName', ''] },
                    qty: 1,
                    revenue: { $ifNull: ['$revenue', 0] },
                    cost:    { $ifNull: ['$cost', 0] },
                    margin:  { $subtract: [{ $ifNull: ['$revenue', 0] }, { $ifNull: ['$cost', 0] }] }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: limit }
        ];

        const rows = await Order.aggregate(pipeline);
        res.json({ items: rows, total: rows.length });
    } catch (err) {
        console.error('getConsumption error:', err);
        res.status(500).json({ error: 'Unable to compute consumption' });
    }
};

/** GET /v1/admin/reports/by-order
 *  -> { items: [{ orderId, date, userEmail, itemsRevenue, itemsCost, margin }], total }
 */
exports.getByOrder = async (req, res) => {
    try {
        const match = buildMatch(req.query);
        const pipeline = [
            ...withItemsAndCost(match),
            {
                $group: {
                    _id: '$_id',
                    createdAt: { $first: '$createdAt' },
                    userEmail: { $first: '$user.email' },
                    itemsRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    itemsCost:    { $sum: { $multiply: ['$unitCost',   '$items.qty'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    orderId: '$_id',
                    date: '$createdAt',
                    userEmail: 1,
                    itemsRevenue: { $ifNull: ['$itemsRevenue', 0] },
                    itemsCost:    { $ifNull: ['$itemsCost', 0] },
                    margin:       { $subtract: [{ $ifNull: ['$itemsRevenue', 0] }, { $ifNull: ['$itemsCost', 0] }] }
                }
            },
            { $sort: { date: -1 } }
        ];

        const rows = await Order.aggregate(pipeline);
        res.json({ items: rows, total: rows.length });
    } catch (err) {
        console.error('getByOrder error:', err);
        res.status(500).json({ error: 'Unable to compute by-order margin' });
    }
};

/** GET /v1/admin/reports/consumption.csv
 *  -> CSV (productId,productName,qty,revenue,cost,margin)
 */
exports.getConsumptionCsv = async (req, res) => {
    try {
        const match = buildMatch(req.query);
        const pipeline = [
            ...withItemsAndCost(match),
            {
                $group: {
                    _id: '$items.productId',
                    productName: { $last: '$items.name' },
                    qty:         { $sum: '$items.qty' },
                    revenue:     { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                    cost:        { $sum: { $multiply: ['$unitCost',   '$items.qty'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    productName: { $ifNull: ['$productName', ''] },
                    qty: 1,
                    revenue: { $ifNull: ['$revenue', 0] },
                    cost:    { $ifNull: ['$cost', 0] },
                    margin:  { $subtract: [{ $ifNull: ['$revenue', 0] }, { $ifNull: ['$cost', 0] }] }
                }
            },
            { $sort: { revenue: -1 } }
        ];

        const rows = await Order.aggregate(pipeline);

        const esc = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const header = ['productId', 'productName', 'qty', 'revenue', 'cost', 'margin'];
        const body = rows.map(r => [
            r.productId,
            r.productName || '',
            r.qty,
            Number(r.revenue || 0).toFixed(2),
            Number(r.cost || 0).toFixed(2),
            Number(r.margin || 0).toFixed(2)
        ].map(esc).join(','));

        const csv = [header.join(','), ...body].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="consumption.csv"');
        res.send(csv);
    } catch (err) {
        console.error('getConsumptionCsv error:', err);
        res.status(500).json({ error: 'Unable to export CSV' });
    }
};
