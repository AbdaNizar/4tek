const mongoose = require('mongoose');

const ContactRequestSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email:    { type: String, required: true, trim: true, lowercase: true },
    phone:    { type: String, default: '', trim: true },
    message:  { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },

    // facultatif si user connecté
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // statut & suivi
    status:   { type: String, enum: ['new','in_progress','done'], default: 'new' },
    notes:    { type: String, default: '' },
    handledBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // anti-spam léger (honeypot)
    hp:       { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.models.ContactRequest || mongoose.model('ContactRequest', ContactRequestSchema);
