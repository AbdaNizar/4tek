const express = require("express");
const { requireAuth, requireAdmin} = require("../middlewares/auth");
const Product = require("../models/user");

const r = express.Router();

r.use(requireAuth,requireAdmin);

r.get('/stats', async (req,res,next)=>{
    try {
        const countProducts = await Product.countDocuments();
        res.json({ countProducts, ts: Date.now() });
    } catch(e){ next(e); }
});

// exemple: création produit admin-only
r.post('/products', async (req,res,next)=>{
    try {
        const doc = await Product.create(req.body);
        res.status(201).json(doc);
    } catch(e){ next(e); }
});
r.get("/dashboard", (req, res) => {
    res.json({ message: "Bienvenue sur le dashboard admin 🚀" });
});

module.exports = r;
