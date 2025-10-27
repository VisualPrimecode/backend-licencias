const express = require('express');
const router = express.Router();
const { generarAlertaStock } = require('../controllers/alertaStock.controller');

// 📡 Endpoint para generar análisis y encolar alertas de stock
router.post('/stock', generarAlertaStock);

module.exports = router;
