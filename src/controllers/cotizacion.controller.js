const Cotizacion = require('../models/cotizacion.model');
const currencyModel = require('../models/currency.model');
// Obtener todas las cotizaciones enviadas
exports.getCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.getAllCotizaciones();
    res.json(cotizaciones);
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

// Obtener una cotización por ID
exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.getCotizacionById(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (error) {
    console.error('❌ Error al obtener cotización por ID:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};
exports.getCotizacionesConEstadoByIdWoo = async (req, res) => {
  try {
    const { id } = req.params; // id_woo

    if (!id) {
      return res.status(400).json({ error: "Falta el parámetro id_woo" });
    }

    const cotizaciones = await Cotizacion.getCotizacionesWithEstado(id);

    return res.status(200).json(cotizaciones);

  } catch (error) {
    console.error("❌ Error al obtener cotizaciones con estado:", error);
    return res.status(500).json({ error: "Error al obtener cotizaciones con estado" });
  }
};
exports.getCotizacionesConEstadoByIdWooPeriodo = async (req, res) => {
  try {
    const { id } = req.params; // id_woo
    const { fechaInicio, fechaFin } = req.query;

    if (!id) {
      return res.status(400).json({
        error: "Falta el parámetro id_woo"
      });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Debe indicar fechaInicio y fechaFin"
      });
    }

    const cotizaciones =
      await Cotizacion.getCotizacionesWithEstadoByPeriodo(
        id,
        fechaInicio,
        fechaFin
      );

    // 🔹 Procesamiento extra: total de ventas concretadas
    const totalConcretado = cotizaciones.reduce((acc, cotizacion) => {
      if (cotizacion.estado_concretacion === 'ENVIADO') {
        return acc + Number(cotizacion.total || 0);
      }
      return acc;
    }, 0);

    return res.status(200).json({
      total_concretado: totalConcretado,
      cantidad_concretadas: cotizaciones.filter(
        c => c.estado_concretacion === 'ENVIADO'
      ).length,
      cotizaciones
    });

  } catch (error) {
    console.error(
      "❌ Error al obtener cotizaciones con estado por período:",
      error
    );

    return res.status(500).json({
      error: "Error al obtener cotizaciones con estado por período"
    });
  }
};
exports.getTotalConcretadoByIdWooPeriodo = async (req, res) => {
  try {
    const { id } = req.params; // id_woo
    const { fechaInicio, fechaFin } = req.query;
    console.log("Parámetros recibidos:", { id, fechaInicio, fechaFin });

    if (!id) {
      return res.status(400).json({
        error: "Falta el parámetro id_woo"
      });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Debe indicar fechaInicio y fechaFin"
      });
    }

    const cotizaciones =
      await Cotizacion.getCotizacionesWithEstadoByPeriodo(
        id,
        fechaInicio,
        fechaFin
      );

    const totalConcretado = cotizaciones.reduce((acc, cotizacion) => {
      if (cotizacion.estado_concretacion === 'ENVIADO') {
        return acc + Number(cotizacion.total || 0);
      }
      return acc;
    }, 0);
    console.log("Total concretado calculado:", totalConcretado);
    return res.status(200).json({
      total_concretado: totalConcretado
    });

  } catch (error) {
    console.error(
      "❌ Error al obtener total concretado por período:",
      error
    );

    return res.status(500).json({
      error: "Error al obtener total concretado por período"
    });
  }
};


// Obtener una cotización por ID Woocommerce
exports.getCotizacionesByIdWooController = async (req, res) => {
  console.log("Obteniendo cotización por ID WooCommerce...");
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.getCotizacionByIdWoo(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (error) {
    console.error('❌ Error al obtener cotización por ID:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

exports.checkEnvioByCotizacion = async (req, res) => {
  try {
    const { id_cotizaccion, id_woo } = req.body;

    if (!id_cotizaccion || !id_woo) {
      return res.status(400).json({ error: "Faltan parámetros (id_cotizaccion, id_woo)" });
    }

    const result = await Envio.findEnvioByCotizacion(id_cotizaccion, id_woo);

    res.json(result);

  } catch (error) {
    console.error("❌ Error al verificar cotización:", error);
    res.status(500).json({ error: "Error al consultar la cotización" });
  }
};

exports.deleteCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Cotizacion.deleteCotizacion(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
};

// Actualizar estado de envío o mensaje de error (opcional)
exports.updateCotizacionEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_envio, mensaje_error } = req.body;

    if (!estado_envio) {
      return res.status(400).json({ error: 'estado_envio es requerido' });
    }

    const result = await Cotizacion.updateCotizacionEstado(id, {
      estado_envio,
      mensaje_error: mensaje_error || null
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Estado de cotización actualizado' });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado de cotización' });
  }
};

// Actualizar estado de envío de productos personalizado o mensaje de error (opcional)
exports.updateEnvioPersonalizadoEstado = async (req, res) => {
  console.log("Actualizando estado de envío personalizado...");
  console.log("Datos del request:", req.body);
  console.log("ID del request:", req.params.id);
  try {
    const { id } = req.params;
    const { estado_envio, mensaje_error } = req.body;

    if (!estado_envio) {
      return res.status(400).json({ error: 'estado_envio es requerido' });
    }

    const result = await Cotizacion.updateEnvioPersonalizadoEstado(id, {
      estado_envio,
      mensaje_error: mensaje_error || null
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Estado de cotización actualizado' });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado de cotización' });
  }
};

