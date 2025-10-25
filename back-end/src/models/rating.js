const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: {
        id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name:  { type: String },
        email: { type: String }
    },
    stars:   { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
    status:  { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true }
}, { timestamps: true });

RatingSchema.index({ 'user.id': 1, productId: 1 }, { unique: true }); // 1 review/user/product

module.exports = mongoose.models.Rating || mongoose.model('Rating', RatingSchema);
