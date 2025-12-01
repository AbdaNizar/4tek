// cron/notifications-cron.js
const Notification = require('../../models/notification');

async function processNotifications() {
    const now = new Date();

    try {
        // on récupère les notifs qui doivent passer en "ready"
        const pending = await Notification.find({
            status: 'pending',
            scheduledAt: { $lte: now },
        }).limit(100); // limite au cas où

        if (!pending.length) return;

        const ids = pending.map((n) => n._id);

        await Notification.updateMany(
            { _id: { $in: ids } },
            { $set: { status: 'ready' } },
        );

        console.log(`Cron: ${pending.length} notifications mises en status=ready`);
    } catch (e) {
        console.error('Cron notifications error:', e);
    }
}

// à appeler AU DÉMARRAGE de ton serveur
function startNotificationCron() {
    // toutes les 60s
    setInterval(processNotifications, 60 * 1000);
}

module.exports = { startNotificationCron };
