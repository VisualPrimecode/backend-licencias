const DBConfig = require('../models/dbConnectionConfig.model');

// Obtener todas las configuraciones
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await DBConfig.getAllConfigs();
    res.json(configs);
  } catch (error) {
    console.error('❌ Error al obtener configuraciones:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};

// Obtener configuraciones por empresa_id
exports.getConfigsByEmpresaId = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const configs = await DBConfig.getConfigsByEmpresaId(empresaId);
    res.json(configs);
  } catch (error) {
    console.error('❌ Error al obtener configs por empresa:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};

// Obtener configuraciones por woo_id
exports.getConfigsByWooId = async (req, res) => {
  try {
    const { id_woo } = req.params;
    const configs = await DBConfig.getConfigByIdWoo(id_woo);
    res.json(configs);
  } catch (error) {
    console.error('❌ Error al obtener configs por empresa:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};


// Obtener configuración por ID
exports.getConfigById = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await DBConfig.getConfigById(id);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(config);
  } catch (error) {
    console.error('❌ Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// Crear nueva configuración
exports.createConfig = async (req, res) => {
  try {
    const {
      empresa_id,
      nombre_alias,
      host,
      puerto,
      nombre_base_datos,
      usuario,
      contrasena,
      estado,
      notas
    } = req.body;

    // Validaciones básicas
    if (!empresa_id || !host || !puerto || !nombre_base_datos || !usuario || !contrasena) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }

    const newConfigId = await DBConfig.createConfig({
      empresa_id,
      nombre_alias,
      host,
      puerto,
      nombre_base_datos,
      usuario,
      contrasena,
      estado,
      notas
    });

    res.status(201).json({ id: newConfigId });
  } catch (error) {
    console.error('❌ Error al crear configuración:', error);
    res.status(500).json({ error: 'Error al crear configuración' });
  }
};

// Actualizar configuración
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const result = await DBConfig.updateConfig(id, datos);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json({ mensaje: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// Eliminar configuración
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await DBConfig.deleteConfig(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json({ mensaje: 'Configuración eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar configuración:', error);
    res.status(500).json({ error: 'Error al eliminar configuración' });
  }
};
