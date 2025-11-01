const bcrypt = require('bcryptjs');
const User   = require('../models/user');

async function ensureDefaultAdmin() {
    const email = process.env.ADMIN_EMAIL
    const pass  = process.env.ADMIN_PASS
    const name  = process.env.ADMIN_NAME

    // Existe-t-il déjà un admin ?
    const hasAdmin = await User.exists({ role: 'admin' });
    if (hasAdmin) return { created: false, reason: 'admin_exists' };

    // Existe-t-il déjà un compte avec cet email ?
    const byEmail = await User.findOne({ email });
    if (byEmail) {
        // Le promouvoir admin s’il n’est pas déjà admin
        if (byEmail.role !== 'admin') {
            byEmail.role = 'admin';

                byEmail.password = pass

            await byEmail.save();
            return { created: false, promoted: true };
        }
        return { created: false, reason: 'email_in_use' };
    }

    // Créer un nouvel admin

    await User.create({
        name, email, password: pass, role: 'admin', isVerified: true, active : true
    });
    console.log('Admin created')
    return { created: true };
}

module.exports = { ensureDefaultAdmin };
