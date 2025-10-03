const WooConfig = require('../models/woocommerce_config.model');
exports.getAllConfigs = async (req, res) => {
  console.log('🔍 Obteniendo todas las configuraciones WooCommerce...');
  try {
    const configs = await WooConfig.getAllConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error al obtener configuraciones WooCommerce:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};

exports.syncProducts = async (req, res) => {
  const { storeId } = req.params;

  console.log(`🔄 Sincronizando productos de la tienda: ${storeId}...`);

  try {
    if (!storeId) {
      return res.status(400).json({ error: "Falta el parámetro storeId" });
    }

    const result = await WooConfig.syncProductsFromStore(storeId);

    res.json({
      success: true,
      message: result.message || "Productos sincronizados correctamente"
    });
  } catch (error) {
    console.error("❌ Error al sincronizar productos:", error.response?.data || error);
    res.status(500).json({
      success: false,
      error: "Error al sincronizar productos",
      details: error.message
    });
  }
};

//obtener todos los prodcutos de  un WooCommerce
exports.getAllConfigsWooProducts = async (req, res) => {
  console.log('🔍 Obteniendo productos WooCommerce...');
  console.log('Params:', req.params); // Añadido para depuración
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
  console.log('🔍 Obteniendo pedidos WooCommerce...');
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
exports.searchWooOrders = async (req, res) => {
  console.log('🔍 Buscando pedidos WooCommerce con filtros...');
  try {
    const { id } = req.params;
    const { name, email, startDate, endDate } = req.query; // ✅ Recoger filtros desde query params

    const orders = await WooConfig.searchPedidos(id, { name, email, startDate, endDate });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No se encontraron pedidos con esos filtros' });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error al buscar pedidos WooCommerce (lento):', error);
    res.status(500).json({ error: 'Error al buscar pedidos WooCommerce' });
  }
};

exports.getWooOrderById = async (req, res) => {
  console.log('🔍 Buscando pedido WooCommerce por ID...');
  try {
    const { id, orderId } = req.params; // ✅ Corrección aquí

    if (!orderId) {
      return res.status(400).json({ message: 'Falta el parámetro "orderId"' });
    }

    const order = await WooConfig.getPedidoById(id, orderId);

    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Error al obtener pedido por ID:', error);
    res.status(500).json({ error: 'Error al obtener pedido por ID' });
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
exports.getVentasPorPais = async (req, res) => {
  console.log('📊 Generando informe de ventas por país/divisa...');
  try {
    const { id } = req.params; // ID de la configuración de WooCommerce
    const { startDate, endDate } = req.query; // rango de fechas desde query params

    const informe = await WooConfig.getVentasPorPais(id, { startDate, endDate });

    if (!informe || informe.total_orders === 0) {
      return res.status(404).json({ message: 'No se encontraron ventas en el periodo indicado' });
    }

    res.json(informe);
  } catch (error) {
    console.error('💥 Error al generar informe de ventas por país/divisa:', error);
    res.status(500).json({ error: 'Error al generar informe de ventas por país/divisa' });
  }
};

exports.getVentasTotalesMXN = async (req, res) => {
  console.log('📊 Generando informe de ventas en MXN...');
  try {
    const { id } = req.params; // 🆔 ID de la config de WooCommerce
    const { startDate, endDate } = req.query; // 📅 rango de fechas desde query params

    const informe = await WooConfig.getVentasTotalesMXN(id, { startDate, endDate });

    if (!informe || informe.total_orders === 0) {
      return res.status(404).json({ message: 'No se encontraron ventas en MXN para el periodo indicado' });
    }

    res.json(informe);
  } catch (error) {
    console.error('Error al generar informe de ventas en MXN:', error);
    res.status(500).json({ error: 'Error al generar informe de ventas en MXN' });
  }
};
// 📈 Informe de tendencia de ventas en MXN
exports.getTendenciaProductosMXN = async (req, res) => {
  console.log('📊 Generando informe de TENDENCIA de productos en MXN...');
  try {
    const { id } = req.params; // 🆔 ID de la config de WooCommerce
    const { startDate, endDate } = req.query; // 📅 rango de fechas desde query params

    const informe = await WooConfig.getTendenciaProductosMXN(id, { startDate, endDate });

    if (!informe || informe.productos.length === 0) {
      return res.status(404).json({ message: 'No se encontraron ventas en MXN para el periodo indicado' });
    }

    res.json(informe);
  } catch (error) {
    console.error('Error al generar informe de tendencia de productos en MXN:', error);
    res.status(500).json({ error: 'Error al generar informe de tendencia de productos en MXN' });
  }
};
exports.getVentasPorPaisGlobal = async (req, res) => {
  console.log("🌎 Generando informe GLOBAL de ventas por país...");
  try {
    const { startDate, endDate } = req.query;

    const informe = await WooConfig.getVentasPorPaisGlobal({ startDate, endDate });

    if (!informe) {
      return res.status(404).json({ message: "No se encontraron ventas para el periodo indicado" });
    }

    res.json(informe);
  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de ventas por país:", error);
    res.status(500).json({ error: "Error al generar informe GLOBAL de ventas por país" });
  }
};
