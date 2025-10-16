// server.js

// --- 1) Charger .env AVANT d'utiliser process.env ---
const path = require('path');
const dotenv = require('dotenv');

const NODE_ENV = (process.env.NODE_ENV || 'development').trim();
dotenv.config({
    path: path.resolve(__dirname, NODE_ENV === 'production' ? '.production.env' : '.env'),
});

// --- 2) Dépendances ---
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');

// DB & Routes
const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes');
const passport = require('./src/config/passport');
const {ensureDefaultAdmin} = require('./src/functions/seeder');

// --- 3) App ---
const app = express();
app.set('trust proxy', 1); // utile si reverse proxy (Nginx)

// Sécurité (headers)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // pour servir /uploads depuis un autre origin si besoin
    })
);

// Logs
app.use(morgan(NODE_ENV === 'production' ? 'production' : 'dev'));

// --- 4) CORS ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// Autorise aussi les requêtes sans origin (curl, health checks)
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error('Origin not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Gérer proprement les pré-vol (OPTIONS) pour éviter des 4xx bruités


// --- 5) Parsers ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploads (taille paramétrable via env)
const maxUploadMb = Number(process.env.MAX_FILE_SIZE_MB || 50);
app.use(
    fileUpload({
        createParentPath: true,
        limits: { fileSize: maxUploadMb * 1024 * 1024 },
        abortOnLimit: false,
        // useTempFiles: true,
        // tempFileDir: '/tmp',
    })
);

// --- 6) Static uploads ---
// Par défaut: ./src/uploads (ton arbo actuelle), mais tu peux surcharger via PUBLIC_UPLOADS_DIR
const PUBLIC_UPLOADS_DIR =
    process.env.PUBLIC_UPLOADS_DIR || path.join(__dirname, 'src', 'uploads');

app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR, {
    fallthrough: true, // ne renvoie pas 404 ici, laisse la suite gérer
}));

app.use(passport.initialize());

// --- 7) Rate limit sur /v1 pour éviter les abus ---
app.use(
    '/v1',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// --- 8) Routes API ---
app.use('/v1', apiRoutes);

// Santé simple
app.get('/health', (_req, res) => {
    res.json({ ok: true, env: NODE_ENV, time: new Date().toISOString() });
});

// --- 9) 404 (après les routes) ---
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// --- 10) Gestion erreurs globales (signature à 4 args obligatoire) ---
app.use((err, _req, res, _next) => {
    if (NODE_ENV !== 'production') {
        console.error('[ERROR]', err);
    }
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Server error' });
});

// --- 11) Démarrage après la connexion DB ---
connectDB()
    .then(() => {
        const PORT = Number(process.env.PORT || 3000);
        app.listen(PORT, () => {
            console.log(`✅ API 4tek (${NODE_ENV}) sur http://localhost:${PORT}`);
            if (allowedOrigins.length) {
                console.log('CORS allowed:', allowedOrigins.join(', '));
            }
            console.log('Uploads dir:', PUBLIC_UPLOADS_DIR);
            ensureDefaultAdmin();

        });
    })
    .catch(err => {
        console.error('❌ DB connection failed:', err.message);
        process.exit(1);
    });
module.exports = app;
