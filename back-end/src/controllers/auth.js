const jwt = require("jsonwebtoken");
const User = require("../models/user");
const EmailToken = require('../models/emailToken');
const { randomToken, sha256 ,b64url } = require('../functions/crypto');
const { sendMail } = require('../functions/mailer');
const { CLIENT_URL, JWT_SECRET, JWT_EXPIRES } = process.env;
const { load, fill, renderBase } = require('../functions/mailer');
const path = require('path');
const RESET_TTL_MIN = Number(process.env.RESET_TTL_MIN || 60);

function signToken(user) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
}

exports.login = async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password requis' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user ) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    // Ne renvoie jamais le hash
    res.json({ token, user: { id: user._id, email: user.email, role: user.role ,  name : user.name , phone : user.phone, address : user.address,active : user.active ,isVerified : user.isVerified} });
};

exports.me = async (req, res) => {
    res.json({ user: req.user });
};


exports.register = async (req, res) => {
    try {
        const { email, password, name, phone, address } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

        // TODO: hasher password (bcrypt)
        const user = await User.create({ email, password, name, phone, address, isVerified: false });

        await sendVerifyEmail(user, req);

        return res.status(201).json({ ok: true, message: 'Compte créé. Vérifie ta boîte mail pour activer ton compte.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};


exports.resendVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (user.isVerified) return res.status(400).json({ error: 'Compte déjà vérifié' });

        // Option : supprimer anciens tokens non utilisés
        await EmailToken.deleteMany({ userId: user._id, type: 'verify', usedAt: null });

        await sendVerifyEmail(user, req);
        res.json({ ok: true, message: 'Email de vérification renvoyé' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};




function redirectWithData(res, data) {
    return res.redirect(`${CLIENT_URL}/#data=${b64url(data)}`);
}

exports.verifyEmail = async (req, res) => {
    try {
        const { token, uid } = req.query;
        console.log('req.query',req.query);
        if (!token || !uid) {
            return redirectWithData(res, { type: 'VERIFY_INVALID' });
        }

        const tokenHash = sha256(String(token)).toString();
        const record = await EmailToken.findOne({
            userId: uid, tokenHash, type: 'verify', usedAt: null
        });
        // email valid
            // try to prefill email
            const user = await User.findById(uid).lean().catch(() => null);
            if (user.isVerified && user.active)
            return redirectWithData(res, {
                type: 'EMAIL_VALID',
                email: user?.email || undefined
            });

        // Not found → invalid
        if (!record) {
            // try to prefill email
            const u = await User.findById(uid).lean().catch(() => null);
            return redirectWithData(res, {
                type: 'VERIFY_INVALID',
                email: u?.email || undefined
            });
        }

        // Expired
        if (record.expiresAt < new Date()) {
            const u = await User.findById(uid).lean().catch(() => null);
            return redirectWithData(res, {
                type: 'VERIFY_EXPIRED',
                email: u?.email || undefined
            });
        }

        // Mark verified
        await User.findByIdAndUpdate(uid, { $set: { isVerified: true, active: true } });
        record.usedAt = new Date();
        await record.save();

        // Auto-login
        const u = await User.findById(uid).lean();
        const safeUser = {
            id: u._id.toString(),
            email: u.email,
            role: u.role,
            name: u.name,
            avatar: u.avatar,
            isVerified: u.isVerified
        };
        const tokenJwt = jwt.sign(safeUser, JWT_SECRET, { expiresIn: JWT_EXPIRES || '7d' });
        await sendWelcome(safeUser.email,safeUser.name)
        return redirectWithData(res, {
            type: 'VERIFY_OK',
            token: tokenJwt,
            user: safeUser
        });
    } catch (e) {
        console.error(e);
        // fallback → invalid
        return redirectWithData(res, { type: 'VERIFY_INVALID' });
    }
};


exports.updateUser = async (req, res) => {
    try {
            const { phone, name, address, avatar } = req.body || {};
            const updates = {};
            if (typeof phone === 'string')  updates.phone  = phone.trim();
            if (typeof name === 'string')   updates.name   = name.trim();
            if (typeof address === 'string')updates.address= address.trim();
            if (typeof avatar === 'string') updates.avatar = avatar.trim();

            const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, select: '-password' });
            return res.json(user);

    } catch (e) {
        console.error('update error:', err);
        return res.status(500).json({ ok: false });
    }
};




// ---------- 1) Demande de reset ----------
exports.forgot = async (req, res) => {
    try {
        const email = (req.body?.email || '').toString().trim().toLowerCase();
        if (!email) return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });

        const generic = { ok: true, message: 'Si un compte existe, un email a été envoyé.' };

        const user = await User.findOne({ email }).exec();
        if (!user) return res.json(generic);

        const tokenRaw = randomToken(32)
        user.resetPasswordTokenHash = sha256(tokenRaw);
        user.resetPasswordExpires   = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
        await user.save();

        const resetUrl = `${CLIENT_URL}/reset-password/${tokenRaw}`;

        // === templating
        const bodyTpl = load('reset-password.html');
        const bodyFilled = fill(bodyTpl, {
            NAME: user.name || 'client',
            RESET_URL: resetUrl,
            ACCENT: '#22d3ee',
            TTL_MIN: RESET_TTL_MIN
        });

        const html = renderBase(bodyFilled, {
            subject: 'Réinitialisation du mot de passe',
            preheader: 'Cliquez pour choisir un nouveau mot de passe',
            brandName: '4tek',
            accent: '#22d3ee'
        });

        try {
            await sendMail({ to: user.email, subject: 'Réinitialisation du mot de passe', html });
        } catch (e) {
            console.error('sendMail reset error:', e);
        }

        return res.json(generic);
    } catch (err) {
        console.error('forgot error:', err);
        return res.status(500).json({ ok: false });
    }
};


// ---------- 1)  reset ----------
exports.reset = async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ ok: false });

    const tokenHash = sha256(token);

    const user = await User.findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpires: { $gt: new Date() }
    }).select('+password'); // on veut accéder au champ password
    if (!user) return res.status(400).json({ ok: false, error: 'TOKEN_INVALID' });

    user.password = password; // sera hashé via pre('save')
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires   = undefined;
    await user.save(); // ici on veut la validation

    // (optionnel) envoi mail "mot de passe changé"…

    res.json({ ok: true });
};


