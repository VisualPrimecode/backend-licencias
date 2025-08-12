const express = require('express');
const router = express.Router();
const enviosErroresController = require('../controllers/enviosErroresController');

// Obtener todos los envíos con errores
router.get('/', enviosErroresController.getEnviosErrores);

// Obtener un envío con error por ID
router.get('/:id', enviosErroresController.getEnvioErrorById);

// Crear un nuevo envío con error
router.post('/', enviosErroresController.createEnvioError);

// Actualizar un envío con error
router.put('/:id', enviosErroresController.updateEnvioError);

// Actualizar solo el estado de un envío con error
router.patch('/:id/estado', enviosErroresController.updateEstadoEnvioError);

// Eliminar un envío con error
router.delete('/:id', enviosErroresController.deleteEnvioError);

module.exports = router;
