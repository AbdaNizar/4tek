const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {


        });
        console.log("✅ MongoDB connecté sur :", process.env.MONGO_URI);
    } catch (err) {
        console.error("❌ Erreur de connexion MongoDB:", err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
