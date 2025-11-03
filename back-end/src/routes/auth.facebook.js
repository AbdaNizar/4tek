// src/routes/auth.facebook.js
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

const {
    FB_CLIENT_ID,
    FB_CLIENT_SECRET,
    FB_REDIRECT_URI, // EXACTEMENT celle déclarée dans Meta
    JWT_SECRET,
    CLIENT_URL: CLIENT_URL_FALLBACK = 'http://localhost:4200'
} = process.env;

// utils b64url
const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlParse = (str) => {
    try {
        const json = Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        return JSON.parse(json);
    } catch { return {}; }
};

// helpers
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

/* 1) Start */
router.get('/start', async (req, res) => {
    try {
        const r = req.query.r && String(req.query.r).startsWith('http') ? String(req.query.r) : CLIENT_URL_FALLBACK;
        const state = b64url({ r });

        const authURL = new URL('https://www.facebook.com/v17.0/dialog/oauth');
        authURL.searchParams.set('client_id', FB_CLIENT_ID);
        authURL.searchParams.set('redirect_uri', FB_REDIRECT_URI);
        authURL.searchParams.set('state', state);
        authURL.searchParams.set('response_type', 'code');
        authURL.searchParams.set('scope', 'email,public_profile');

        return res.redirect(authURL.toString());
    } catch (e) {
        console.error('FB start error:', e);
        return res.status(500).send('Facebook start error');
    }
});

/* 2) Callback */
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        const { r } = b64urlParse(String(state || '')) || {};
        const returnTo = (r && r.startsWith('http')) ? r : CLIENT_URL_FALLBACK;

        if (!code) return res.redirect(returnTo + '#oauth=facebook_error');

        // code -> access_token Facebook
        const tokenURL = new URL('https://graph.facebook.com/v17.0/oauth/access_token');
        tokenURL.searchParams.set('client_id', FB_CLIENT_ID);
        tokenURL.searchParams.set('client_secret', FB_CLIENT_SECRET);
        tokenURL.searchParams.set('redirect_uri', FB_REDIRECT_URI);
        tokenURL.searchParams.set('code', String(code));

        const tokenRes = await fetch(tokenURL.toString()).then(r => r.json());
        if (!tokenRes.access_token) {
            console.error('FB token error:', tokenRes);
            return res.redirect(returnTo + '#oauth=facebook_token_error');
        }
        const accessToken = tokenRes.access_token;

        // Profil
        const meURL = new URL('https://graph.facebook.com/me');
        meURL.searchParams.set('fields', 'id,name,email,picture.type(large)');
        meURL.searchParams.set('access_token', accessToken);

        const me = await fetch(meURL.toString()).then(r => r.json());
        if (!me || !me.id) {
            console.error('FB me error:', me);
            return res.redirect(returnTo + '#oauth=facebook_profile_error');
        }

        const fbId = String(me.id);
        const email = (me.email || '').toLowerCase() || undefined;
        const name  = me.name || 'Utilisateur Facebook';
        const avatar = me.picture?.data?.url || '';

        let user = await User.findOne({ 'providers.facebook': fbId });

        if (!user && email) {
            user = await User.findOne({ email });
            if (user && !user.providers?.facebook) {
                user.providers = user.providers || {};
                user.providers.facebook = fbId;
                if (!user.avatar && avatar) user.avatar = avatar;
                if (!user.name) user.name = name;
                user.isVerified = true;
                await user.save();
            }
        }
        if (!user) {
            user = await User.create({
                email, name, avatar,
                role: 'user', active: true, isVerified: true,
                providers: { facebook: fbId }
            });
        }

        if (user && user.active === false) {
            const data = b64url({ type: 'VERIFY_INVALID', email });
            return res.redirect(`${returnTo}#data=${data}`);
        }

        // === Notre session: access court + refresh long + cookies ===
        const access = signAccess(user);
        const familyId = crypto.randomUUID();
        const refreshRaw = await issueRefresh(user._id, familyId);

        setAccessCookie(res, access);
        setRefreshCookie(res, refreshRaw);
        setUserCookie(res, user);
        setCsrfCookie(res, randomToken(16));

        const safe = toSafeUser(user);
        const payload = b64url({ token: '[cookie]', user: safe });
        return res.redirect(`${returnTo}#data=${payload}`);

    } catch (e) {
        console.error('FB callback error:', e);
        return res.status(500).send('Facebook callback error');
    }
});

module.exports = router;
