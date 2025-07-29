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
//obtener todos los prodcutos de  un WooCommerce
exports.getAllConfigsWooProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const queryParams = req.query; // <-- per_page, page, _fields, etc.

    const products = await WooConfig.getProducts(id, queryParams);

    if (!products) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos WooCommerce:', error);
    res.status(500).json({ error: 'Error al obtener productos WooCommerce' });
  }
};

//obtener todos los pedidos de un WooCommerce
exports.getAllConfigsWooOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const queryParams = req.query; // ✅ Añadido: recoger los query params

    const orders = await WooConfig.getPedidos(id, queryParams); // ✅ Pasarlos
    //console.log('Orders:', orders); // ✅ Añadido: para depuración

    if (!orders) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error al obtener pedidos WooCommerce:', error);
    res.status(500).json({ error: 'Error al obtener pedidos WooCommerce' });
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
