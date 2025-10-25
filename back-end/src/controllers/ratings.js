const mongoose = require('mongoose');
const Rating = require('../models/rating');
const isObjectId = v => mongoose.isValidObjectId(v);

// GET /ratings/product/:productId  (approved only)
exports.listByProduct = async (req, res) => {
    const { productId } = req.params;
    if (!isObjectId(productId)) return res.status(400).json({ error: 'Invalid product id' });

    const rows = await Rating.find({ productId, status: 'approved' })
        .sort({ createdAt: -1 })
        .lean();

    // compute average
    const count = rows.length;
    const avg = count ? +(rows.reduce((s, r) => s + r.stars, 0) / count).toFixed(2) : 0;
    res.json({ items: rows, count, avg });
};

// GET /ratings/my/:productId  (my single rating, any status)
exports.getMineForProduct = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { productId } = req.params;
    if (!isObjectId(productId)) return res.status(400).json({ error: 'Invalid product id' });

    const row = await Rating.findOne({ productId, 'user.id': req.user.id }).lean();
    res.json(row || null);
};

// POST /ratings  { productId, stars, comment }
exports.createOrUpsert = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { productId, stars, comment } = req.body || {};
    if (!isObjectId(productId)) return res.status(400).json({ error: 'Invalid product id' });
    const s = Number(stars);
    if (!(s >= 1 && s <= 5)) return res.status(400).json({ error: 'Stars must be 1..5' });

    // upsert but always reset status to pending on modification
    const doc = await Rating.findOneAndUpdate(
        { productId, 'user.id': req.user.id },
        {
            $set: {
                productId,
                stars: s,
                comment: (comment || '').trim(),
                status: 'pending',
                user: { id: req.user.id, name: req.user.name || '', email: req.user.email }
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(201).json(doc);
};

// ===== Admin =====

// GET /ratings/admin?status=pending&q=...&page=1&pageSize=20
exports.adminList = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const { status, q } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (q && q.trim()) {
        const like = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ 'user.email': like }, { 'user.name': like }, { comment: like }];
    }

    const [items, total] = await Promise.all([
        Rating.find(filter).sort({ createdAt: -1 }).skip((page-1)*pageSize).limit(pageSize).lean(),
        Rating.countDocuments(filter)
    ]);

    res.json({ items, total, page, pageSize });
};

// PATCH /ratings/admin/:id/status  { status: 'approved'|'rejected' }
exports.adminSetStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!['approved','rejected','pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const row = await Rating.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
    if (!row) return res.status(404).json({ error: 'Rating not found' });
    res.json(row);
};

// DELETE /ratings/admin/:id
exports.adminDelete = async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    await Rating.findByIdAndDelete(id);
    res.json({ ok: true });
};
