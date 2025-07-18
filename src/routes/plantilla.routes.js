const express = require('express');
const router = express.Router();
const plantillaController = require('../controllers/plantilla.controller');

// Obtener todos los plantillas
router.get('/', plantillaController.getPlantillas);

// Obtener un plantilla por ID
router.get('/:id', plantillaController.getPlantillaById);

// Obtener un plantilla por ID de empresa
router.get('/empresa/:id', plantillaController.getPlantillaByIdEmpresa);

// Obtener un plantilla por ID de empresa
router.get('/:woo_id/:motivo', plantillaController.getPlantillaByWooAndMotivo);

// Crear un nuevo plantilla
router.post('/', plantillaController.createPlantilla);

// Actualizar un plantilla existente
router.put('/:id', plantillaController.updatePlantilla);

// Eliminar un plantilla
router.delete('/:id', plantillaController.deletePlantilla);

module.exports = router;
