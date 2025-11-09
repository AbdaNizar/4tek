// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { toSafeUser } = require('../functions/authCookies');

function extractToken(req) {
    // Prefer HttpOnly cookie
    if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
    // Fallback: Authorization Bearer (not used by our FE, but keeps Postman useful)
    const hdr = req.headers.authorization || '';
    if (hdr.startsWith('Bearer ')) return hdr.slice(7).trim();
    return null;
}

async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);

        if (!token) return res.status(401).json({ error: 'Non authentifié' });
        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Token invalide ou expiré' });
        }

        const user = await User.findById(payload.sub)
            .select('_id role email name phone address active avatar isVerified providers createdAt')
            .lean();

        if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
        if (user.active === false) return res.status(401).json({ error: 'Unauthorized' });
        req.user = toSafeUser(user);
        next();
    } catch {
        return res.status(401).json({ error: 'Non authentifié' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès refusé : admin uniquement' });
    next();
}

module.exports = { requireAuth, requireAdmin };
