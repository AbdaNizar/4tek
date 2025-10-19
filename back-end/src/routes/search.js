const express = require('express');
const router = express.Router();
const Product = require('../models/productSchema');
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');

router.get('/products'   ,  async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const limit = Math.min(parseInt(req.query.limit || '8', 10), 20);

        if (!q) return res.json([]);

        // ids par nom de cat/sub
        const [cats, subs] = await Promise.all([
            Category.find({ name: new RegExp(q, 'i') }).select('_id').lean(),
            SubCategory.find({ name: new RegExp(q, 'i') }).select('_id').lean(),
        ]);
        const catIds = cats.map(c => c._id);
        const subIds = subs.map(s => s._id);

        const products = await Product.find({
            $or: [
                { name: new RegExp(q, 'i') },
                { category: { $in: catIds } },
                { subCategory: { $in: subIds } }
            ],
            isActive: true
        })
            .select('_id name imageUrl price category subCategory')
            .limit(limit)
            .populate('category', '_id name')
            .populate('subCategory', '_id name')
            .populate('brand', 'name slug iconUrl')
            .lean();

        res.json(products.map(p => ({
            _id: p._id,
            name: p.name,
            imageUrl: p.imageUrl,
            price: p.price,
            category: p.category ? { _id: p.category._id, name: p.category.name } : undefined,
            subCategory: p.subCategory ? { _id: p.subCategory._id, name: p.subCategory.name } : undefined,
            brand: p.brand ? { _id: p.brand._id, name: p.brand.name } : undefined,
        })));
    } catch (e) {
        console.error('search error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
