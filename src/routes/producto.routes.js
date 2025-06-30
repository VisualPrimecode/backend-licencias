const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');

// Obtener todos los productos
router.get('/', productoController.getProductos);

// Obtener un producto por ID
router.get('/:id', productoController.getProductoById);

// Crear un nuevo producto
router.post('/', productoController.createProducto);

// Actualizar un producto existente
router.put('/:id', productoController.updateProducto);

// Eliminar un producto
router.delete('/:id', productoController.deleteProducto);

module.exports = router;
