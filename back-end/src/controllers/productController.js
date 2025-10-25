const path = require('path');
const slugify = require('slugify');
const Product = require('../models/productSchema');
const Category = require('../models/category');
const SubCategory = require('../models/subCategory');
const Brand = require('../models/brand');
const Rating  = require('../models/rating');

const {checkAndCreateFolder, uniqueName, normalizeFiles} = require('../middlewares/upload');
const fs = require('fs');
const PUB = {
    root: path.join(__dirname, '..', 'uploads'),
    cover: path.join(__dirname, '..', 'uploads', 'products', 'cover'),
    gallery: path.join(__dirname, '..', 'uploads', 'products', 'gallery'),
};
checkAndCreateFolder(PUB.root);
checkAndCreateFolder(PUB.cover);
checkAndCreateFolder(PUB.gallery);


/** LIST (public) avec filtres basiques */
// models

// controllers/product.controller.js


exports.list = async (req, res) => {
    try {
        const {
            q, cat, subCat, bran, min, max, active,
            sort = '-createdAt',
            page = 1, limit = 20
        } = req.query;

        const where = {};
        if (active === 'true')  where.isActive = true;
        if (active === 'false') where.isActive = false;
        if (cat)     where.category    = cat;
        if (subCat)  where.subCategory = subCat;
        if (bran)    where.brand       = bran;
        if (min || max) {
            where.price = {
                ...(min ? { $gte: Number(min) } : {}),
                ...(max ? { $lte: Number(max) } : {})
            };
        }
        if (q) where.$text = { $search: q };

        const pageNum  = Math.max(1, Number(page)  || 1);
        const limitNum = Math.max(1, Number(limit) || 20);
        const skipNum  = (pageNum - 1) * limitNum;

        const docs = await Product.find(where)
            .sort(sort)
            .skip(skipNum)
            .limit(limitNum)
            .lean();

        const total = await Product.countDocuments(where);
        if (!docs.length) {
            return res.json({ items: [], total, page: pageNum, limit: limitNum });
        }

        const ids = docs.map(d => d._id);

        // ⚠️ Ici on utilise productId + status: 'approved'
        const ratingsAgg = await Rating.aggregate([
            { $match: { productId: { $in: ids }, status: 'approved' } },
            {
                $group: {
                    _id: '$productId',
                    ratingCount: { $sum: 1 },
                    ratingAvg:   { $avg: '$stars' }
                }
            },
            { // arrondi à 1 décimale (optionnel)
                $project: {
                    ratingCount: 1,
                    ratingAvg: { $round: ['$ratingAvg', 1] }
                }
            }
        ]);

        const byProd = new Map(
            ratingsAgg.map(r => [String(r._id), { ratingAvg: r.ratingAvg || 0, ratingCount: r.ratingCount || 0 }])
        );

        const items = docs.map(p => {
            const r = byProd.get(String(p._id)) || { ratingAvg: 0, ratingCount: 0 };
            return { ...p, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount };
        });

        res.json({ items, total, page: pageNum, limit: limitNum });
    } catch (e) {
        console.error('product list error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/** GET one (public) */
exports.getOne = async (req, res) => {
    try {
        const doc = await Product.findById(req.params.id).populate('brand', 'name slug iconUrl')
            .lean();
        if (!doc) return res.status(404).json({error: 'Produit introuvable'});
        res.json(doc);
    } catch (e) {
        res.status(500).json({error: 'Erreur serveur'});
    }
};

/** PATCH (admin) – mise à jour simple des champs (pas de remplacement fichiers ici) */
exports.update = async (req, res) => {
    try {
        const {name, slug, description,brand, subCategory,price, oldPrice, stock, sku, isActive, category, currency, tags} = req.body;
        const updates = {
            ...(name ? {name} : {}),
            ...(slug ? {slug: slugify(slug)} : {}),
            ...(description !== undefined ? {description} : {}),
            ...(price !== undefined ? {price: Number(price)} : {}),
            ...(oldPrice !== undefined ? {oldPrice: Number(oldPrice)} : {}),
            ...(stock !== undefined ? {stock: Number(stock)} : {}),
            ...(sku !== undefined ? {sku} : {}),
            ...(currency ? {currency} : {}),
            ...(isActive !== undefined ? {isActive: (isActive === 'true' || isActive === true)} : {}),
            ...(category ? {category} : {}),
            ...(brand ? {brand} : {}),
            ...(subCategory ? {subCategory} : {}),
            ...(tags !== undefined ? {tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean)} : {}),
        };

        const doc = await Product.findByIdAndUpdate(req.params.id, updates, {new: true}).lean();
        if (!doc) return res.status(404).json({error: 'Produit introuvable'});
        res.json(doc);
    } catch (e) {
        console.error('product update error:', e);
        res.status(500).json({error: 'Erreur serveur'});
    }
};

/** TOGGLE actif/inactif (admin) */
exports.toggle = async (req, res) => {
    try {
        const doc = await Product.findById(req.params.id);
        if (!doc) return res.status(404).json({error: 'Produit introuvable'});
        doc.isActive = !doc.isActive;
        await doc.save();
        res.json(doc.toObject());
    } catch (e) {
        res.status(500).json({error: 'Erreur serveur'});
    }
};

/** DELETE (admin) – ne supprime pas les fichiers pour l’instant (optionnel) */
exports.remove = async (req, res) => {
    try {
        const doc = await Product.findByIdAndDelete(req.params.id).lean();
        if (!doc) return res.status(404).json({error: 'Produit introuvable'});
        res.json({ok: true});
    } catch (e) {
        res.status(500).json({error: 'Erreur serveur'});
    }
};


// ---------- helpers ----------
const toBool = (v) => String(v ?? '').toLowerCase() === 'true';


const PUBLIC_ROOT = path.join(__dirname, '..', 'uploads');
const DIRS = {
    images: path.join(PUBLIC_ROOT, 'products', 'cover'),   // cover
    gallery: path.join(PUBLIC_ROOT, 'products', 'gallery'),  // gallery
};

const ensureDir = (d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true});
};

