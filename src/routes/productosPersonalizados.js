const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosPersonalizados.controller');

// Obtener todos los productos personalizados
router.get('/', productosController.getProductosPersonalizados);

// Crear un producto personalizado
router.post('/', productosController.createProductoPersonalizado);

// Obtener un producto por ID
router.get('/:id', productosController.getProductoPersonalizadoById);

// Actualizar un producto por ID
router.put('/:id', productosController.updateProductoPersonalizado);

// Eliminar un producto por ID (soft delete)
router.delete('/:id', productosController.deleteProductoPersonalizado);

module.exports = router;
