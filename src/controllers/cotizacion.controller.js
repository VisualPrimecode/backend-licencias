const Cotizacion = require('../models/cotizacion.model');

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

// Crear una nueva cotización enviada
exports.createCotizacion = async (req, res) => {
  try {
    const data = req.body;

    if (!data.email_destino || !data.total || !data.productos_json) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const id = await Cotizacion.createCotizacion(data);
    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
};

// Eliminar cotización por ID (opcional)
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