const isLocalProductPath = (url) => typeof url === 'string' && url.startsWith('/uploads/products/');
const absFromPublic = (url) => path.join(__dirname, '..', url.replace(/^\/+/, ''));

const safeUnlink = async (p) => {
    try {
        await fs.promises.unlink(p);
    } catch (e) {
        if (e.code !== 'ENOENT') console.warn('unlink warn:', e.message);
    }
};

// ---------- REPLACE FILES ----------
exports.replace = async (req, res) => {
    try {
        // make sure dirs exist
        ensureDir(DIRS.images);
        ensureDir(DIRS.gallery);

        const id = req.params.id;
        const prod = await Product.findById(id);
        if (!prod) return res.status(404).json({error: 'Produit introuvable'});

        // from FormData flags
        const repImage = toBool(req.body.replaceImage) || toBool(req.body.replaceCover);   // accept either name
        const repBanners = toBool(req.body.replaceBanners) || toBool(req.body.replaceGallery); // accept either name

        const updates = {};

        // ===== COVER IMAGE (full replace) =====
        if (repImage) {
            // remove old (if local)
            if (prod.imageUrl && isLocalProductPath(prod.imageUrl)) {
                await safeUnlink(absFromPublic(prod.imageUrl));
            }
            // save new file (if provided) else clear field
            const imgFile = normalizeFiles(req.files?.image)[0];
            if (imgFile) {
                const name = uniqueName(imgFile.name);
                const dest = path.join(DIRS.images, name);
                await imgFile.mv(dest);
                updates.imageUrl = `/uploads/products/cover/${name}`;
            } else {
                updates.imageUrl = '';
            }
        }

        // ===== GALLERY (full replace) =====
        if (repBanners) {
            // delete all old (if local)
            if (Array.isArray(prod.gallery)) {
                for (const url of prod.gallery) {
                    if (isLocalProductPath(url)) {
                        await safeUnlink(absFromPublic(url));
                    }
                }
            }
            // save new list (if any) else []
            const galleryFiles = normalizeFiles(req.files?.gallery);
            const newUrls = [];
            for (const file of galleryFiles) {
                const name = uniqueName(file.name);
                const dest = path.join(DIRS.gallery, name);
                await file.mv(dest);
                newUrls.push(`/uploads/products/gallery/${name}`);
            }
            updates.gallery = newUrls; // may be []
        }

        // nothing to do?
        if (!repImage && !repBanners) {
            return res.status(400).json({error: 'Aucun remplacement demandé'});
        }

        const updated = await Product.findByIdAndUpdate(id, updates, {new: true}).lean();
        return res.json(updated);
    } catch (e) {
        console.error('replace product error:', e);
        return res.status(500).json({error: 'Erreur serveur'});
    }
};

