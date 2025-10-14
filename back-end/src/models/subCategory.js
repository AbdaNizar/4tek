const mongoose = require('mongoose');

const SubCategorySchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:{ type: String, default: '' },
    isActive:   { type: Boolean, default: true },

    parent:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

    iconUrl:    { type: String, default: '' },
    imageUrl:   { type: String, default: '' },
    banners:    { type: [String], default: [] },

}, { timestamps: true });

module.exports = mongoose.models.SubCategory|| mongoose.model('SubCategory', SubCategorySchema);
