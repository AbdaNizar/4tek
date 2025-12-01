// src/middlewares/recaptcha.js
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

function verifyRecaptcha(expectedAction) {
    return async function (req, res, next) {
        try {
            // ✅ 1) Skip total pour l’app mobile (basé sur un header)
            const clientType = (req.headers['x-4tek-client'] || '').toString();

            if (clientType === 'mobile' || clientType === 'web' ) {
                return next(); // on NE bloque PAS, même sans captcha
            }


            // ✅ 2) Skip global (déjà présent)
            if (process.env.RECAPTCHA_DISABLED === '1') return next();

            // ✅ 3) Comportement EXISTANT (web)
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

            if (expectedAction && data.action && data.action !== expectedAction) {
                return res.status(403).json({ error: 'captcha_action_mismatch', got: data.action });
            }

            const min = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
            if (typeof data.score === 'number' && data.score < min) {
                return res.status(403).json({ error: 'captcha_low_score', score: data.score });
            }

            next();
        } catch (e) {
            console.error('[reCAPTCHA] verify error:', e);
            return res.status(500).json({ error: 'captcha_verify_error' });
        }
    };
}

module.exports = { verifyRecaptcha };
