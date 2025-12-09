// routes/flow.routes.js

const express = require('express');
const router = express.Router();

const flowController = require('../controllers/flow.controller');


// ---------------------------------------------
// Obtener transacciones de un solo día
// Ejemplo: GET /flow/transacciones/2025-12-04
// ---------------------------------------------
router.get('/transacciones/:flowId/:fecha', flowController.getTransactions);

// ---------------------------------------------
// Obtener transacciones de un rango de fechas
// Ejemplo: GET /flow/transacciones/rango/2025-12-01/2025-12-04
// ---------------------------------------------
router.get('/transacciones/rango/:flowId/:inicio/:fin', flowController.getTransactionsRange);
module.exports = router;
