const slugify = require('slugify');
const Category = require('../models/category');
const path = require("path");
const fs = require('fs');

exports.list = async (_req, res) => {
    const items = await Category.find().lean();
    res.json(items);
};

exports.getOne = async (req, res) => {
    try {
        const cat = await Category.findById(req.params.id).lean();
        if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
        res.json(cat);
    } catch (e) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};


















exports.update = async (req, res) => {
    try {
        const { name, slug, description, isActive } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (slug) updates.slug = slugify(slug);
        if (description !== undefined) updates.description = description;
        if (isActive !== undefined) updates.isActive = (isActive === 'true' || isActive === true);


        const doc = await Category.findByIdAndUpdate(
            req.params.id, updates, { new: true }
        ).lean();

        if (!doc) return res.status(404).json({ error: 'Catégorie introuvable' });
        res.json(doc);
    } catch (e) {
        console.error('update category error:', e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.toggle = async (req, res) => {
    try {
        const id = req.params.id;
        const next = req.body.isActive; // boolean
        const doc = await Category.findByIdAndUpdate(id, { isActive: !!next }, { new: true }).lean();
        if (!doc) return res.status(404).json({ error: 'Catégorie introuvable' });
        res.json(doc);
    } catch (e) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.remove = async (req, res) => {
    try {
        const ok = await Category.findByIdAndDelete(req.params.id).lean();
        if (!ok) return res.status(404).json({ error: 'Catégorie introuvable' });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};



// ---------- Config folders ----------
const UP_ROOT = path.join(__dirname, '..', 'uploads', 'categorys');
const DIRS = {
    icons:   path.join(UP_ROOT, 'icons'),
    images:  path.join(UP_ROOT, 'images'),
    banners: path.join(UP_ROOT, 'banners'),
};

// Ensure folders exist
Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- Helpers ----------
const toBool = v => v === true || v === 'true';
const isLocalCategoryPath = (url) =>
    typeof url === 'string' && url.startsWith('/uploads/categorys/');

const absFromPublic = (publicUrl) =>
    path.join(__dirname, '..', publicUrl.replace(/^\//, ''));

async function safeUnlink(absPath) {
    try { await fsp.unlink(absPath); } catch (_) { /* ignore */ }
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
        const cat = await Category.findById(id);
        if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });

        const repIcon    = toBool(req.body.replaceIcon);
        const repImage   = toBool(req.body.replaceImage);
        const repBanners = toBool(req.body.replaceBanners);

        const updates = {};

        // ===== ICON =====
        if (repIcon) {
            // delete old local icon
            if (cat.iconUrl && isLocalCategoryPath(cat.iconUrl)) {
                await safeUnlink(absFromPublic(cat.iconUrl));
            }
            // save new (if provided) else clear
            const iconFile = normalizeFiles(req.files?.icon)[0];
            if (iconFile) {
                const name = uniqueName(iconFile.name);
                const dest = path.join(DIRS.icons, name);
                await iconFile.mv(dest);
                updates.iconUrl = `/uploads/categorys/icons/${name}`;
            } else {
                updates.iconUrl = '';
            }
        }

        // ===== IMAGE (cover) =====
        if (repImage) {
            if (cat.imageUrl && isLocalCategoryPath(cat.imageUrl)) {
                await safeUnlink(absFromPublic(cat.imageUrl));
            }
            const imgFile = normalizeFiles(req.files?.image)[0];
            if (imgFile) {
                const name = uniqueName(imgFile.name);
                const dest = path.join(DIRS.images, name);
                await imgFile.mv(dest);
                updates.imageUrl = `/uploads/categorys/images/${name}`;
            } else {
                updates.imageUrl = '';
            }
        }

        // ===== BANNERS (full replace) =====
        if (repBanners) {
            // delete all old local banners
            if (Array.isArray(cat.banners)) {
                for (const url of cat.banners) {
                    if (isLocalCategoryPath(url)) {
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
                newUrls.push(`/uploads/categorys/banners/${name}`);
            }
            updates.banners = newUrls;
        }

        const updated = await Category.findByIdAndUpdate(id, updates, { new: true }).lean();
        return res.json(updated);
    } catch (e) {
        console.error('replace category error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
// ---------- CREATE ACTION (express-fileupload style, same as replace) ----------
exports.create = async (req, res) => {
    try {
        const { name, slug, description, isActive } = req.body || {};
        if (!name) return res.status(400).json({ error: 'name requis' });

        const s = slug
            ? slugify(slug, { lower: true, strict: true })
            : slugify(name, { lower: true, strict: true });

        // slug unique?
        const exists = await Category.findOne({ slug: s }).lean();
        if (exists) return res.status(409).json({ error: 'slug déjà utilisé' });

        // Defaults
        let iconUrl = '';
        let imageUrl = '';
        let banners  = [];

        // ----- ICON (single) -----
        const iconFile = normalizeFiles(req.files?.icon)[0];
        if (iconFile) {
            const nameU = uniqueName(iconFile.name);
            const dest  = path.join(DIRS.icons, nameU);
            await iconFile.mv(dest);
            iconUrl = `/uploads/categorys/icons/${nameU}`;
        }

        // ----- IMAGE (single) -----
        const imageFile = normalizeFiles(req.files?.image)[0];
        if (imageFile) {
            const nameU = uniqueName(imageFile.name);
            const dest  = path.join(DIRS.images, nameU);
            await imageFile.mv(dest);
            imageUrl = `/uploads/categorys/images/${nameU}`;
        }

        // ----- BANNERS (0..n) -----
        const bannerFiles = normalizeFiles(req.files?.banners);
        if (bannerFiles.length) {
            const newUrls = [];
            for (const bf of bannerFiles) {
                const nameU = uniqueName(bf.name);
                const dest  = path.join(DIRS.banners, nameU);
                await bf.mv(dest);
                newUrls.push(`/uploads/categorys/banners/${nameU}`);
            }
            banners = newUrls;
        }

        const payload = {
            name,
            slug: s,
            description: description || '',
            isActive: toBool(isActive),
            iconUrl,
            imageUrl,
            banners,
        };

        const doc = await Category.create(payload);
        const out = await Category.findById(doc._id).lean(); // or .populate(...) if needed
        return res.status(201).json(out);
    } catch (e) {
        console.error('create category error:', e);
        return res.status(500).json({ error: e.message || 'Erreur serveur' });
    }
};
