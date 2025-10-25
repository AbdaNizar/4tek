const Cart = require('../models/cart');

// GET /v1/cart
exports.getMyCart = async (req, res, next) => {
    try {
        console.log(req.user)
        const userId = req.user.id;
        let cart = await Cart.findOne({ user: userId });
        if (!cart) cart = await Cart.create({ user: userId, items: [] });
        res.json({ items: cart.items });
    } catch (e) { next(e); }
};

// PUT /v1/cart
exports.replaceCart = async (req, res, next) => {
    try {

        const userId = req.user.id;
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items } },
            { upsert: true, new: true }
        );
        res.json({ items: cart.items });
    } catch (e) { next(e); }
};

// POST /v1/cart/merge
exports.mergeCart = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const incoming = Array.isArray(req.body.items) ? req.body.items : [];
        let cart = await Cart.findOne({ user: userId });
        if (!cart) cart = await Cart.create({ user: userId, items: [] });

        const map = new Map();
        for (const it of cart.items) map.set(String(it.product), { ...it.toObject() });
        for (const it of incoming) {
            const key = String(it.product);
            if (map.has(key)) {
                const ex = map.get(key);
                map.set(key, { ...ex, qty: ex.qty + (it.qty || 1) });
            } else {
                map.set(key, { ...it, qty: it.qty || 1 });
            }
        }

        cart.items = Array.from(map.values());
        await cart.save();
        res.json({ items: cart.items });
    } catch (e) { next(e); }
};
