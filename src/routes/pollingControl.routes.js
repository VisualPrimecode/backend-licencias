// routes/pollingControl.routes.js
const express = require('express');
const router = express.Router();

// 📦 Importar el controlador
const pollingController = require('../controllers/pollingControl.controller');

// 🛡️ (Opcional) Middleware de autenticación, si tu app lo usa
// const { verificarToken } = require('../middlewares/authMiddleware');

/**
 * 🟢 Rutas para control del Polling
 * Base: /api/polling-control
 */

// 🔍 Obtener el estado actual del polling
router.get('/', pollingController.getPollingStatus);

// 🆕 Crear el registro inicial del control (solo una vez)
router.post('/', pollingController.createPollingControl);

// ⚙️ Actualizar el estado del polling (activar / pausar)
router.put('/', pollingController.updatePollingStatus);

// 🗑 Eliminar un registro de control (opcional)
router.delete('/:id', pollingController.deletePollingRecord);

module.exports = router;
