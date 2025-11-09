// src/routes/admin.reports.js
const express = require('express');
const { requireAuth, requireAdmin } = require('../middlewares/auth'); // adapte le chemin
const ctrl = require('../controllers/reports');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/profit/summary', ctrl.getSummary);
router.get('/profit/consumption', ctrl.getConsumption);
router.get('/profit/by-order', ctrl.getByOrder);
router.get('/profit/consumption.csv', ctrl.getConsumptionCsv);

module.exports = router;
