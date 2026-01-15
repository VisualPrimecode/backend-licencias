const WooConfig = require('../models/woocommerce_config.model');
const WooAuxliar = require('../models/woo_config_auxiliar');
/** aca falta el importa del woomaps y el webhook model que rompe el tema por el bug cricular dependecy  */


/*
const getTopProductosVendidos = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Generando ranking de productos más vendidos...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Obtener pedidos
    const pedidos = await getAllPedidosByDateRange(idConfig, { startDate, endDate });
    console.log(`📦 Total pedidos obtenidos: ${pedidos.length}`);

    // 🔄 Tasas de conversión a CLP
    const conversionRates = {
      MXN: 52,
      PEN: 276,
      COP: 0.24,
      ARS: 1.46,
      CLP: 1,
    };

    // 2️⃣ Obtener todos los woo_product_id únicos
    const wooProductIdsSet = new Set();

    pedidos.forEach(pedido => {
      if (!Array.isArray(pedido.products)) return;
      pedido.products.forEach(p => {
        if (p.product_id) wooProductIdsSet.add(p.product_id);
      });
    });

    const wooProductIds = Array.from(wooProductIdsSet);

    // 3️⃣ Mapear a productos internos
    const mapeos = await WooMap.getProductosInternosIds(idConfig, wooProductIds);

    const wooToInternoMap = new Map(
      mapeos
        .filter(m => m.producto_interno_id !== null)
        .map(m => [m.woo_product_id, m.producto_interno_id])
    );

    // 4️⃣ Acumulador por producto interno
    const productos = {};

    pedidos.forEach(pedido => {
      const currency = pedido.currency || "CLP";
      const rate = conversionRates[currency] || 1;

      if (!Array.isArray(pedido.products)) return;

      pedido.products.forEach(product => {
        const internoId = wooToInternoMap.get(product.product_id);
        if (!internoId) return; // ⛔ ignorar sin mapeo

        const quantity = Number(product.quantity) || 0;
        const totalProducto = Number(product.total) || 0;
        const totalCLP = totalProducto * rate;

        if (!productos[internoId]) {
          productos[internoId] = {
            producto_interno_id: internoId,
            nombre: product.name,
            cantidad_vendida: 0,
            ingresos_clp: 0,
          };
        }

        productos[internoId].cantidad_vendida += quantity;
        productos[internoId].ingresos_clp += totalCLP;
      });
    });

    // 5️⃣ Normalizar productos y calcular ticket promedio
    const productosArray = Object.values(productos).map(p => {
      const ticketPromedio =
        p.cantidad_vendida > 0 ? p.ingresos_clp / p.cantidad_vendida : 0;

      return {
        producto_interno_id: p.producto_interno_id,
        nombre: p.nombre,
        cantidad_vendida: p.cantidad_vendida,
        ingresos_clp: Math.round(p.ingresos_clp),
        ingresos_clp_formatted: Math.round(p.ingresos_clp).toLocaleString("es-CL"),
        ticket_promedio_clp: Math.round(ticketPromedio),
        ticket_promedio_clp_formatted: Math.round(ticketPromedio).toLocaleString("es-CL"),
      };
    });

    // 6️⃣ Rankings
    const top10PorCantidad = [...productosArray]
      .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
      .slice(0, 10);

    const top10PorIngresos = [...productosArray]
      .sort((a, b) => b.ingresos_clp - a.ingresos_clp)
      .slice(0, 10);

    // 7️⃣ Resultado final
    return {
      total_orders: pedidos.length,
      total_productos_rankeados: productosArray.length,
      top_10_por_cantidad: top10PorCantidad,
      top_10_por_ingresos: top10PorIngresos,
    };

  } catch (error) {
    console.error("💥 Error al generar ranking de productos:", error);
    throw error;
  }
};*/
exports.getTopProductosVendidosController = async (req, res) => {
  console.log('📊 Generando informe de productos más vendidos...');
  try {
    const { id } = req.params; // ID de la configuración de WooCommerce
    const { startDate, endDate } = req.query; // rango de fechas desde query params

    const informe = await WooAuxliar.getTopProductosVendidos(id, { startDate, endDate });

    if (!informe || informe.total_orders === 0) {
      return res.status(404).json({ message: 'No se encontraron ventas en el periodo indicado' });
    }

    res.json(informe);
  } catch (error) {
    console.error('💥 Error al generar informe de ventas por país/divisa:', error);
    res.status(500).json({ error: 'Error al generar informe de ventas por país/divisa' });
  }
};
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
  console.log('🔍 Obteniendo pedidos WooCommerce.333..');
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
exports.getWooOrdersWithFilter = async (req, res) => {
  console.log('🔍 Obteniendo pedidos WooCommerce...');

  try {
    const { id } = req.params;
    const { productos, ...queryParams } = req.query;

    // Convertir productos a array de números
    const productoInternoIds = productos
      ? productos.split(',').map(id => Number(id)).filter(Boolean)
      : [];

    const orders = await WooConfig.getPedidosFiltradoProductos(
      id,
      productoInternoIds,
      queryParams
    );

    if (!orders) {
      return res.status(404).json({
        error: 'Configuración no encontrada'
      });
    }

    res.json(orders);

  } catch (error) {
    console.error('Error al obtener pedidos WooCommerce:', error);
    res.status(500).json({
      error: 'Error al obtener pedidos WooCommerce'
    });
  }
};
/*
exports.getWooOrdersWithFilterGlobal = async (req, res) => {
  console.log('🌍 Obteniendo pedidos WooCommerce (GLOBAL)...');

  try {
    const { productos, ...queryParams } = req.query;

    // Convertir productos a array de números
    const productoInternoIds = productos
      ? productos
          .split(',')
          .map(id => Number(id))
          .filter(Boolean)
      : [];

    const orders =
      await WooConfig.getPedidosFiltradoProductosGlobal(
        productoInternoIds,
        queryParams
      );

    if (!orders) {
      return res.status(404).json({
        error: 'No se encontraron pedidos'
      });
    }

    res.json(orders);

  } catch (error) {
    console.error(
      'Error al obtener pedidos WooCommerce (GLOBAL):',
      error
    );

    res.status(500).json({
      error: 'Error al obtener pedidos WooCommerce'
    });
  }
};*/
exports.getWooOrdersWithFilterGlobal = async (req, res) => {
  console.log('🌍 Obteniendo pedidos WooCommerce (GLOBAL)...');

  try {
    const { productos, page, per_page, ...restQueryParams } = req.query;

    // ─────────────────────────────
    // 1️⃣ Normalizar productos internos
    // ─────────────────────────────
    const productoInternoIds = productos
      ? productos
          .split(',')
          .map(id => Number(id))
          .filter(id => Number.isInteger(id) && id > 0)
      : [];

    // ─────────────────────────────
    // 2️⃣ Normalizar paginación
    //    (aplica por tienda Woo)
    // ─────────────────────────────
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const perPageNumber = Math.min(
      Math.max(parseInt(per_page, 10) || 10, 1),
      100 // límite WooCommerce
    );

    const queryParams = {
      page: pageNumber,
      per_page: perPageNumber,
      ...restQueryParams
    };

    // ─────────────────────────────
    // 3️⃣ Obtener pedidos globales
    // ─────────────────────────────
    const orders =
      await WooConfig.getPedidosFiltradoProductosGlobal(
        productoInternoIds,
        queryParams
      );

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.json([]);
    }

    // ─────────────────────────────
    // 4️⃣ Respuesta plana (sin paginar global)
    // ─────────────────────────────
    res.json(orders);

  } catch (error) {
    console.error(
      '❌ Error al obtener pedidos WooCommerce (GLOBAL):',
      error
    );

    res.status(500).json({
      error: 'Error al obtener pedidos WooCommerce'
    });
  }
};



