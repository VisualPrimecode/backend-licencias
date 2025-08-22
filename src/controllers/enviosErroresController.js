const EnviosErrores = require('../models/enviosErrores.model');

// Obtener todos los envíos con errores
exports.getEnviosErrores = async (req, res) => {
  console.log("Obteniendo todos los envíos con errores...");
  try {
    const envios = await EnviosErrores.getAllEnviosErrores();
    res.json(envios);
  } catch (error) {
    console.error('❌ Error al obtener envíos con errores:', error);
    res.status(500).json({ error: 'Error al obtener envíos con errores' });
  }
};

// Obtener un envío con error por ID
exports.getEnvioErrorById = async (req, res) => {
  try {
    const { id } = req.params;
    const envio = await EnviosErrores.getEnvioErrorById(id);

    if (!envio) {
      return res.status(404).json({ error: 'Envío con error no encontrado' });
    }

    res.json(envio);
  } catch (error) {
    console.error('❌ Error al obtener envío con error:', error);
    res.status(500).json({ error: 'Error al obtener envío con error' });
  }
};

// Crear un nuevo registro de envío con error
exports.createEnvioError = async (req, res) => {
  try {
    const {
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado = 'fallido',
      motivo_error,
      detalles_error
    } = req.body;

    // Validación mínima
    if (!motivo_error) {
      return res.status(400).json({ error: 'El motivo del error es obligatorio' });
    }

    const id = await EnviosErrores.createEnvioError({
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío con error:', error);
    res.status(500).json({ error: 'Error al crear envío con error' });
  }
};

// Actualizar solo el estado de un envío con error
exports.updateEstadoEnvioError = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const envio = await EnviosErrores.getEnvioErrorById(id);
    if (!envio) {
      return res.status(404).json({ error: 'Envío con error no encontrado' });
    }

    await EnviosErrores.updateEstadoEnvioError(id, estado);
    res.json({ mensaje: 'Estado de envío con error actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar estado de envío con error:', error);
    res.status(500).json({ error: 'Error al actualizar estado de envío con error' });
  }
};

// Actualizar un envío con error
exports.updateEnvioError = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    } = req.body;

    const envio = await EnviosErrores.getEnvioErrorById(id);
    if (!envio) {
      return res.status(404).json({ error: 'Envío con error no encontrado' });
    }

    await EnviosErrores.updateEnvioError(id, {
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    });

    res.json({ mensaje: 'Envío con error actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar envío con error:', error);
    res.status(500).json({ error: 'Error al actualizar envío con error' });
  }
};

// Eliminar un envío con error
exports.deleteEnvioError = async (req, res) => {
  try {
    const { id } = req.params;

    const envio = await EnviosErrores.getEnvioErrorById(id);
    if (!envio) {
      return res.status(404).json({ error: 'Envío con error no encontrado' });
    }

    await EnviosErrores.deleteEnvioError(id);
    res.json({ mensaje: 'Envío con error eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar envío con error:', error);
    res.status(500).json({ error: 'Error al eliminar envío con error' });
  }
};
