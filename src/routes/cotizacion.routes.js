const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacion.controller');

// Obtener todas las cotizaciones enviadas
router.get('/', cotizacionController.getCotizaciones);

// Obtener una cotización por ID
router.get('/:id', cotizacionController.getCotizacionById);

// Obtener cotizaciones por ID woo (versión antigua)
router.get('/:id/cotizaciones', cotizacionController.getCotizacionesByIdWooController);
router.get(
  '/:id/cotizaciones-con-estado/periodo2',
  cotizacionController.getTotalConcretadoByIdWooPeriodo
);
router.get(
  '/:id/cotizaciones-con-estado/periodo',
  cotizacionController.getCotizacionesConEstadoByIdWooPeriodo
);

// Obtener cotizaciones por ID woo + estado de concretación (NUEVA)
router.get('/:id/cotizaciones-con-estado', cotizacionController.getCotizacionesConEstadoByIdWoo);

// Verificar si existe un envío asociado a una cotización
router.post('/check-envio', cotizacionController.checkEnvioByCotizacion);

router.put('/:id/estadoPersonalizado', cotizacionController.updateEnvioPersonalizadoEstado);

// Actualizar estado de envío o mensaje de error
router.put('/:id/estado', cotizacionController.updateCotizacionEstado);

// Eliminar una cotización (opcional)
router.delete('/:id', cotizacionController.deleteCotizacion);

module.exports = router;
