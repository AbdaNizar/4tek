const Notification = require('../../models/notification');

/**
 * "Enqueue" une notification pour un user :
 * on l'ajoute en base avec status=pending.
 *
 * @param {Object} user - doc user (doit contenir _id)
 * @param {Object} payload - { title, body, data? }
 */
async function queueNotificationForUser(user, { title, body, data = {} }) {
    if (!user || !user._id) {
        console.warn('queueNotificationForUser: user invalide', user);
        return;
    }

    await Notification.create({
        user: user._id,
        title,
        body,
        data,
        status: 'pending',
        scheduledAt: new Date(), // tu peux mettre une date dans le futur si tu veux
    });
}

module.exports = { queueNotificationForUser };
