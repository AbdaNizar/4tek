const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const slugify = require('slugify');
const SubCategory = require('../models/subCategory');
const Category = require('../models/category');
const mongoose = require('mongoose');
const Product = require('../models/productSchema');
// util
const ensureDir = p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, {recursive: true});
};

const pub = p => p.replace(/\\/g, '/'); // windows friendly

const ROOT = path.join(__dirname, '..');
const DIRS = {
    icons: path.join(ROOT, 'uploads/subcategories/icons'),
    images: path.join(ROOT, 'uploads/subcategories/images'),
    banners: path.join(ROOT, 'uploads/subcategories/banners'),
};
Object.values(DIRS).forEach(ensureDir);

// ---------- CRUD ----------
exports.list = async (req, res) => {
    const docs = await SubCategory.find().populate('parent', 'name _id').lean();
    res.json(docs);
};

exports.getOne = async (req, res) => {
    const d = await SubCategory.findById(req.params.id).populate('parent', 'name _id').lean();
    if (!d) return res.status(404).json({error: 'Introuvable'});
    res.json(d);
};







exports.listByCategory = async (req, res) => {
    try {
        const {categoryId} = req.params;
        if (!categoryId) return res.status(400).json({error: 'categoryId requis'});
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({error: 'categoryId invalide'});
        }

        const catId = new mongoose.Types.ObjectId(categoryId);

        // One aggregation: fetch active subs of the category, then count products per sub
        const subs = await SubCategory.aggregate([
            {$match: {parent: catId, isActive: true}},
            {$sort: {name: 1}},
            {
                $lookup: {
                    from: Product.collection.name, // resolves to the real collection name (e.g., 'products')
                    let: {subId: '$_id'},
                    pipeline: [
                        {$match: {$expr: {$eq: ['$subCategory', '$$subId']}, isActive: true}},
                        {$count: 'count'}
                    ],
                    as: 'pc'
                }
            },
            {
                $addFields: {
                    productsCount: {$ifNull: [{$arrayElemAt: ['$pc.count', 0]}, 0]}
                }
            },
            {$project: {pc: 0}}
        ]);

        res.json(subs);
    } catch (e) {
        console.error('listByCategory error', e);
        res.status(500).json({error: 'Erreur serveur'});
    }
};
exports.update = async (req, res) => {
    try {
        const {name, slug, description, isActive, parentId} = req.body;
        const updates = {
            ...(name ? {name} : {}),
            ...(slug ? {slug: slugify(slug)} : {}),
            ...(description !== undefined ? {description} : {}),
            ...(isActive !== undefined ? {isActive: (isActive === 'true' || isActive === true)} : {}),
            ...(parentId ? {parent: parentId} : {})
        };


        const doc = await SubCategory.findByIdAndUpdate(req.params.id, updates, {new: true})
            .populate('parent', 'name _id')
            .lean();
        if (!doc) return res.status(404).json({error: 'Sous-catégorie introuvable'});
        res.json(doc);
    } catch (e) {
        console.error('update subcategory error', e);
        res.status(500).json({error: 'Erreur serveur'});
    }
};

exports.remove = async (req, res) => {
    const sc = await SubCategory.findById(req.params.id);
    if (!sc) return res.status(404).json({error: 'Introuvable'});

    // supprime fichiers locaux
    const delLocal = (u) => {
        if (u?.startsWith('/uploads/subcategories')) {
            const abs = path.join(ROOT, u);
            fs.existsSync(abs) && fs.unlinkSync(abs);
        }
    };
    delLocal(sc.iconUrl);
    delLocal(sc.imageUrl);
    (sc.banners || []).forEach(delLocal);

    await sc.deleteOne();
    res.json({ok: true});
};
exports.toggle = async (req, res) => {
    const d = await SubCategory.findByIdAndUpdate(req.params.id,
        {$set: {isActive: !!req.body.isActive}},
        {new: true}).populate('parent', 'name _id').lean();
    if (!d) return res.status(404).json({error: 'Introuvable'});
    res.json(d);
};

// ---------- Helpers ----------
const toBool = v => v === true || v === 'true';
const isLocalSubCategoriesPath = (url) =>
    typeof url === 'string' && url.startsWith('/uploads/categorys/');

