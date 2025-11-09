const express = require("express");
const products = require("./productRoutes");
const auth = require("./auth");
const admin = require("./admin");
const category = require("./category");
const subcategory = require("./subcategory");
const search = require("./search");
const brand = require("./brand");
const cart = require("./cart");
const contact = require("./contact");
const orders = require("./orders");
const ratings = require("./ratings");
const reports = require("./admin.reports");

const api = express.Router();
api.get("/healthz", (_req, res) => res.json({ ok: true }));
api.use("/auth", auth);
api.use("/products", products);
api.use("/admin", admin);
api.use("/categories",category );
api.use("/subcategories",subcategory);
api.use("/search",search);
api.use("/brands",brand);
api.use("/cart",cart);
api.use('/contact',contact );
api.use('/orders',orders );
api.use('/ratings',ratings );
api.use('/admin/reports',reports );


module.exports = api;
