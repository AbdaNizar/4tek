const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true},
    name: {type: String, required: true},
    price: {type: Number, required: true, min: 0},
    qty: {type: Number, required: true, min: 1},
    imageUrl: {type: String},
    unitCost:  { type: Number, default: 0, min: 0 }
}, {_id: false});

const OrderSchema = new mongoose.Schema({
    number: { type: Number, unique: true, index: true },

    user: {
        id: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        email: {type: String, required: true},
        phone: {type: String, required: true},
        address: {type: String, required: true},
        name: {type: String}
    },
    items: {type: [OrderItemSchema], required: true, validate: v => v.length > 0},
    currency: {type: String, default: 'TND'},
    subtotal: {type: Number, required: true, min: 0},
    shippingFee: {type: Number, required: true, min: 0},
    total: {type: Number, required: true, min: 0},

    status: {type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending'},

    note: {type: String},
    shippedAt: {type: Date},
    deliveredAt: {type: Date},
    canceledAt: {type: Date},
    confirmedAt: {type: Date}
}, {timestamps: true});

// Order
OrderSchema.index({ createdAt: -1, status: 1 });
OrderSchema.index({ 'user.id': 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
