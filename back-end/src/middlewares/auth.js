const jwt = require("jsonwebtoken");
const User = require("../models/user");





async function requireAuth(req, res, next) {

    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!hdr || !hdr.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Non authentifié" });
    }


    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.sub).lean();
        if (!user) {
            return res.status(401).json({ error: "Utilisateur introuvable" });
        }
        if (!user || !user.active) return res.status(401).json({ error: 'Unauthorized' });
        req.user = { id: user._id.toString(), role: user.role, email: user.email  , name : user.name , phone : user.phone, address : user.address,};
        console.log(req.user.address)
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }
}
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Non authentifié" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Accès refusé : admin uniquement" });
    }
    next();
}

module.exports = {
    requireAdmin,
    requireAuth
};

