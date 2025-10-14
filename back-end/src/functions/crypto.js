const crypto = require('crypto');

exports.randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
exports.sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');
exports.b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');





