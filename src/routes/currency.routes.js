const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');

// Obtener todas las tasas de cambio
router.get('/', currencyController.getRates);

// Obtener una tasa específica (por base y destino)
// Ejemplo: GET /api/currency/CLP/USD
router.get('/:base/:target', currencyController.getRateByCurrency);

// Crear una nueva tasa
router.post('/', currencyController.createRate);

// Actualizar una tasa existente por ID
router.put('/:id', currencyController.updateRate);

// Eliminar una tasa por ID
router.delete('/:id', currencyController.deleteRate);

module.exports = router;