// --- Helpers ---
async function sendVerifyEmail(user, req) {
    const raw = randomToken(32);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await EmailToken.create({ userId: user._id, tokenHash, type: 'verify', expiresAt });
    const verifyLink = `${process.env.API_PUBLIC_URL || (req.protocol + '://' + req.get('host'))}/v1/auth/verify/email?token=${raw}&uid=${user._id}`;

    const contentTpl = load(path.join('verify-email.html'));
    const content = fill(contentTpl, {
        NAME: user.name || 'client',
        VERIFY_URL: verifyLink,
        BRAND_NAME: '4tek',
        ACCENT: '#22d3ee',
    });

    const html = renderBase(content, {
        subject: 'Active ton compte',
        preheader: 'Clique pour confirmer ton adresse email',
        brandName: '4tek',
        accent: '#22d3ee',
    });
    await sendMail({ to: user.email, subject: 'Active ton compte 4tek', html });
}


// --- Welcome
async function sendWelcome( to, name) {
    const content = fill(load('welcome.html'), {
        NAME: name || 'client',
        CTA_URL:`${CLIENT_URL}` ,
        BRAND_NAME: '4tek',
        ACCENT: '#22d3ee'
    });
    const html = renderBase(content, {
        subject: 'Bienvenue chez 4tek 🎉',
        preheader: 'Votre compte est prêt, découvrez nos nouveautés',
        brandName: '4tek',
        accent: '#22d3ee',
    });
    return sendMail({ to, subject: 'Bienvenue chez 4tek 🎉', html });
}

// --- Admin Users
const mongoose = require('mongoose');

const Order = require('../models/Order');

function toBool(v) {
    if (v === undefined) return undefined;
    if (v === null) return undefined;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase();
    if (['1','true','yes','y'].includes(s)) return true;
    if (['0','false','no','n'].includes(s)) return false;
    return undefined;
}

/**
 * GET /v1/admin/users
 * Query:
 *  - q: text search (name/email/phone)
 *  - active: true/false
 *  - verified: true/false
 *  - provider: 'google'|'facebook'|'local'
 *  - page, limit, sort (default: -createdAt)
 */
exports.getAdminUsers = async (req, res) => {
    try {
        const {
            q,
            active,
            verified,
            provider,
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query;
        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const perPage  = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip     = (pageNum - 1) * perPage;

        const match = {};
        if (q) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { name:   rx },
                { email:  rx },
                { phone:  rx },
                { address: rx },
            ];
        }

        const act = toBool(active);
        if (act !== undefined) match.active = act;

        const ver = toBool(verified);
        if (ver !== undefined) match.isVerified = ver;

        if (provider === 'google')  match['providers.google'] = { $exists: true, $ne: null };
        if (provider === 'facebook') match['providers.facebook'] = { $exists: true, $ne: null };
        if (provider === 'local')    match['providers.google'] = { $exists: false };

        // Build sort
        let sortObj = { createdAt: -1 };
        if (sort) {
            sortObj = {};
            const parts = String(sort).split(',');
            for (const part of parts) {
                const s = part.trim();
                if (!s) continue;
                if (s.startsWith('-')) sortObj[s.slice(1)] = -1;
                else sortObj[s] = 1;
            }
        }

        // Aggregate to get ordersCount
        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'orders',
                    let: { uid: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$user.id', '$$uid'] } } },
                        { $count: 'cnt' }
                    ],
                    as: 'ordersAgg'
                }
            },
            {
                $addFields: {
                    ordersCount: { $ifNull: [{ $arrayElemAt: ['$ordersAgg.cnt', 0] }, 0] }
                }
            },
            { $project: {
                    password: 0,
                    resetPasswordTokenHash: 0,
                    resetPasswordExpires: 0,
                    ordersAgg: 0
                }
            },
            { $sort: sortObj },
            { $skip: skip },
            { $limit: perPage }
        ];

        const [items, totalArr] = await Promise.all([
            User.aggregate(pipeline),
            User.aggregate([{ $match: match }, { $count: 'total' }])
        ]);

        const total = totalArr[0]?.total || 0;
        const pages = Math.max(1, Math.ceil(total / perPage));

        res.json({ items, total, page: pageNum, pages, limit: perPage });
    } catch (err) {
        console.error('getAdminUsers error:', err);
        res.status(500).json({ error: err?.message || 'Unable to fetch users' });
    }
};

exports.getAdminUserDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const user = await User.findById(id).select('-password -resetPasswordTokenHash -resetPasswordExpires');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const orders = await Order
            .find({ 'user.id': user._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ user, orders });
    } catch (err) {
        console.error('getAdminUserDetail error:', err);
        res.status(500).json({ error: err?.message || 'Unable to fetch user detail' });
    }
};

