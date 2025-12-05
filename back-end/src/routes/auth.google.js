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

const PUBLIC_API_BASE = process.env.API_URL || 'http://localhost:3000/v1';
const GOOGLE_REDIRECT_URI = `${PUBLIC_API_BASE.replace(/\/$/, '')}/auth/google/callback`;

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
// src/routes/auth.google.js

// ...

// ---- 1) START ----
router.get('/start', (req, res) => {
    // URL de retour (web ou mobile)
    const returnTo = (req.query.r || FRONT_FALLBACK).toString();

    // type de client : 'web' (par défaut) ou 'mobile'
    const client = (req.query.c || 'web').toString();

    const scope = ['openid', 'email', 'profile'].join(' ');

    // on encode r + c dans le state
    const statePayload = b64url({ r: returnTo, c: client });

    const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&prompt=consent` +
        `&access_type=offline` +
        `&state=${encodeURIComponent(statePayload)}`;

    return res.redirect(authUrl);
});


// ---- 2) CALLBACK ----

router.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    let returnTo = FRONT_FALLBACK;
    let client = 'web'; // par défaut

    try {
        if (state) {
            const json = Buffer
                .from(String(state).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
                .toString('utf8');

            const parsed = JSON.parse(json);
            if (parsed?.r) returnTo = parsed.r;
            if (parsed?.c) client = parsed.c;  // 'web' ou 'mobile'
        }
    } catch {}

    if (!code) {
        console.error('[GOOGLE OAUTH] Pas de "code" dans la callback');
        const data = b64url({ type: 'VERIFY_INVALID' });
        return res.redirect(`${returnTo}#data=${data}`);
    }

    try {
        // 🔍 LOG pour voir ce qu'on envoie
        console.log('[GOOGLE OAUTH] Using redirect_uri =', GOOGLE_REDIRECT_URI);

        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(code),
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString()
        });

        const tokenText = await tokenResp.text();
        console.log('[GOOGLE OAUTH] Token response status=', tokenResp.status);
        console.log('[GOOGLE OAUTH] Token response body=', tokenText);

        let tokenRes;
        try {
            tokenRes = JSON.parse(tokenText);
        } catch (e) {
            console.error('[GOOGLE OAUTH] Erreur parse JSON tokenRes:', e);
            const data = b64url({ type: 'VERIFY_INVALID' });
            return res.redirect(`${returnTo}#data=${data}`);
        }

        if (tokenRes.error) {
            console.error('[GOOGLE OAUTH] tokenRes.error =', tokenRes.error);
            const data = b64url({ type: 'VERIFY_INVALID', reason: tokenRes.error });
            return res.redirect(`${returnTo}#data=${data}`);
        }

        const { access_token } = tokenRes;

        // 🔍 LOG USERINFO
        const userinfoResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const userinfoText = await userinfoResp.text();
        console.log('[GOOGLE OAUTH] userinfo status=', userinfoResp.status);
        console.log('[GOOGLE OAUTH] userinfo body=', userinfoText);

        const userinfo = JSON.parse(userinfoText);

        // ... ensuite tu gardes EXACTEMENT ton code existant :
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

        const access = signAccess(user);
        const familyId = crypto.randomUUID();
        const refreshRaw = await issueRefresh(user._id, familyId);

        setAccessCookie(res, access);
        setRefreshCookie(res, refreshRaw);
        setUserCookie(res, user);
        setCsrfCookie(res, randomToken(16));

        const safe = toSafeUser(user);

        let tokenPayload = '[cookie]';
        if (client === 'mobile') {
            tokenPayload = access;
        }

        const payload = b64url({ token: tokenPayload, user: safe });
        return res.redirect(`${returnTo}#data=${payload}`);

    } catch (e) {
        console.error('Google OAuth error:', e);
        const data = b64url({ type: 'VERIFY_INVALID' });
        return res.redirect(`${returnTo}#data=${data}`);
    }
});

// ---- 3) MOBILE LOGIN AVEC idToken (Google Sign-In natif) ----

router.post('/mobile-login', async (req, res) => {
    try {
        const { idToken } = req.body || {};
        if (!idToken) {
            return res.status(400).json({ error: 'idToken manquant' });
        }

        // Vérifier l'idToken auprès de Google
        const verifyResp = await fetch(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken)
        );

        if (!verifyResp.ok) {
            console.error('[GOOGLE MOBILE] tokeninfo status =', verifyResp.status);
            return res.status(401).json({ error: 'idToken invalide' });
        }

        const userinfo = await verifyResp.json();
        // userinfo ressemble à :
        // {
        //   "iss": "...",
        //   "sub": "...",           // googleId
        //   "email": "xxx",
        //   "email_verified": "true"/"false",
        //   "name": "...",
        //   "picture": "https://...",
        //   ...
        // }

        const googleId = userinfo.sub;
        const email = (userinfo.email || '').toLowerCase();
        const emailVerified =
            String(userinfo.email_verified || '').toLowerCase() === 'true';

        if (!googleId || !email) {
            return res.status(400).json({ error: 'Réponse Google incomplète' });
        }

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
                isVerified: emailVerified,
                providers: { google: googleId },
            });
        } else {
            user.providers = user.providers || {};
            if (!user.providers.google) user.providers.google = googleId;
            if (!user.avatar && userinfo.picture) user.avatar = userinfo.picture;
            if (!user.name && userinfo.name) user.name = userinfo.name;
            if (emailVerified) user.isVerified = true;
            if (user.active === undefined) user.active = true;
            await user.save();
        }

        if (user && user.active === false) {
            return res.status(403).json({ error: 'Compte désactivé' });
        }

        // Générer le même access token que pour les autres logins
        const access = signAccess(user);

        // Option : tu peux aussi émettre un refresh côté DB si tu veux
        const familyId = crypto.randomUUID();
        const refreshRaw = await issueRefresh(user._id, familyId);

        const safe = toSafeUser(user);

        // ⚠️ Sur mobile, on renvoie JSON (pas de cookies)
        return res.json({
            token: access,
            refreshToken: refreshRaw,   // optionnel, à utiliser plus tard si tu veux
            user: safe,
        });
    } catch (e) {
        console.error('[GOOGLE MOBILE] error:', e);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
