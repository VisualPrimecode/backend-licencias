const SeguimientoCorreo = require('../models/seguimientocotizacion.model');


/*
  Metodo de envio de correos de seguimiento de cotizacion
  "envioCorreoSeguimiento"
*/
/**
 * Obtener todos los seguimientos de correos
 */
exports.getSeguimientos = async (req, res) => {
  console.log("entro en getSeguimientos");
  try {
    const seguimientos = await SeguimientoCorreo.getAllSeguimientos();
    res.json(seguimientos);
  } catch (error) {
    console.error('❌ Error al obtener seguimientos:', error);
    res.status(500).json({ error: 'Error al obtener seguimientos' });
  }
};

/**
 * Obtener seguimiento por ID
 */
exports.getSeguimientoById = async (req, res) => {
  console.log("entro en getSeguimientoById");
  try {
    const { id } = req.params;

    const seguimiento = await SeguimientoCorreo.getSeguimientoById(id);

    if (!seguimiento) {
      return res.status(404).json({ error: 'Seguimiento no encontrado' });
    }

    res.json(seguimiento);
  } catch (error) {
    console.error('❌ Error al obtener seguimiento:', error);
    res.status(500).json({ error: 'Error al obtener seguimiento' });
  }
};

/**
 * Obtener seguimientos por cotización
 */
exports.getSeguimientosByCotizacionId = async (req, res) => {
  console.log("entro en getSeguimientosByCotizacionId");
  try {
    const { cotizacion_id } = req.params;

    const seguimientos = await SeguimientoCorreo.getSeguimientosByCotizacionId(
      cotizacion_id
    );

    res.json(seguimientos);
  } catch (error) {
    console.error('❌ Error al obtener seguimientos por cotización:', error);
    res.status(500).json({ error: 'Error al obtener seguimientos por cotización' });
  }
};

/**
 * Crear nuevo seguimiento de correo
 */
exports.createSeguimiento = async (req, res) => {
  console.log("entro en createSeguimiento");
  try {
    const {
      cotizacion_id,
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      estado
    } = req.body;

    // Validación básica
    if (
      !cotizacion_id ||
      !correo_destinatario ||
      !asunto ||
      !cuerpo ||
      !fecha_programada
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    const insertId = await SeguimientoCorreo.createSeguimiento({
      cotizacion_id,
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      estado
    });

    res.status(201).json({
      message: 'Seguimiento creado correctamente',
      id: insertId
    });
  } catch (error) {
    console.error('❌ Error al crear seguimiento:', error);
    res.status(500).json({ error: 'Error al crear seguimiento' });
  }
};

/**
 * Actualizar seguimiento
 */
exports.updateSeguimiento = async (req, res) => {
  console.log("entro en updateSeguimiento");
  try {
    const { id } = req.params;
    const {
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      fecha_envio,
      estado
    } = req.body;

    if (!correo_destinatario || !asunto || !cuerpo || !fecha_programada || !estado) {
      return res.status(400).json({
        error: 'Campos obligatorios incompletos'
      });
    }

    const affectedRows = await SeguimientoCorreo.updateSeguimiento(id, {
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      fecha_envio,
      estado
    });

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Seguimiento no encontrado' });
    }

    res.json({ message: 'Seguimiento actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar seguimiento:', error);
    res.status(500).json({ error: 'Error al actualizar seguimiento' });
  }
};

/**
 * Eliminar seguimiento
 */
exports.deleteSeguimiento = async (req, res) => {
  console.log("entro en deleteSeguimiento");
  try {
    const { id } = req.params;

    const affectedRows = await SeguimientoCorreo.deleteSeguimiento(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Seguimiento no encontrado' });
    }

    res.json({ message: 'Seguimiento eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar seguimiento:', error);
    res.status(500).json({ error: 'Error al eliminar seguimiento' });
  }
};

/**
 * Marcar correo como enviado
 */
exports.marcarComoEnviado = async (req, res) => {
  console.log("entro en marcarComoEnviado");
  try {
    const { id } = req.params;

    const affectedRows = await SeguimientoCorreo.marcarComoEnviado(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Seguimiento no encontrado' });
    }

    res.json({ message: 'Correo marcado como enviado' });
  } catch (error) {
    console.error('❌ Error al marcar como enviado:', error);
    res.status(500).json({ error: 'Error al marcar como enviado' });
  }
};
/**
 * Actualizar solo el estado de un seguimiento
 */
exports.updateEstadoSeguimiento = async (req, res) => {
  console.log("entro en updateEstadoSeguimiento");
  try {
    const { id } = req.params;
    const { estado } = req.body;
    console.log("Estado recibido:", estado);
    console.log("ID recibido:", id);
    if (!estado) {
      return res.status(400).json({
        error: 'El campo estado es obligatorio'
      });
    }

    const affectedRows = await SeguimientoCorreo.updateEstadoSeguimiento(
      id,
      estado
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        error: 'Seguimiento no encontrado'
      });
    }

    res.json({
      message: 'Estado actualizado correctamente',
      estado
    });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({
      error: 'Error al actualizar estado'
    });
  }
};
