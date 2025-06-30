const WooConfig = require('../models/woocommerce_config.model');
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await WooConfig.getAllConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error al obtener configuraciones WooCommerce:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};
exports.getConfigById = async (req, res) => {
  try {
    const config = await WooConfig.getConfigById(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};
exports.getConfigsByEmpresa = async (req, res) => {
  try {
    const configs = await WooConfig.getConfigsByEmpresaId(req.params.empresaId);
    res.json(configs);
  } catch (error) {
    console.error('Error al obtener configuración por empresa:', error);
    res.status(500).json({ error: 'Error al obtener configuración por empresa' });
  }
};
exports.createConfig = async (req, res) => {
  try {
    const id = await WooConfig.createConfig(req.body);
    res.status(201).json({ id });
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({ error: 'Error al crear configuración' });
  }
};
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await WooConfig.updateConfig(id, req.body);
    res.json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await WooConfig.deleteConfig(id);
    res.json({ message: 'Configuración eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ error: 'Error al eliminar configuración' });
  }
};
