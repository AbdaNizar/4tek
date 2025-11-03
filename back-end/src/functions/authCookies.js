// src/functions/authCookies.js
const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';
const RAW_COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ''; // e.g. ".4tek.tn" in prod ONLY
const JWT_SECRET = process.env.JWT_SECRET;

// TTL defaults
const ACCESS_TTL_MIN   = Number(process.env.ACCESS_TTL_MIN   || 15); // 15 min
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30); // 30 d

// Validate cookie domain; return undefined when unusable (dev/local)
function normalizeCookieDomain(raw) {
    if (!raw) return undefined;
    const d = String(raw).trim().toLowerCase();
    if (d === 'localhost') return undefined;
    if (d.startsWith('http://') || d.startsWith('https://')) return undefined;
    if (d.includes(':')) return undefined; // no port
    if (isProd && !d.startsWith('.')) return '.' + d; // leading dot for subdomains
    return d;
}
const COOKIE_DOMAIN = normalizeCookieDomain(RAW_COOKIE_DOMAIN);

// HMAC signature for integrity (not encryption)
function signPayload(str) {
    return crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
}

function toSafeUser(u) {
    return {
        id: u._id?.toString?.() || u.id,
        _id: u._id?.toString?.() || u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        phone: u.phone,
        address: u.address,
        role: u.role,
        isVerified: u.isVerified,
        active: u.active,
        providers: u.providers,
        createdAt: u.createdAt
    };
}

// HttpOnly access token (short)
function setAccessCookie(res, token) {
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'Lax',
        path: '/',
        maxAge: ACCESS_TTL_MIN * 60 * 1000,
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
    });
}

// HttpOnly refresh token (long)
function setRefreshCookie(res, token) {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'Lax',
        path: '/',
        maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
    });
}

// JS-readable user cookie (signed for integrity)
function setUserCookie(res, user, maxAgeDays = 30) {
    const safeUser = toSafeUser(user);
    const payload = Buffer.from(JSON.stringify(safeUser)).toString('base64url');
    const sig = signPayload(payload);
    res.cookie('auth_user', `${payload}.${sig}`, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'Lax',
        path: '/',
        maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
    });
}

// Optional CSRF (if you plan to send it in header X-CSRF-Token)
function setCsrfCookie(res, token) {
    res.cookie('csrf_token', token, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'Lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
    });
}

function setAuthCookies(res, { token, user }, maxAgeDays = 30) {
    setAccessCookie(res, token);
    setUserCookie(res, user, maxAgeDays);
}

function clearAuthCookies(res) {
    const base = {
        path: '/',
        sameSite: 'Lax',
        secure: isProd,
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
    };
    res.clearCookie('access_token',  { ...base, httpOnly: true  });
    res.clearCookie('refresh_token', { ...base, httpOnly: true  });
    res.clearCookie('auth_user',     { ...base, httpOnly: false });
    res.clearCookie('csrf_token',    { ...base, httpOnly: false });
}

function readSignedUserCookie(req) {
    const raw = req.cookies?.auth_user;
    if (!raw) return null;
    const [payload, sig] = String(raw).split('.');
    if (!payload || !sig) return null;
    const expected = signPayload(payload);
    if (expected !== sig) return null;
    try {
        const json = Buffer.from(payload, 'base64url').toString('utf8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function randomToken(len = 64) {
    return crypto.randomBytes(len).toString('base64url');
}

module.exports = {
    toSafeUser,
    setAuthCookies,
    setAccessCookie,
    setRefreshCookie,
    setUserCookie,
    setCsrfCookie,
    clearAuthCookies,
    readSignedUserCookie,
    randomToken,
    ACCESS_TTL_MIN,
    REFRESH_TTL_DAYS
};
