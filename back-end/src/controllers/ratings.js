const mongoose = require('mongoose');
const Rating = require('../models/rating');
const path = require('path');
const {load, fill, renderBase, sendMail} = require("../functions/mailer");
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
    try {
        if (!req.user) return res.status(401).json({ error: 'Auth required' });

        const { productId, stars, comment } = req.body || {};
        if (!isObjectId(productId)) return res.status(400).json({ error: 'Invalid product id' });

        const s = Number(stars);
        if (!(s >= 1 && s <= 5)) return res.status(400).json({ error: 'Stars must be 1..5' });

        // Upsert (no .lean(), we need to populate immediately after)
        const doc = await Rating.findOneAndUpdate(
            { productId, 'user.id': req.user.id },
            {
                $set: {
                    productId,
                    stars: s,
                    comment: String(comment || '').trim(),
                    status: 'pending', // every change resets to pending
                    user: { id: req.user.id, name: req.user.name || '', email: req.user.email || '' }
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
            .populate({ path: 'productId', select: 'name imageUrl slug' })
            .exec();

        // Build response shape: { product: {...}, ... }
        const out = doc.toObject();
        out.product = out.productId || null;
        delete out.productId;

        // ---- Email: notify user their review is pending moderation ----
        try {
            const userEmail = doc?.user?.email;
            if (userEmail) {
                const SUBJECTS = {
                    pending: 'Votre avis est en attente de modération',
                };
                const MESSAGES = {
                    pending: 'Votre avis a bien été reçu et est en cours de modération.',
                };

                const status = doc.status || 'pending';
                const subject = SUBJECTS[status] || 'Mise à jour de votre avis';
                const preheader = MESSAGES[status] || 'Merci pour votre contribution.';

                const appUrl = process.env.CLIENT_URL || '';
                const slug = doc.productId?.slug || out.product?.slug;
                const reviewUrl = slug ? `${appUrl}/product/${slug}` : (appUrl || '#');

                // Load the content template (rating-status.html) and fill placeholders
                const contentTpl = load(path.join('/rating-status.html'));
                const content = fill(contentTpl, {
                    NAME: doc.user?.name || 'client',
                    PRODUCT_NAME: doc.productId?.name || out.product?.name || 'Produit',
                    COMMENT: doc.comment || '',
                    NEW_STATUS: status,
                    STARS_HTML: buildStarsHtml(doc.stars),
                    STATUS_MESSAGE: preheader,
                    REVIEW_URL: reviewUrl,
                    BRAND_NAME: '4tek',
                    ACCENT: '#22d3ee',
                });

                // Wrap with base template (header/footer)
                const html = renderBase(content, {
                    subject,
                    preheader,
                    brandName: '4tek',
                    accent: '#22d3ee',
                });

                await sendMail({ to: userEmail, subject, html });
            }
        } catch (mailErr) {
            // Do not fail the request if email fails
            console.error('Email sending error (rating pending):', mailErr);
        }

        return res.status(201).json(out);
    } catch (err) {
        console.error('createOrUpsert error:', err);
        return res.status(500).json({ error: err?.message || 'Unable to create/update rating' });
    }
};

// ===== Admin =====

// GET /ratings/admin?status=pending&q=...&page=1&pageSize=20
// GET /ratings/admin?status=pending&q=...&page=1&pageSize=20
exports.adminList = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const { status, q } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (q && q.trim()) {
        const like = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
            { 'user.email': like },
            { 'user.name': like },
            { comment: like },
        ];
    }

    const [docs, total] = await Promise.all([
        Rating.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .populate({ path: 'productId', select: 'name imageUrl slug' })
            .lean(),
        Rating.countDocuments(filter),
    ]);

    // Move populated productId into { product }, keep productId as the raw id
    const items = docs.map(r => {
        const p = r.productId && typeof r.productId === 'object'
            ? { _id: r.productId._id, name: r.productId.name, imageUrl: r.productId.imageUrl, slug: r.productId.slug }
            : null;
        return {
            ...r,
            product: p,
            productId: r.productId, // ensure productId is the id (ObjectId/string)
        };
    });
    console.log(items)
    res.json({ items, total, page, pageSize });
};

