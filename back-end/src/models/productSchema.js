const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true, index: true },
    description:{ type: String, default: '' },

    // Prix / stock
    price:      { type: Number, required: true, min: 0 },
    oldPrice:   { type: Number, min: 0 },
    currency:   { type: String, default: 'TND' },
    stock:      { type: Number, default: 0, min: 0 },
    sku:        { type: String, trim: true },

    // Statut
    isActive:   { type: Boolean, default: true },

    // Liens médias
    imageUrl:   { type: String, default: '' },   // image de couverture
    gallery:    [{ type: String }],              // plusieurs images

    // Catégorie liée
    category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory:    { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },

    // Caractéristiques libres
    specs:      { type: Map, of: String },

    
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand',required: true },


}, { timestamps: true });

ProductSchema.index({ name: 'text', description: 'text', tags: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
