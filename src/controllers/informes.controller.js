const Informe = require('../models/informes.model');

//LICENCIAS ORIGINALES
exports.getInforme = async (req, res) => {
  console.log("Obteniendo informe para ID:", req.params.id);
  
  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    const datos = await Informe.getInformeLicenciasOriginales(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};

exports.getInformePorMes = async (req, res) => {
  console.log("📊 Obteniendo informe mensual para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { anio } = req.query;

    if (!anio || isNaN(parseInt(anio))) {
      return res.status(400).json({ error: 'El parámetro "anio" es obligatorio y debe ser un número válido.' });
    }

    const datos = await Informe.getInformeLicenciasPorMes(configId, parseInt(anio));

    // Opción: incluir los 12 meses (aunque no haya datos en la DB)
    const resultadoConMesesCompletos = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const encontrado = datos.find(d => d.mes === mes);
      return {
        mes,
        total_pagado: encontrado ? encontrado.total_pagado : 0
      };
    });

    res.json(resultadoConMesesCompletos);
  } catch (error) {
    console.error('❌ Error al obtener informe mensual:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe mensual' });
  }
};
exports.getInformePorRango = async (req, res) => {
  console.log("📅 Obteniendo informe total y mensual por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    const datos = await Informe.getInformeLicenciasPorRango(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};


//LICENCIAS SOFTWARE

exports.getInformePedidosDetallado = async (req, res) => {
  console.log("📦 Obteniendo informe detallado por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    // Validar parámetros
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    // Llamada al modelo
    const datos = await Informe.getInformePorRango(configId, fechaInicio, fechaFin);

    // Responder con los datos
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe detallado:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe detallado' });
  }
};

//licencias digitales
exports.getInformePedidosDetalladoJeje = async (req, res) => {
  console.log("📦 Obteniendo informe detallado JEJE por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.'
      });
    }

    const datos = await Informe.getInformePedidosTotalesJejePorRango(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe JEJE detallado:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe detallado JEJE' });
  }
};

exports.getEstadoStockProductos = async (req, res) => {
  console.log("📦 Obteniendo estado de stock por promedio semanal");

  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' 
      });
    }

    const datos = await Informe.getEstadoStockProductos(fechaInicio, fechaFin);

    res.json({
      rango: { fechaInicio, fechaFin },
      total_productos: datos.length,
      resultados: datos
    });

  } catch (error) {
    console.error('❌ Error en getEstadoStockProductos:', error.message);
    res.status(500).json({ error: 'Error al obtener estado del stock' });
  }
};

exports.getProductosVendidosPorRango = async (req, res) => {
  console.log("📦 Obteniendo informe de productos vendidos por rango");

  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' 
      });
    }

    const datos = await Informe.getProductosVendidosPorRango(fechaInicio, fechaFin);

    res.json({
      rango: { fechaInicio, fechaFin },
      total_productos: datos.length,
      resultados: datos
    });

  } catch (error) {
    console.error('❌ Error en getProductosVendidosPorRango:', error.message);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};