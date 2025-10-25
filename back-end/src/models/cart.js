const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:     { type: Number, required: true, min: 1, default: 1 },
    name:       { type: String },
    price:      { type: Number },
    imageUrl:   { type: String },
    subCategory:{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' },
}, { _id: false });

const CartSchema = new mongoose.Schema({
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true ,unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    status:{ type: String, enum: ['active', 'ordered', 'abandoned'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
