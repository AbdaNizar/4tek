const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const name = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, name);
    }
});

const upload = multer({ storage });

/**
 * Ajoute file.publicUrl = "http://localhost:3000/uploads/xxx.jpg"
 * en se basant sur host/protocol de la requête.
 */
function addPublicUrl(req, _res, next) {
    const host = req.get('host');
    const proto = req.protocol;
    const base = `${proto}://${host}/v1`;

    const patch = f => {
        if (!f) return;
        const fname = path.basename(f.path);
        f.publicUrl = `${base}/uploads/${fname}`;
    };

    if (req.file) patch(req.file);
    if (req.files) {
        for (const key of Object.keys(req.files)) {
            const arr = req.files[key];
            if (Array.isArray(arr)) arr.forEach(patch);
        }
    }
    next();
}
const checkAndCreateFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};


function uniqueName(original) {
    const ext = path.extname(original || '');
    const base = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    return `${base}${ext || ''}`;
}

// normalise req.files.X (express-fileupload) vers tableau
function normalizeFiles(f){
    if (!f) return [];
    return Array.isArray(f) ? f : [f];
}

module.exports = { checkAndCreateFolder, uniqueName, normalizeFiles,upload ,addPublicUrl };


