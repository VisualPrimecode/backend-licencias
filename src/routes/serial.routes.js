const express = require('express');
const router = express.Router();
const serialController = require('../controllers/serial.controller');
const upload = require('../middleware/upload');

// Ruta para carga masiva de seriales
router.post('/carga-masiva', upload.single('archivo'), serialController.cargaMasivaSeriales);

//ruta previsualizacion de carga masiva de seriales
router.post('/prev-carga-masiva', upload.single('archivo'), serialController.previsualizarSeriales);


// Obtener todos los seriales
router.get('/', serialController.getSeriales);

// Obtener un serial por ID
router.get('/:id', serialController.getSerialById);

// Crear un nuevo serial
router.post('/', serialController.createSerial);

// Actualizar un serial existente
router.put('/:id', serialController.updateSerial);

// Eliminar un serial
router.delete('/:id', serialController.deleteSerial);


module.exports = router;
