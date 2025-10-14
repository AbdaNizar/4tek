const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user");

(async()=>{

    const email = process.argv[2] || 'admin@4tek.tn';
    const pass  = process.argv[3] || 'Admin@12345';
    const role  = 'admin';

    const exists = await User.findOne({ email });
    if (exists) {
        console.log('User exists:', email);
    } else {
        await User.create({ email, password: pass, role });
        console.log('Admin created:', email);
    }
    await mongoose.disconnect();
    process.exit(0);
})();
