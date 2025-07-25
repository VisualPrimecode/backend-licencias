const express = require('express');
const router = express.Router();
const infoController = require('../controllers/informes.controller');


// Obtener un informe por ID Woo para licencias originales
router.get('/:id', infoController.getInforme);

router.get('/informe-por-mes-originales/:id', infoController.getInformePorMes);

router.get('/informe-por-rango-originales/:id', infoController.getInformePorRango);

router.get('/informe-por-rango-software/:id', infoController.getInformePedidosDetallado);

router.get('/informe-por-rango-digitales/:id', infoController.getInformePedidosDetalladoJeje);


module.exports = router;