// Actualizar un pedido de WooCommerce
exports.updateWooOrder = async (req, res) => {
  console.log("🔄 Actualizando pedido WooCommerce...");

  try {
    const { configId, orderId } = req.params; 
    const data = req.body; // Ej: { "status": "completed" }

    console.log(`📦 Datos recibidos para actualizar pedido ${orderId}:`, data);

    // Validaciones básicas
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No se enviaron datos para actualizar el pedido" });
    }

    const updatedOrder = await WooConfig.updatePedido(configId, orderId, data);

    if (!updatedOrder) {
      return res.status(404).json({ error: "Pedido no encontrado o no pudo ser actualizado" });
    }

    console.log(`✅ Pedido ${orderId} actualizado correctamente.`);
    res.json(updatedOrder);

  } catch (error) {
    console.error("❌ Error al actualizar pedido WooCommerce:", error.response?.data || error);
    res.status(500).json({ 
      error: "Error al actualizar pedido WooCommerce",
      details: error.response?.data || error.message
    });
  }
};

//obtener todos los pedidos de un WooCommerce
exports.getAllConfigsWooOrdersFallidas = async (req, res) => {
  console.log('🔍 Obteniendo pedidos WooCommerce...');
  try {
    const { id } = req.params;
    const queryParams = req.query; // ✅ Añadido: recoger los query params

    const orders = await WooConfig.getPedidosFallidos(id, queryParams); // ✅ Pasarlos
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
exports.getAllWooOrderState = async (req, res) => {
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
exports.getVentasPorTipoSoftware = async (req, res) => {
  console.log('📊 Generando informe de ventas por tipo de software...');

  try {
    const { id } = req.params; // ID de la configuración de WooCommerce
    const { startDate, endDate } = req.query; // rango de fechas desde query params

    const informe = await WooConfig.getVentasPorTipoSoftware(id, { startDate, endDate });

    if (
      !informe ||
      !Array.isArray(informe.ventas_por_tipo_software) ||
      informe.ventas_por_tipo_software.every(
        (cat) => cat.cantidad_vendida === 0 && cat.ingresos === 0
      )
    ) {
      return res
        .status(404)
        .json({ message: 'No se encontraron ventas en el periodo indicado' });
    }

    res.json(informe);

  } catch (error) {
    console.error('💥 Error al generar informe de ventas por tipo de software:', error);
    res
      .status(500)
      .json({ error: 'Error al generar informe de ventas por tipo de software' });
  }
};
exports.getVentasPorTipoSoftwareGlobal = async (req, res) => {
  console.log('📊 Generando informe de ventas por tipo de software...');

  try {
    const { startDate, endDate } = req.query; // rango de fechas desde query params

    const informe = await WooAuxliar.getVentasPorTipoSoftwareGlobal({ startDate, endDate });

    if (
      !informe ||
      !Array.isArray(informe.ventas_por_tipo_software) ||
      informe.ventas_por_tipo_software.every(
        (cat) => cat.cantidad_vendida === 0 && cat.ingresos === 0
      )
    ) {
      return res
        .status(404)
        .json({ message: 'No se encontraron ventas en el periodo indicado' });
    }

    res.json(informe);

  } catch (error) {
    console.error('💥 Error al generar informe de ventas por tipo de software:', error);
    res
      .status(500)
      .json({ error: 'Error al generar informe de ventas por tipo de software' });
  }
};
exports.getVentasPorProductoGlobal = async (req, res) => {
  console.log('📊 Generando informe de ventas por producto...');

  try {
    const { startDate, endDate } = req.query;

    const informe = await WooAuxliar.getVentasPorProductoGlobal({
      startDate,
      endDate,
    });

    if (
      !informe ||
      !Array.isArray(informe.ventas_por_producto) ||
      informe.ventas_por_producto.length === 0 ||
      informe.ventas_por_producto.every(
        (prod) =>
          prod.cantidad_vendida === 0 && prod.ingresos_clp === 0
      )
    ) {
      return res
        .status(404)
        .json({ message: 'No se encontraron ventas en el periodo indicado' });
    }

    res.json(informe);

  } catch (error) {
    console.error('💥 Error al generar informe de ventas por producto:', error);
    res
      .status(500)
      .json({ error: 'Error al generar informe de ventas por producto' });
  }
};

exports.getCrecimientoVentasGlobal = async (req, res) => {
  console.log('📈 Generando informe de crecimiento de ventas...');

  try {
    const informe = await WooAuxliar.getCrecimientoVentasGlobal();

    if (
      !informe ||
      (!informe.hoy_vs_ayer && !informe.mes_actual_vs_anterior)
    ) {
      return res
        .status(404)
        .json({ message: 'No se pudieron calcular métricas de crecimiento' });
    }

    res.json(informe);

  } catch (error) {
    console.error(
      '💥 Error al generar informe de crecimiento de ventas:',
      error
    );

    res.status(500).json({
      error: 'Error al generar informe de crecimiento de ventas',
    });
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
// 🚀 Informe GLOBAL: Promedio de ventas por producto
exports.getPromedioProductosGlobal = async (req, res) => {
  console.log("🌎 Generando informe GLOBAL de promedio de ventas por producto...");

  try {
    const { startDate, endDate } = req.query;

    const informe = await WooConfig.getPromedioProductosGlobal({ startDate, endDate });

    if (!informe || informe.total_products === 0) {
      return res.status(404).json({ message: "No se encontraron ventas en el rango indicado." });
    }

    res.json(informe);
  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de promedio de ventas por producto:", error);
    res.status(500).json({ error: "Error al generar informe GLOBAL de promedio de ventas por producto" });
  }
};
//pedidos pendientes
//revisar pedidos
// Obtener pedidos de WooCommerce que aún no han sido enviados
exports.getWooOrdersNotSent = async (req, res) => {
  console.log('🚚 Verificando pedidos no enviados...');
  
  try {
    const { id } = req.params; // woo_id (configuración Woo)
    const queryParams = req.query; // Ej: { per_page: 100, page: 3 }

    // 1️⃣ Obtener pedidos desde WooCommerce
    const pedidosWoo = await WooConfig.getPedidos(id, queryParams);

    if (!pedidosWoo || pedidosWoo.length === 0) {
      return res.status(200).json({ message: 'No se encontraron pedidos en WooCommerce', pedidos: [] });
    }

    // 2️⃣ Filtrar los pedidos que aún no se han registrado en la tabla 'envios'
    const pedidosNoEnviados = await WooConfig.getPedidosNoEnviadosPorTienda(id, pedidosWoo);

    console.log(`📦 WooID ${id}: ${pedidosNoEnviados.length} pedidos nuevos sin enviar`);

    // 3️⃣ Responder al cliente con los pedidos no enviados
    res.status(200).json({
      woo_id: id,
      total_woo: pedidosWoo.length,
      nuevos_pedidos: pedidosNoEnviados.length,
      pedidos: pedidosNoEnviados,
    });

  } catch (error) {
    console.error('❌ Error al verificar pedidos no enviados:', error);
    res.status(500).json({ error: 'Error al verificar pedidos no enviados', details: error.message });
  }
};

