const CorreoConfig = require('../models/correosConfig.model');

// Obtener todas las configuraciones de correo
exports.getCorreosConfig = async (req, res) => {
  try {
    const configs = await CorreoConfig.getAllCorreosConfig();
    res.json(configs);
  } catch (error) {
    console.error('❌ Error al obtener configuraciones de correo:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones de correo' });
  }
};

// Obtener una configuración por ID
exports.getCorreoConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await CorreoConfig.getCorreoConfigById(id);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(config);
  } catch (error) {
    console.error('❌ Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración de correo' });
  }
};

// Crear una nueva configuración de correo
exports.createCorreoConfig = async (req, res) => {
  try {
    const {
      store_id,
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_secure,
      smtp_username,
      smtp_password,
      sender_name,
      sender_email,
      reply_to_email,
      estado,
      uso
    } = req.body;
    if (!store_id || !smtp_host || !smtp_port || !smtp_username || !smtp_password || !smtp_secure) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const id = await CorreoConfig.createCorreoConfig({
      store_id,
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_secure,
      smtp_username,
      smtp_password,
      sender_name,
      sender_email,
      reply_to_email,
      estado,
      uso
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear configuración de correo:', error);
    res.status(500).json({ error: 'Error al crear configuración de correo' });
  }
};

// Actualizar una configuración existente
exports.updateCorreoConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await CorreoConfig.getCorreoConfigById(id);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    await CorreoConfig.updateCorreoConfig(id, req.body);
    res.json({ mensaje: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de correo' });
  }
};

// Eliminar configuración
exports.deleteCorreoConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await CorreoConfig.getCorreoConfigById(id);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    await CorreoConfig.deleteCorreoConfig(id);
    res.json({ mensaje: 'Configuración eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar configuración:', error);
    res.status(500).json({ error: 'Error al eliminar configuración de correo' });
  }
};


exports.getCorreosByStoreId = async (req, res) => {
    console.log('Obteniendo configuraciones de correos por store_id');
  const storeId = req.params.storeId;

  try {
    const configs = await CorreoConfig.getCorreosByStoreId(storeId);
    res.json(configs);
  } catch (error) {
    console.error('❌ Error al obtener configuraciones por store_id:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones por tienda' });
  }
};