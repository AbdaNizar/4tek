const mongoose = require('mongoose');

const EmailTokenSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    tokenHash: { type: String, required: true, index: true },
    type:      { type: String, enum: ['verify'], required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models.EmailToken || mongoose.model('EmailToken', EmailTokenSchema);
