const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    iconUrl: { type: String },
    imageUrl: { type: String },
    bannerUrl: { type: String },
    banners: [String],
}, { timestamps: true });

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
