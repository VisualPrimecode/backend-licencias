const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const upload = require('../middleware/upload');

router.get('/posibles-duplicados/grupos', productoController.getGruposPosiblesDuplicados);


router.get('/posibles-duplicados', productoController.getPosiblesDuplicados);

router.delete('/duplicados', productoController.eliminarDuplicados);


router.get('/duplicados', productoController.getProductosDuplicados);

// Ruta para carga masiva de productos
router.post('/carga-masiva', upload.single('archivo'), productoController.cargaMasivaProductosAux);

// Obtener todos los productos
router.get('/', productoController.getProductos);
// Obtener un producto por ID
router.get('/productosAux/:id', productoController.getProductosAuxByIdWooController);

// Obtener un producto por ID
router.get('/:id', productoController.getProductoById);



// Crear un nuevo producto
router.post('/', productoController.createProducto);

// Actualizar un producto existente
router.put('/:id', productoController.updateProducto);

// Eliminar un producto
router.delete('/:id', productoController.deleteProducto);

module.exports = router;