// ---------- CREATE (express-fileupload style, same as replace) ----------
exports.create = async (req, res) => {
    try {
        // ensure upload dirs exist (same as replace)
        ensureDir(DIRS.images);
        ensureDir(DIRS.gallery);

        const {
            name,
            slug,
            description,
            price,
            oldPrice,
            stock,
            subCategory,
            sku,
            isActive,
            category,
            currency,
            tags,
            brand,
        } = req.body;

        if (!name)     return res.status(400).json({ error: 'name requis' });
        if (!price)    return res.status(400).json({ error: 'price requis' });
        if (!category) return res.status(400).json({ error: 'category requis' });
        if (!brand)    return res.status(400).json({ error: 'Brand requis' });

        const cat = await Category.findById(category).lean();
        if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });

        const bra = await Brand.findById(brand).lean();
        if (!bra) return res.status(404).json({ error: 'Brand introuvable' });

        const subCat = await SubCategory.findById(subCategory).lean();
        if (!subCat) return res.status(404).json({ error: 'subCategory introuvable' });

        const s = slug ? slugify(slug) : slugify(name);
        const exists = await Product.findOne({ slug: s }).lean();
        if (exists) return res.status(409).json({ error: 'slug déjà utilisé' });

        // ----- files (express-fileupload) -----
        const coverFile    = normalizeFiles(req.files?.image)[0] || null;
        const galleryFiles = normalizeFiles(req.files?.gallery);

        let imageUrl = '';
        if (coverFile) {
            const nameU = uniqueName(coverFile.name);
            const dest  = path.join(DIRS.images, nameU);
            await coverFile.mv(dest);
            imageUrl = `/uploads/products/cover/${nameU}`;
        }

        const gallery = [];
        for (const f of galleryFiles) {
            const nameU = uniqueName(f.name);
            const dest  = path.join(DIRS.gallery, nameU);
            await f.mv(dest);
            gallery.push(`/uploads/products/gallery/${nameU}`);
        }

        // ----- payload -----
        const doc = await Product.create({
            name,
            slug: s,
            description: description || '',
            price: Number(price),
            oldPrice: oldPrice ? Number(oldPrice) : undefined,
            currency: currency || 'TND',
            stock: stock ? Number(stock) : 0,
            sku: sku || '',
            isActive: toBool(isActive),
            category: cat._id,
            subCategory: subCat._id,
            imageUrl,
            gallery,
            brand: bra._id,
            tags: Array.isArray(tags)
                ? tags
                : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []),
        });

        return res.status(201).json(doc);
    } catch (e) {
        console.error('product create error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

// controllers/products.js

exports.getBySlug = async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        console.log('slug',slug)
        if (!slug) {
            return res.status(400).json({ error: 'Slug requis' });
        }

        // If you only want active products, keep isActive:true in the filter
        const doc = await Product.findOne({ slug /*, isActive: true */ })
            .populate('brand', 'name iconUrl _id')
            .populate('category', 'name slug _id isActive')
            .populate('subCategory', 'name slug _id isActive')
            .lean();

        if (!doc) {
            return res.status(404).json({ error: 'Produit introuvable' });
        }

        // Optionally, you can ensure arrays and fallback fields are sane
        doc.gallery = Array.isArray(doc.gallery) ? doc.gallery : [];

        // If you want a quick computed list of images (optional):
        // doc.images = [doc.imageUrl, ...doc.gallery].filter(Boolean);

        return res.json(doc);
    } catch (e) {
        console.error('getBySlug error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
