const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

router.get('/', usuarioController.getUsuarios);
router.post('/', usuarioController.createUsuario);
// Actualizar un usuario existente por ID
router.put('/:id', usuarioController.updateUsuario);

// Eliminar un usuario por ID
router.delete('/:id', usuarioController.deleteUsuario);

module.exports = router;
