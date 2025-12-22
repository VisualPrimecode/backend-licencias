const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimientoCotizacion.controller');
const envioController = require('../controllers/envio.controller');

// ======================================
// SEGUIMIENTO DE CORREOS DE COTIZACIÓN
// ======================================
// /api/correo-seguimiento
// ---------- ACCIONES ESPECÍFICAS ----------

// Enviar / programar correo de seguimiento
router.post(
  '/enviar',
  envioController.EnvioCorreoSeguimiento
);

// ---------- CONSULTAS ----------

// Obtener todos los seguimientos
router.get('/', seguimientoController.getSeguimientos);

// Obtener seguimientos por cotización
router.get(
  '/cotizacion/:cotizacion_id',
  seguimientoController.getSeguimientosByCotizacionId
);

// Obtener seguimiento por ID
router.get('/:id', seguimientoController.getSeguimientoById);

// ---------- CREACIÓN ----------

// Crear seguimiento manual
router.post('/', seguimientoController.createSeguimiento);

// ---------- ACTUALIZACIÓN ----------

// Actualizar seguimiento completo
router.put('/:id', seguimientoController.updateSeguimiento);

// Actualizar solo el estado
router.patch(
  '/:id/estado',
  seguimientoController.updateEstadoSeguimiento
);

// ---------- ELIMINACIÓN ----------

// Eliminar seguimiento
router.delete('/:id', seguimientoController.deleteSeguimiento);

module.exports = router;
