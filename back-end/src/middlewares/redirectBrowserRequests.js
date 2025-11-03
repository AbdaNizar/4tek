// src/middlewares/redirectTopLevelNav.js
function toList(val, fallback = []) {
    if (!val) return fallback;
    return val.split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = function redirectTopLevelNav(frontUrl, extraAllowedNavPaths = []) {
    const FRONT_URL = frontUrl || process.env.FRONT_URL || 'http://localhost:4200';

    // Chemins autorisés pour une navigation top-level (pas de redirect)
    const DEFAULT_ALLOWED = [
        '/v1/auth/google',               // lance l’OAuth Google
        '/v1/auth/facebook',               // lance l’OAuth Google
        '/v1/auth/google/callback',      // callback Google
        '/v1/auth/facebook/callback',      // callback Google
        '/v1/auth/google/redirect',      // selon votre implémentation
        '/v1/auth/facebook/redirect',      // selon votre implémentation
        '/v1/auth/verify',               // vérif email si vous avez une route GET
        '/v1/health',                    // healthcheck éventuel
    ];
    // On autorise aussi via ENV optionnel: ALLOWED_NAV_PATHS="/v1/auth/magic,/v1/auth/apple/callback"
    const ENV_ALLOWED = toList(process.env.ALLOWED_NAV_PATHS);
    const ALLOWED = new Set([...DEFAULT_ALLOWED, ...ENV_ALLOWED, ...extraAllowedNavPaths]);

    function isPathAllowed(pathname) {
        // autoriser si le chemin exact est en whitelist
        if (ALLOWED.has(pathname)) return true;
        // autoriser tous les sous-chemins d’auth (ex: /v1/auth/google/whatever)
        if (pathname.startsWith('/v1/auth/')) return true;
        return false;
    }

    return function (req, res, next) {
        // On ne cible que les GET vers l’API
        if (req.method !== 'GET' || !req.path.startsWith('/v1/')) {
            return next();
        }

        // Si le chemin est autorisé (OAuth/callback/etc.), on laisse passer
        if (isPathAllowed(req.path)) return next();

        const accept       = String(req.headers['accept'] || '');
        const secFetchMode = String(req.headers['sec-fetch-mode'] || '');
        const secFetchDest = String(req.headers['sec-fetch-dest'] || '');
        const xrw          = String(req.headers['x-requested-with'] || '');

        // Top-level navigation typique: mode "navigate" ou dest "document"
        const isTopLevelNavigation =
            (secFetchMode === 'navigate' || secFetchDest === 'document') &&
            !accept.includes('application/json');

        if (isTopLevelNavigation && !xrw) {
            // Redirige uniquement la navigation "voulue" dans la barre d'adresse
            return res.redirect(FRONT_URL);
        }

        // Sinon, c'est un XHR/fetch → on laisse l’API répondre
        return next();
    };
};
