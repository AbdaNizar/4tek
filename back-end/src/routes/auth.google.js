// src/routes/auth.google.js
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');

const {
    toSafeUser,
    setAccessCookie,
    setRefreshCookie,
    setUserCookie,
    setCsrfCookie,
    ACCESS_TTL_MIN,
    REFRESH_TTL_DAYS,
    randomToken,
} = require('../functions/authCookies');
const { sha256 } = require('../functions/crypto');

const router = express.Router();

const PUBLIC_API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const GOOGLE_REDIRECT_URI = `${PUBLIC_API_BASE.replace(/\/$/, '')}/v1/auth/google/callback`;

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    JWT_SECRET,
    CLIENT_URL: FRONT_FALLBACK = 'http://localhost:4200',
} = process.env;

// util base64url
function b64url(obj) {
    return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// === Helpers OAuth ===
function signAccess(user) {
    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        JWT_SECRET,
        { expiresIn: `${ACCESS_TTL_MIN}m` }
    );
}

async function issueRefresh(userId, familyId) {
    const raw = randomToken(64);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ userId, tokenHash, familyId, expiresAt });
    return raw;
}

// ---- 1) START ----
router.get('/start', (req, res) => {
    const returnTo = (req.query.r || FRONT_FALLBACK).toString();
    const scope = ['openid', 'email', 'profile'].join(' ');

    const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&prompt=consent` +
        `&access_type=offline` +
        `&state=${encodeURIComponent(b64url({ r: returnTo }))}`;

    return res.redirect(authUrl);
});

// ---- 2) CALLBACK ----
router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    let returnTo = FRONT_FALLBACK;
    try {
        if (state) {
            const json = Buffer.from(String(state).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            const parsed = JSON.parse(json);
            if (parsed?.r) returnTo = parsed.r;
        }
    } catch {}

    if (!code) {
        const data = b64url({ type: 'VERIFY_INVALID' });
        return res.redirect(`${returnTo}#data=${data}`);
    }

    try {
        // Échange code -> tokens Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(code),
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString()
        }).then(r => r.json());

        if (tokenRes.error) {
            const data = b64url({ type: 'VERIFY_INVALID' });
            return res.redirect(`${returnTo}#data=${data}`);
        }

        const { access_token } = tokenRes;
        const userinfo = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        }).then(r => r.json());

        const googleId = userinfo.sub;
        const email = (userinfo.email || '').toLowerCase();

        let user = await User.findOne({
            $or: [{ email }, { 'providers.google': googleId }]
        });

        if (!user) {
            user = await User.create({
                email,
                name: userinfo.name || '',
                avatar: userinfo.picture || '',
                role: 'user',
                active: true,
                isVerified: !!userinfo.email_verified,
                providers: { google: googleId }
            });
        } else {
            user.providers = user.providers || {};
            if (!user.providers.google) user.providers.google = googleId;
            if (!user.avatar && userinfo.picture) user.avatar = userinfo.picture;
            if (!user.name && userinfo.name) user.name = userinfo.name;
            if (userinfo.email_verified) user.isVerified = true;
            if (user.active === undefined) user.active = true;
            await user.save();
        }

        if (user && user.active === false) {
            const data = b64url({ type: 'VERIFY_INVALID', email });
            return res.redirect(`${returnTo}#data=${data}`);
        }

        // === Notre propre session: access court + refresh long + cookies ===
        const access = signAccess(user);
        const familyId = crypto.randomUUID();
        const refreshRaw = await issueRefresh(user._id, familyId);

        setAccessCookie(res, access);
        setRefreshCookie(res, refreshRaw);
        setUserCookie(res, user);
        setCsrfCookie(res, randomToken(16));

        const safe = toSafeUser(user);
        const payload = b64url({ token: '[cookie]', user: safe }); // garde le format attendu par le front
        return res.redirect(`${returnTo}#data=${payload}`);

    } catch (e) {
        console.error('Google OAuth error:', e);
        const data = b64url({ type: 'VERIFY_INVALID' });
        return res.redirect(`${returnTo}#data=${data}`);
    }
});

module.exports = router;
