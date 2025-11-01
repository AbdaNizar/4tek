// controllers/brand.controller.js
const Brand = require('../models/brand');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const slugify = require("slugify");
const Category = require("../models/category");
const ROOT = path.join(__dirname, '..');

exports.list = async (req, res) => {
    try {
        const onlyActive = req.query.active === '1';
        const q = onlyActive ? { isActive: true } : {};
        const items = await Brand.find(q).sort({ name: 1 }).lean();
        res.json(items);
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
};

exports.get = async (req, res) => {
    const it = await Brand.findById(req.params.id).lean();
    if (!it) return res.status(404).json({ error: 'Not found' });
    res.json(it);
};



exports.update = async (req, res) => {
    try {
        const { name, slug, isActive } = req.body;
        const b = await Brand.findByIdAndUpdate(
            req.params.id,
            { name, slug, isActive: isActive !== 'false' },
            { new: true }
        ).lean();
        if (!b) return res.status(404).json({ error: 'Not found' });
        res.json(b);
    } catch (e) { res.status(500).json({ error: 'Update brand failed' }); }
};


// ---------- Config (make sure these exist somewhere in your module) ----------


const PUBLIC_ROOT = path.join(__dirname, '..', 'uploads');
const DIRS = {
    brandIcons: path.join(PUBLIC_ROOT, 'brands', 'icons'),
};

const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

// ---------- Helpers ----------
const toBool = (v) => v === true || v === 'true';
const isLocalBrandPath = (url) => typeof url === 'string' && url.startsWith('/uploads/brands/');
const absFromPublic = (publicUrl) => path.join(__dirname, '..', publicUrl.replace(/^\//, ''));
async function safeUnlink(absPath) { try { await fsp.unlink(absPath); } catch (_) {} }
function normalizeFiles(fileOrArray) { if (!fileOrArray) return []; return Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray]; }
function uniqueName(originalName = 'file') {
    const base = String(originalName).replace(/\s+/g, '_');
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}`;
}

// ---------- REPLACE ICON (Brand) ----------
exports.replaceIcon = async (req, res) => {
    try {
        ensureDir(DIRS.brandIcons);

        const b = await Brand.findById(req.params.id);
        if (!b) return res.status(404).json({ error: 'Not found' });

        const icon = normalizeFiles(req.files?.icon)[0];
        if (!icon) return res.status(400).json({ error: 'No file' });

        // delete old only if local path
        if (b.iconUrl && isLocalBrandPath(b.iconUrl)) {
            await safeUnlink(absFromPublic(b.iconUrl));
        }

        const fname = uniqueName(icon.name);
        await icon.mv(path.join(DIRS.brandIcons, fname));
        b.iconUrl = `/uploads/brands/icons/${fname}`;
        await b.save();

        return res.json(b.toObject());
    } catch (e) {
        console.error('replace brand icon error:', e);
        return res.status(500).json({ error: 'Replace icon failed' });
    }
};

// ---------- CREATE (Brand) ----------
exports.create = async (req, res) => {
    try {
        ensureDir(DIRS.brandIcons);

        const { name, slug, isActive } = req.body || {};
        if (!name) return res.status(400).json({ error: 'name requis' });

        const s = slug ? slugify(slug) : slugify(name);
        const exists = await Brand.findOne({ slug: s }).lean();
        if (exists) return res.status(409).json({ error: 'slug déjà utilisé' });

        const brand = new Brand({
            name,
            slug: s,
            isActive: toBool(isActive),
        });

        const iconFile = normalizeFiles(req.files?.icon)[0];
        if (iconFile) {
            const nameU = uniqueName(iconFile.name);
            await iconFile.mv(path.join(DIRS.brandIcons, nameU));
            brand.iconUrl = `/uploads/brands/icons/${nameU}`;
        }

        await brand.save();
        return res.status(201).json(brand.toObject());
    } catch (e) {
        console.error('create brand error:', e);
        return res.status(500).json({ error: 'Create brand failed' });
    }
};

exports.remove = async (req, res) => {
    try {
        const b = await Brand.findByIdAndDelete(req.params.id).lean();
        res.json({ ok: !!b });
    } catch (e) { res.status(500).json({ error: 'Delete brand failed' }); }
};
exports.toggle = async (req, res) => {
    try {
        const id = req.params.id;
        const next = req.body.isActive;
        const doc = await Brand.findByIdAndUpdate(id, { isActive : !!next }, { new: true }).lean();
        if (!doc) return res.status(404).json({ error: 'brand introuvable' });
        res.json(doc);
    } catch (e) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
