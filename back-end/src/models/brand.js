// models/Brand.js
const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    iconUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Brand || mongoose.model('Brand', BrandSchema);
