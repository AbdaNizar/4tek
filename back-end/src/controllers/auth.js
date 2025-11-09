// src/controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/user");
const Order = require("../models/order");
const EmailToken = require("../models/emailToken");
const RefreshToken = require("../models/refreshToken");

const { sendMail, load, fill, renderBase } = require("../functions/mailer");
const { sha256, b64url } = require("../functions/crypto");

const {
    toSafeUser,
    // setAuthCookies, // (non utilisé ici pour rester explicite)
    setAccessCookie,
    setRefreshCookie,
    setUserCookie,
    setCsrfCookie,
    clearAuthCookies,
    randomToken,
    ACCESS_TTL_MIN,
    REFRESH_TTL_DAYS,
} = require("../functions/authCookies");

const RESET_TTL_MIN = Number(process.env.RESET_TTL_MIN || 60);
const { CLIENT_URL, JWT_SECRET } = process.env;

/* =========================
   Helpers
   ========================= */

// Access-token court (minutes)
function signAccess(user) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        JWT_SECRET,
        { expiresIn: `${ACCESS_TTL_MIN}m` }
    );
}

// émission d’un refresh (hashé en DB)
async function issueRefresh(userId, familyId) {
    const raw = randomToken(64);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const doc = await RefreshToken.create({ userId, tokenHash, familyId, expiresAt });
    return { raw, doc };
}

// rotation d’un refresh
async function rotateRefresh(oldDoc) {
    if (oldDoc.revokedAt) throw new Error("revoked");
    const { userId, familyId } = oldDoc;
    const { raw, doc } = await issueRefresh(userId, familyId);
    oldDoc.revokedAt = new Date();
    oldDoc.replacedById = doc._id;
    await oldDoc.save();
    return { raw, doc };
}

// redirect hash payload vers CLIENT_URL
function redirectWithData(res, data) {
    return res.redirect(`${CLIENT_URL}/#data=${b64url(data)}`);
}

// utilitaire parse bool
function toBool(v) {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase();
    if (["1", "true", "yes", "y"].includes(s)) return true;
    if (["0", "false", "no", "n"].includes(s)) return false;
    return undefined;
}

/* =========================
   Core auth endpoints
   ========================= */

exports.login = async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email & password requis" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (user.active === false) return res.status(401).json({ error: "Compte bloqué" });

    // access + refresh + cookies
    const access = signAccess(user);
    const familyId = crypto.randomUUID();
    const { raw: refreshRaw } = await issueRefresh(user._id, familyId);

    setAccessCookie(res, access);
    setRefreshCookie(res, refreshRaw);
    setUserCookie(res, user);              // cookie lisible (signé) pour UX
    setCsrfCookie(res, randomToken(16));   // optionnel CSRF

    return res.json({ token: "[cookie]", user: toSafeUser(user) });
};

