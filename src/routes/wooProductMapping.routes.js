
const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/wooProductMapping.controller');

// Obtener todos los mapeos
router.get('/', mappingController.getMappings);

// Obtener un mapeo por ID
router.get('/:id', mappingController.getMappingById);

// Obtener un mapeo por ID woocomerce
router.get('/woo/:woocomerce_id', mappingController.getMappingByIdWoocomerce);


// Crear un nuevo mapeo
router.post('/', mappingController.createMapping);

// Actualizar un mapeo existente
router.put('/:id', mappingController.updateMapping);

// Eliminar un mapeo
router.delete('/:id', mappingController.deleteMapping);

router.get('/woo-product/producto-interno', mappingController.getProductoInternoByWoo);

router.get('/woo-product/producto-interno-por-nombre', mappingController.getProductoInternoByNombreYWoo);

module.exports = router;
