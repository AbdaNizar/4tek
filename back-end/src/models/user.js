const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    email:   { type: String, lowercase: true, index: true, unique: true, sparse: true },
    name:    { type: String },
    avatar:  { type: String },
    role:    { type: String, enum: ['user','admin'], default: 'user' },
    active:{ type: Boolean, default: false },
    isVerified:{ type: Boolean, default: false },
    providers: {
        google:   { type: String, index: true, sparse: true },
        facebook: { type: String, index: true, sparse: true }
    },
    password:{ type: String ,default: '',  required: function () {
            return !(this.providers?.google || this.providers?.facebook) && !this.password;
        }
        },

    resetPasswordTokenHash: { type: String },
    resetPasswordExpires:   { type: Date },
}, { timestamps: true });

UserSchema.pre('save', async function(next){
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = function(plain){
    return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