exports.register = async (req, res) => {
    try {
        const { email, password, name, phone, address } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

        const user = await User.create({ email, password, name, phone, address, isVerified: false });

        await sendVerifyEmail(user, req);

        return res.status(201).json({ ok: true, message: 'Compte créé. Vérifie ta boîte mail pour activer ton compte.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};



// Source of truth pour le front : renvoie DIRECTEMENT l’objet user (ou null)
exports.me = async (req, res) => {
    // req.user est posé par le middleware requireAuth (token lu via cookie HttpOnly)
    return res.json(req.user || null);
};

exports.logout = async (req, res) => {
    try {
        const rt = req.cookies?.refresh_token;
        if (rt) {
            const hash = sha256(rt);
            const doc = await RefreshToken.findOne({ tokenHash: hash });
            if (doc && !doc.revokedAt) {
                doc.revokedAt = new Date();
                await doc.save();
            }
        }
    } catch (_) {}
    clearAuthCookies(res);
    return res.json({ ok: true });
};

// Refresh (rotation)
exports.refresh = async (req, res) => {
    try {
        const raw = req.cookies?.refresh_token;
        if (!raw) return res.status(401).json({ error: "missing_refresh" });

        const tokenHash = sha256(raw);
        const doc = await RefreshToken.findOne({ tokenHash }).populate("userId");
        if (!doc || doc.expiresAt < new Date()) {
            return res.status(401).json({ error: "invalid_refresh" });
        }
        if (doc.revokedAt) {
            return res.status(401).json({ error: "revoked" });
        }

        const user = doc.userId;
        if (!user || user.active === false) return res.status(401).json({ error: "user_inactive" });

        // rotation + nouveau access
        const { raw: newRaw } = await rotateRefresh(doc);
        const access = signAccess(user);

        setAccessCookie(res, access);
        setRefreshCookie(res, newRaw);
        setUserCookie(res, user);

        return res.json({ ok: true });
    } catch (e) {
        return res.status(401).json({ error: "refresh_failed" });
    }
};

/* =========================
   Verify / Forgot / Reset
   ========================= */

exports.resendVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
        if (user.isVerified) return res.status(400).json({ error: "Compte déjà vérifié" });

        await EmailToken.deleteMany({ userId: user._id, type: "verify", usedAt: null });
        await sendVerifyEmail(user, req);
        res.json({ ok: true, message: "Email de vérification renvoyé" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur serveur" });
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

exports.verifyEmail = async (req, res) => {
    try {
        const { token, uid } = req.query;
        if (!token || !uid) return redirectWithData(res, { type: "VERIFY_INVALID" });

        const tokenHash = sha256(String(token)).toString();
        const record = await EmailToken.findOne({ userId: uid, tokenHash, type: "verify", usedAt: null });

        const user0 = await User.findById(uid).lean().catch(() => null);
        if (!record) {
            return redirectWithData(res, { type: "VERIFY_INVALID", email: user0?.email || undefined });
        }
        if (record.expiresAt < new Date()) {
            return redirectWithData(res, { type: "VERIFY_EXPIRED", email: user0?.email || undefined });
        }

        await User.findByIdAndUpdate(uid, { $set: { isVerified: true, active: true } });
        record.usedAt = new Date();
        await record.save();

        const user = await User.findById(uid);
        const access = signAccess(user);
        const familyId = crypto.randomUUID();
        const { raw: refreshRaw } = await issueRefresh(user._id, familyId);

        setAccessCookie(res, access);
        setRefreshCookie(res, refreshRaw);
        setUserCookie(res, user);
        setCsrfCookie(res, randomToken(16));

        return redirectWithData(res, { type: "VERIFY_OK", token: "[cookie]", user: toSafeUser(user) });
    } catch (e) {
        console.error(e);
        return redirectWithData(res, { type: "VERIFY_INVALID" });
    }
};

exports.forgot = async (req, res) => {
    try {
        const email = (req.body?.email || "").toString().trim().toLowerCase();
        if (!email) return res.status(400).json({ ok: false, error: "INVALID_EMAIL" });

        const generic = { ok: true, message: "Si un compte existe, un email a été envoyé." };

        const user = await User.findOne({ email }).exec();
        if (!user) return res.json(generic);

        const tokenRaw = randomToken(32);
        user.resetPasswordTokenHash = sha256(tokenRaw);
        user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
        await user.save();

        const resetUrl = `${CLIENT_URL}/reset-password/${tokenRaw}`;
        const bodyTpl = load("reset-password.html");
        const bodyFilled = fill(bodyTpl, {
            NAME: user.name || "client",
            RESET_URL: resetUrl,
            ACCENT: "#22d3ee",
            TTL_MIN: RESET_TTL_MIN,
        });
        const html = renderBase(bodyFilled, {
            subject: "Réinitialisation du mot de passe",
            preheader: "Cliquez pour choisir un nouveau mot de passe",
            brandName: "4tek",
            accent: "#22d3ee",
        });
        try {
            await sendMail({ to: user.email, subject: "Réinitialisation du mot de passe", html });
        } catch {}

        return res.json(generic);
    } catch (err) {
        console.error("forgot error:", err);
        return res.status(500).json({ ok: false });
    }
};

exports.reset = async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ ok: false });

    const tokenHash = sha256(token);
    const user = await User.findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpires: { $gt: new Date() },
    }).select("+password");
    if (!user) return res.status(400).json({ ok: false, error: "TOKEN_INVALID" });

    user.password = password; // sera hashé via pre('save')
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ ok: true });
};

