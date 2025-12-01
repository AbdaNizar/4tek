// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

        // ce que tu veux afficher sur le téléphone
        title: { type: String, required: true },
        body: { type: String, required: true },

        // payload pour l'app (orderId, status, etc.)
        data: {
            type: Object,
            default: {},
        },

        // pour savoir où on en est
        status: {
            type: String,
            enum: ['pending', 'ready', 'delivered'],
            default: 'pending',
            index: true,
        },

        // quand la notif doit être envoyée
        scheduledAt: { type: Date, default: Date.now, index: true },
        deliveredAt: { type: Date },
    },
    {
        timestamps: true,
    },
);
module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);