const absFromPublic = (publicUrl) =>
    path.join(__dirname, '..', publicUrl.replace(/^\//, ''));

async function safeUnlink(absPath) {
    try {
        await fsp.unlink(absPath);
    } catch (_) { /* ignore */
    }
}

function normalizeFiles(fileOrArray) {
    if (!fileOrArray) return [];
    return Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray];
}

function uniqueName(originalName = 'file') {
    const base = String(originalName).replace(/\s+/g, '_');
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}`;
}

// ---------- REPLACE ACTION ----------
exports.replace = async (req, res) => {
    try {
        const id = req.params.id;
        const suCat = await SubCategory.findById(id);
        if (!suCat) return res.status(404).json({error: 'SubCatégorie introuvable'});

        const repIcon = toBool(req.body.replaceIcon);
        const repImage = toBool(req.body.replaceImage);
        const repBanners = toBool(req.body.replaceBanners);

        const updates = {};

        // ===== ICON =====
        if (repIcon) {
            // delete old local icon
            if (suCat.iconUrl && isLocalSubCategoriesPath(suCat.iconUrl)) {
                await safeUnlink(absFromPublic(suCat.iconUrl));
            }
            // save new (if provided) else clear
            const iconFile = normalizeFiles(req.files?.icon)[0];
            if (iconFile) {
                const name = uniqueName(iconFile.name);
                const dest = path.join(DIRS.icons, name);
                await iconFile.mv(dest);
                updates.iconUrl = `/uploads/subcategories/icons/${name}`;
            } else {
                updates.iconUrl = '';
            }
        }

        // ===== IMAGE (cover) =====
        if (repImage) {
            if (suCat.imageUrl && isLocalSubCategoriesPath(suCat.imageUrl)) {
                await safeUnlink(absFromPublic(suCat.imageUrl));
            }
            const imgFile = normalizeFiles(req.files?.image)[0];
            if (imgFile) {
                const name = uniqueName(imgFile.name);
                const dest = path.join(DIRS.images, name);
                await imgFile.mv(dest);
                updates.imageUrl = `/uploads/subcategories/images/${name}`;
            } else {
                updates.imageUrl = '';
            }
        }

        // ===== BANNERS (full replace) =====
        if (repBanners) {
            // delete all old local banners
            if (Array.isArray(suCat.banners)) {
                for (const url of suCat.banners) {
                    if (isLocalSubCategoriesPath(url)) {
                        await safeUnlink(absFromPublic(url));
                    }
                }
            }
            // save new list (if any) else empty array
            const bannerFiles = normalizeFiles(req.files?.banners);
            const newUrls = [];
            for (const bf of bannerFiles) {
                const name = uniqueName(bf.name);
                const dest = path.join(DIRS.banners, name);
                await bf.mv(dest);
                newUrls.push(`/uploads/subcategories/banners/${name}`);
            }
            updates.banners = newUrls;
        }

        const updated = await SubCategory.findByIdAndUpdate(id, updates, {new: true}).lean();
        return res.json(updated);
    } catch (e) {
        console.error('replace category error:', e);
        return res.status(500).json({error: 'Erreur serveur'});
    }
};


// ---------- CREATE ACTION (express-fileupload style, same as replace) ----------
exports.create = async (req, res) => {
    try {
        const {name, slug, description, isActive, parentId} = req.body;
        if (!name) return res.status(400).json({error: 'name requis'});
        if (!parentId) return res.status(400).json({error: 'catégorie parente requise'});

        const parent = await Category.findById(parentId).lean();
        if (!parent) return res.status(404).json({error: 'Catégorie parente introuvable'});

        const s = slug ? slugify(slug) : slugify(name);
        const exists = await SubCategory.findOne({slug: s}).lean();
        if (exists) return res.status(409).json({error: 'slug déjà utilisé'});

        // default values
        let iconUrl = '';
        let imageUrl = '';
        let banners = [];

        // ===== ICON (single) =====
        const iconFile = normalizeFiles(req.files?.icon)[0];
        if (iconFile) {
            const nameU = uniqueName(iconFile.name);
            await ensureDir(DIRS.icons);
            await iconFile.mv(path.join(DIRS.icons, nameU));
            iconUrl = `/uploads/subcategories/icons/${nameU}`;
        }

        // ===== IMAGE (single) =====
        const imageFile = normalizeFiles(req.files?.image)[0];
        if (imageFile) {
            const nameU = uniqueName(imageFile.name);
            await ensureDir(DIRS.images);
            await imageFile.mv(path.join(DIRS.images, nameU));
            imageUrl = `/uploads/subcategories/images/${nameU}`;
        }

        // ===== BANNERS (0..n) =====
        const bannerFiles = normalizeFiles(req.files?.banners);
        if (bannerFiles.length) {
            await ensureDir(DIRS.banners);
            for (const bf of bannerFiles) {
                const nameU = uniqueName(bf.name);
                await bf.mv(path.join(DIRS.banners, nameU));
                banners.push(`/uploads/subcategories/banners/${nameU}`);
            }
        }

        const payload = {
            name,
            slug: s,
            description: description || '',
            isActive: toBool(isActive),
            parent: parentId,
            iconUrl, imageUrl, banners
        };

        const doc = await SubCategory.create(payload);
        const out = await SubCategory.findById(doc._id).populate('parent', 'name _id').lean();
        res.status(201).json(out);
    } catch (e) {
        console.error('create subcategory error', e);
        // fix: 40 -> 500
        res.status(500).json({error: 'Erreur serveur'});
    }
};

