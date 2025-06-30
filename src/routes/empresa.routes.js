const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresa.controller');

// Obtener todas las empresas
router.get('/', empresaController.getEmpresas);

// Obtener una empresa por ID
router.get('/:id', empresaController.getEmpresaById);

// Crear una nueva empresa
router.post('/', empresaController.createEmpresa);

// Actualizar una empresa existente
router.put('/:id', empresaController.updateEmpresa);

// Eliminar una empresa
router.delete('/:id', empresaController.deleteEmpresa);

// Asignar un usuario a una empresa
router.post('/asignar-usuario', empresaController.asignarUsuarioAEmpresa);

// Desasignar un usuario de una empresa
router.post('/desasignar-usuario', empresaController.desasignarUsuarioDeEmpresa);

router.get('/usuario/:usuarioId', empresaController.getEmpresaPorUsuario);

router.get('/usuarios/:empresaId', empresaController.getUsuariosPorEmpresa);

router.get('/productos/:empresaId', empresaController.getProductosPorEmpresa);

router.post('/asignar-producto', empresaController.asignarProductoAEmpresa);


module.exports = router;
