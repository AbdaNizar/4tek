// src/models/refreshToken.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const RefreshTokenSchema = new mongoose.Schema(
    {
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        tokenHash:   { type: String, required: true, unique: true }, // hash du refresh (unique)
        familyId:    { type: String, required: true, index: true },  // regroupe une "famille" (un device/session)
        createdAt:   { type: Date, default: Date.now },
        expiresAt:   { type: Date, required: true, index: true },    // TTL index plus bas
        revokedAt:   { type: Date, default: null, index: true },     // si non null => inutilisable
        replacedById:{ type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    },
    { timestamps: false, versionKey: false }
);

/* ---------- INDEXES ---------- */
// 1) TTL: supprime automatiquement les docs après expiresAt
//    (expireAfterSeconds: 0 => expire pile à la date)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 2) Pour requêtes fréquentes (vérif token, rotation, purge par family)
RefreshTokenSchema.index({ tokenHash: 1 });            // déjà unique au-dessus
RefreshTokenSchema.index({ userId: 1, familyId: 1 });
RefreshTokenSchema.index({ userId: 1, revokedAt: 1 }); // ex: trouver actifs/révoqués rapidement

/* ---------- UTILS ---------- */
function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}
function randomToken(len = 64) {
    return crypto.randomBytes(len).toString('base64url');
}

/* ---------- STATICS (helpers de haut niveau) ---------- */
/**
 * Émet un refresh token pour un user + une famille.
 * @param {ObjectId} userId
 * @param {String} familyId - identifiant stable par appareil (uuid)
 * @param {Number} ttlDays - durée en jours
 * @returns {{raw: string, doc: any}}
 */
RefreshTokenSchema.statics.issue = async function issue(userId, familyId, ttlDays = 30) {
    const raw = randomToken(64);
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const doc = await this.create({ userId, familyId, tokenHash, expiresAt });
    return { raw, doc };
};

/**
 * Rotation d'un refresh (remplace par un nouveau, marque l'ancien révoqué).
 * @param {Document} oldDoc - document RefreshToken existant (non révoqué, non expiré)
 * @param {Number} ttlDays
 * @returns {{raw: string, doc: any}}
 */
RefreshTokenSchema.statics.rotate = async function rotate(oldDoc, ttlDays = 30) {
    if (!oldDoc) throw new Error('missing_token');
    if (oldDoc.revokedAt) throw new Error('token_revoked');

    const { userId, familyId } = oldDoc;
    const { raw, doc } = await this.issue(userId, familyId, ttlDays);

    oldDoc.revokedAt = new Date();
    oldDoc.replacedById = doc._id;
    await oldDoc.save();

    return { raw, doc };
};

/**
 * Révoquer toute une famille (logout d’un appareil).
 * @param {ObjectId} userId
 * @param {String} familyId
 * @returns {Number} count révoqués
 */
RefreshTokenSchema.statics.revokeFamily = async function revokeFamily(userId, familyId) {
    const res = await this.updateMany(
        { userId, familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
    return res.modifiedCount || 0;
};

/**
 * Révoquer tous les refresh d’un user (logout partout).
 * @param {ObjectId} userId
 * @returns {Number} count révoqués
 */
RefreshTokenSchema.statics.revokeAllForUser = async function revokeAllForUser(userId) {
    const res = await this.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
    return res.modifiedCount || 0;
};

/**
 * Détection de réutilisation d’un refresh "ancien":
 * - Si un token révoqué (revokedAt != null) est présenté à nouveau → alerte, révoquer la famille.
 * @param {String} raw - refresh token brut présenté par le client
 * @returns {{doc:any, reused:boolean}}
 */
RefreshTokenSchema.statics.checkReuse = async function checkReuse(raw) {
    const tokenHash = sha256(raw);
    const doc = await this.findOne({ tokenHash });
    // doc inconnu → invalide (pas forcément reuse)
    if (!doc) return { doc: null, reused: false };
    // si déjà révoqué → REUSE détectée
    if (doc.revokedAt) return { doc, reused: true };
    return { doc, reused: false };
};

/* ---------- METHODS ---------- */
/**
 * Marque ce refresh comme révoqué (instance method).
 */
RefreshTokenSchema.methods.revoke = async function revoke() {
    if (!this.revokedAt) {
        this.revokedAt = new Date();
        await this.save();
    }
    return this;
};

module.exports =
    mongoose.models.RefreshToken ||
    mongoose.model('RefreshToken', RefreshTokenSchema);
