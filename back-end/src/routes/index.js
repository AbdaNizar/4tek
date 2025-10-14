const express = require("express");
const products = require("./productRoutes");
const auth = require("./auth");
const admin = require("./admin");
const category = require("./category");
const subcategory = require("./subcategory");
const search = require("./search");
const brand = require("./brand");

const api = express.Router();

api.get("/healthz", (_req, res) => res.json({ ok: true }));
api.use("/auth", auth);
api.use("/products", products);
api.use("/admin", admin);
api.use("/categories",category );
api.use("/subcategories",subcategory);
api.use("/search",search);
api.use("/brands",brand);

module.exports = api;
