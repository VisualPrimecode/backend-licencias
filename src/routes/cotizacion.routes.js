const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacion.controller');

// Obtener todas las cotizaciones enviadas
router.get('/', cotizacionController.getCotizaciones);

// Obtener una cotización por ID
router.get('/:id', cotizacionController.getCotizacionById);
// Obtener una cotización por ID woo
router.get('/:id/cotizaciones', cotizacionController.getCotizacionesByIdWooController);

// Crear una nueva cotización
router.post('/', cotizacionController.createCotizacion);


router.put('/:id/estadoPersonalizado', cotizacionController.updateEnvioPersonalizadoEstado);

// Actualizar estado de envío o mensaje de error
router.put('/:id/estado', cotizacionController.updateCotizacionEstado);

// Eliminar una cotización (opcional)
router.delete('/:id', cotizacionController.deleteCotizacion);

module.exports = router;