/* =========================
   Admin (inchangé)
   ========================= */

exports.getAdminUsers = async (req, res) => {
    try {
        const { q, active, verified, provider, page = 1, limit = 20, sort = "-createdAt" } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * perPage;

        const match = {};
        if (q) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            match.$or = [{ name: rx }, { email: rx }, { phone: rx }, { address: rx }];
        }

        const act = toBool(active);
        if (act !== undefined) match.active = act;

        const ver = toBool(verified);
        if (ver !== undefined) match.isVerified = ver;

        if (provider === "google") match["providers.google"] = { $exists: true, $ne: null };
        if (provider === "facebook") match["providers.facebook"] = { $exists: true, $ne: null };
        if (provider === "local") match["providers.google"] = { $exists: false };

        let sortObj = { createdAt: -1 };
        if (sort) {
            sortObj = {};
            String(sort).split(",").forEach((part) => {
                const s = part.trim();
                if (!s) return;
                if (s.startsWith("-")) sortObj[s.slice(1)] = -1;
                else sortObj[s] = 1;
            });
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: "orders",
                    let: { uid: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$user.id", "$$uid"] } } },
                        { $count: "cnt" },
                    ],
                    as: "ordersAgg",
                },
            },
            { $addFields: { ordersCount: { $ifNull: [{ $arrayElemAt: ["$ordersAgg.cnt", 0] }, 0] } } },
            { $project: { password: 0, resetPasswordTokenHash: 0, resetPasswordExpires: 0, ordersAgg: 0 } },
            { $sort: sortObj },
            { $skip: skip },
            { $limit: perPage },
        ];

        const [items, totalArr] = await Promise.all([
            User.aggregate(pipeline),
            User.aggregate([{ $match: match }, { $count: "total" }]),
        ]);

        const total = totalArr[0]?.total || 0;
        const pages = Math.max(1, Math.ceil(total / perPage));

        res.json({ items, total, page: pageNum, pages, limit: perPage });
    } catch (err) {
        console.error("getAdminUsers error:", err);
        res.status(500).json({ error: err?.message || "Unable to fetch users" });
    }
};

exports.getAdminUserDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }

        const user = await User.findById(id).select("-password -resetPasswordTokenHash -resetPasswordExpires");
        if (!user) return res.status(404).json({ error: "User not found" });

        const orders = await Order.find({ "user.id": user._id }).sort({ createdAt: -1 }).lean();
        res.json({ user, orders });
    } catch (err) {
        console.error("getAdminUserDetail error:", err);
        res.status(500).json({ error: err?.message || "Unable to fetch user detail" });
    }
};

/* =========================
   Mails
   ========================= */

async function sendVerifyEmail(user, req) {
    const raw = randomToken(32);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await EmailToken.create({ userId: user._id, tokenHash, type: "verify", expiresAt });
    const verifyLink = `${
        process.env.API_PUBLIC_URL || req.protocol + "://" + req.get("host")
    }/v1/auth/verify/email?token=${raw}&uid=${user._id}`;

    const contentTpl = load(path.join("verify-email.html"));
    const content = fill(contentTpl, {
        NAME: user.name || "client",
        VERIFY_URL: verifyLink,
        BRAND_NAME: "4tek",
        ACCENT: "#22d3ee",
    });

    const html = renderBase(content, {
        subject: "Active ton compte",
        preheader: "Clique pour confirmer ton adresse email",
        brandName: "4tek",
        accent: "#22d3ee",
    });
    await sendMail({ to: user.email, subject: "Active ton compte 4tek", html });
}
