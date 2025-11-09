// src/models/product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },

    // Prix / stock
    price:       { type: Number, required: true, min: 0 },
    oldPrice:    { type: Number, min: 0 },
    currency:    { type: String, default: 'TND' },
    stock:       { type: Number, default: 0, min: 0 },
    sku:         { type: String, trim: true },

    // *** NOUVEAU: coût unitaire (prix d’achat) ***
    cost:        { type: Number, default: 0, min: 0 },

    // Statut
    isActive:    { type: Boolean, default: true },
    isNew:    { type: Boolean, default: true },

    // Médias
    imageUrl:    { type: String, default: '' },
    gallery:     [{ type: String }],

    // Catégories & marque
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    brand:       { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },

    // Specs libres
    specs:       { type: Map, of: String },
}, { timestamps: true });

// Index de recherche (évite "tags" inexistant)
ProductSchema.index(
    { name: 'text', description: 'text' },
    { weights: { name: 10, description: 3 }, name: 'ProductTextIndex' }
);
// Product
ProductSchema.index({ cost: 1 });
module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