// PATCH /ratings/admin/:id/status  { status: 'approved'|'rejected' }






exports.adminSetStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // 1) find first to keep previous status
        const rating = await Rating.findById(id);
        if (!rating) return res.status(404).json({ error: 'Rating not found' });

        const prevStatus = rating.status;
        if (prevStatus === status) {
            // nothing to do
            const unchanged = await rating
                .populate({ path: 'productId', select: 'name imageUrl slug' });
            // Map to product object for front-end convenience
            const doc = unchanged.toObject();
            doc.product = unchanged.productId;
            delete doc.productId;
            return res.json(doc);
        }

        // 2) update & save
        rating.status = status;
        await rating.save();

        // 3) populate product for email & response
        const populated = await rating
            .populate({ path: 'productId', select: 'name imageUrl slug' });

        // shape payload as { product: {...}, ... }
        const out = populated.toObject();
        out.product = populated.productId;
        delete out.productId;

        // 4) send email (non-blocking for response, but awaited here with try/catch)
        try {
            const userEmail = rating.user?.email;
            if (userEmail) {
                // choose subject/message by status
                const SUBJECTS = {
                    approved: 'Votre avis a été approuvé',
                    rejected: 'Votre avis a été rejeté',
                    pending:  'Votre avis est en attente de modération',
                };
                const MESSAGES = {
                    approved: 'Merci ! Votre avis est maintenant visible.',
                    rejected: 'Votre avis a été refusé par la modération.',
                    pending:  'Votre avis a bien été reçu et est en cours de modération.',
                };

                const appUrl = process.env.CLIENT_URL || '';
                const reviewUrl = out.product?.slug
                    ? `${appUrl}/product/${out.product.slug}`
                    : appUrl || '#';

                const contentTpl = load(path.join('rating-status.html'));
                const content = fill(contentTpl, {
                    NAME: rating.user?.name || 'client',
                    PRODUCT_NAME: out.product?.name || 'Produit',

                    COMMENT: rating.comment || '',
                    NEW_STATUS: status,
                    STARS_HTML: buildStarsHtml(out.stars),
                    STATUS_MESSAGE: MESSAGES[status],
                    REVIEW_URL: reviewUrl,
                    BRAND_NAME: '4tek',
                    ACCENT: '#22d3ee',
                });

                const html = renderBase(content, {
                    subject: SUBJECTS[status],
                    preheader: MESSAGES[status],
                    brandName: '4tek',
                    accent: '#22d3ee',
                });

                await sendMail({
                    to: userEmail,
                    subject: SUBJECTS[status],
                    html,
                });
            }
        } catch (mailErr) {
            console.error('Email sending error (rating status):', mailErr);
            // don’t fail the request because of mail
        }

        return res.json(out);
    } catch (err) {
        console.error('adminSetStatus error:', err);
        return res.status(500).json({ error: err?.message || 'Unable to update rating status' });
    }
};


// DELETE /ratings/admin/:id
exports.adminDelete = async (req, res) => {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    await Rating.findByIdAndDelete(id);
    res.json({ ok: true });
};
function buildStarsHtml(stars = 0) {
    // borne entre 0 et 5
    const s = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
    const on  = '★';
    const off = '☆';
    const filled = on.repeat(s);
    const empty  = off.repeat(5 - s);
    // Couleur sur les étoiles remplies, gris sur vides
    return `
    <div style="font-size:18px;line-height:1;">
      <span style="color:#f59e0b;">${filled}</span>
      <span style="color:#cbd5e1;">${empty}</span>
      <span style="color:#64748b;font-size:14px;margin-left:6px;">(${s}/5)</span>
    </div>
  `;
}
