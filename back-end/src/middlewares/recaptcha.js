// src/middlewares/recaptcha.js
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

function verifyRecaptcha(expectedAction) {
    return async function (req, res, next) {
        try {
            if (process.env.RECAPTCHA_DISABLED === '1') return next();
            const token = req.body?.captchaToken || req.headers['x-captcha-token'];
            if (!token) return res.status(400).json({ error: 'captcha_required' });

            const secret = process.env.RECAPTCHA_SECRET_KEY;
            if (!secret) return res.status(500).json({ error: 'captcha_server_misconfigured' });

            const params = new URLSearchParams({
                secret,
                response: token,
                remoteip: req.ip || ''
            });

            const r = await fetch(VERIFY_URL, { method: 'POST', body: params });
            const data = await r.json(); // { success, score, action, hostname, 'error-codes': [] }

            if (!data.success) {
                return res.status(403).json({ error: 'captcha_failed', codes: data['error-codes'] || [] });
            }

            // Vérifier l'action attendue (déclarée côté front)
            if (expectedAction && data.action && data.action !== expectedAction) {
                return res.status(403).json({ error: 'captcha_action_mismatch', got: data.action });
            }

            // Seuil
            const min = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
            if (typeof data.score === 'number' && data.score < min) {
                return res.status(403).json({ error: 'captcha_low_score', score: data.score });
            }

            // (Optionnel) vérifier hostname si vous voulez verrouiller encore plus
            // if (data.hostname && !/(\.4tek\.tn|localhost)$/.test(data.hostname)) { ... }

            next();
        } catch (e) {
            console.error('[reCAPTCHA] verify error:', e);
            return res.status(500).json({ error: 'captcha_verify_error' });
        }
    };
}

module.exports = { verifyRecaptcha };
