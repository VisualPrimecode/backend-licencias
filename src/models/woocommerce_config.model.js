const db = require('../config/db');
const model = require('../models/webhook.model');

// Obtener todas las configuraciones WooCommerce
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_api_config');
  return rows;
};
//obtener productos de WooCommerce por ID de wooCommerce


const getProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);

   // console.log("estructura de la api", api);
 //   console.log("queryParams", queryParams);

    // ✅ CORRECTO: sin { params: ... }
    const response = await api.get("products", queryParams);

    //console.log("URL final:", response.config.url);
    //console.log("Base URL:", response.config.baseURL);
   // console.log("Params:", response.config.params);

    return response.data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price
    }));
    
  } catch (error) {
    console.error("Error obteniendo productos:", error.response?.data || error);
    throw error;
  }
};

// Trae TODOS los productos de WooCommerce con paginación
const getAllProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    let page = 1;
    let allProducts = [];
    let hasMore = true;

    while (hasMore) {
      const response = await api.get("products", {
        ...queryParams,
        per_page: 100, // WooCommerce permite hasta 100 por página
        page
      });

      const products = response.data.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price
      }));

      allProducts = allProducts.concat(products);

      // si la respuesta vino vacía, significa que no hay más páginas
      hasMore = products.length > 0;
      page++;
    }

    return allProducts;
  } catch (error) {
    console.error("Error obteniendo todos los productos:", error.response?.data || error);
    throw error;
  }
};
const syncProductsFromStore = async (storeId) => {
  try {
    // 1. Obtener la instancia de API WooCommerce
    const api = await model.getWooApiInstanceByConfigId(storeId);

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // 2. Llamar a WooCommerce para obtener productos
      const response = await api.get("products", {
        per_page: 100,
        page
      });

      const products = response.data;

      // 3. Iterar sobre productos y guardar en BD
      for (const product of products) {
        const data = {
          Nombre: product.name,
          Precio_normal: product.regular_price || null,
          Precio_rebajado: product.sale_price || null,
          id_wooproduct: product.id,
          id_woo: storeId
        };

        // 🔑 Si existe el producto (por id_wooproduct), actualizar
        // 🔑 Si no, insertarlo
        await db.query(`
          INSERT INTO productosAux (Nombre, Precio_normal, Precio_rebajado, id_wooproduct, id_woo)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            Nombre = VALUES(Nombre),
            Precio_normal = VALUES(Precio_normal),
            Precio_rebajado = VALUES(Precio_rebajado)
        `, [data.Nombre, data.Precio_normal, data.Precio_rebajado, data.id_wooproduct, data.id_woo]);
      }

      // 4. Verificar si hay más páginas
      hasMore = products.length > 0;
      page++;
    }

    return { success: true, message: "Productos sincronizados correctamente" };
  } catch (error) {
    console.error("Error sincronizando productos:", error.response?.data || error);
    throw error;
  }
};


/*
const axios = require('axios');

const getProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);

    const { per_page = 10, page = 1, _fields = 'id,name,price,images' } = queryParams;

    // Construimos la URL completa usando los datos de la instancia
    const url = `${api.url}${api.wpAPIPrefix}/${api.version}/products` +
                `?_fields=${_fields}&per_page=${per_page}&page=${page}` +
                `&consumer_key=${api.consumerKey}&consumer_secret=${api.consumerSecret}`;

    console.log("URL final:", url);

    const response = await axios.get(url);

    return response.data;
  } catch (error) {
    console.error("Error obteniendo productos:", error.response?.data || error);
    throw error;
  }
};
*/

const getPedidoById = async (idConfig, pedidoId) => {
  console.log(`🔍 Obteniendo pedido por ID: ${pedidoId} para la configuración ID: ${idConfig}`);
  if (!idConfig || !pedidoId) throw new Error("idConfig y pedidoId son requeridos");

  try {
    const api = await model.getWooApiInstanceByConfigId(idConfig);
    console.log(`🔍 Buscando pedido por ID: ${pedidoId}`);

    const response = await api.get(`orders/${pedidoId}`);
    const order = response.data;

    if (!order) {
      console.log("❌ Pedido no encontrado.");
      return null;
    }

   if (order.status !== 'completed' && order.status !== 'processing') {
  console.log(`⚠️ Pedido ${pedidoId} no está completado ni en proceso (estado: ${order.status})`);
  return null;
}


    return {
      id: order.id,
      customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
      customer_email: order.billing?.email || null,
      status: order.status,
      total: parseFloat(order.total || 0),
      date_created: order.date_created,
      payment_method: order.payment_method_title || order.payment_method,
      products: (order.line_items || []).map(item => {
        // Buscar en meta_data la entrada con key = _tmcartepo_data
        const extraOptionData = (item.meta_data || []).find(meta => meta.key === '_tmcartepo_data');
        
        // Mapear si existe
        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: opt.price || 0
            }))
          : [];
         // console.log("extra_options", extraOptionData);

        return {
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options // <-- nuevas opciones extra aquí
        };
      })
    };

  } catch (error) {
    console.error("💥 Error al obtener pedido por ID:", error.response?.data || error.message);
    if (error.response?.status === 404) return null;
    throw new Error(`No se pudo obtener el pedido: ${error.message}`);
  }
};


// Buscar pedidos por nombre, correo o rango de fechas (versión lenta)
const searchPedidos = async (idConfig, { name, email, startDate, endDate }) => {
  console.log("⏳ Iniciando búsqueda exacta de pedidos...");
  console.log("🔍 Filtros recibidos:", { name, email, startDate, endDate });

  const normalizeString = (str) =>
    str
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  try {
    const api = await model.getWooApiInstanceByConfigId(idConfig);
    //console.log("✅ Instancia de API obtenida");

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setFullYear(now.getFullYear() - 1);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : now;

    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    console.log("📅 Rango de fechas:", { startISO, endISO });

    const perPage = 100;
    const maxPages = 100;
    const batchSize = 5;

    const targetFullName = normalizeString(name);
    const targetEmail = normalizeString(email);

    let matches = [];
    let stopRequesting = false;

    for (let i = 0; i < maxPages && !stopRequesting; i += batchSize) {
      const pageBatch = Array.from({ length: batchSize }, (_, j) => i + j + 1);
      console.log(`🚀 Solicitando páginas:`, pageBatch);

      const promises = pageBatch.map(page =>
        api.get("orders", {
          per_page: perPage,
          page,
          after: startISO,
          before: endISO,
        }).then(res => res.data).catch(err => {
          console.warn(`⚠️ Error en página ${page}:`, err.message || err);
          return [];
        })
      );

      const results = await Promise.all(promises);
      const orders = results.flat();

      for (const order of orders) {
        // 🔥 Filtrar solo pedidos completados
        if (order.status !== 'completed') continue;

        const fullName = normalizeString(`${order.billing.first_name} ${order.billing.last_name}`);
        const orderEmail = normalizeString(order.billing.email);

        const fullNameMatch = targetFullName && fullName === targetFullName;
        const emailMatch = targetEmail && orderEmail === targetEmail;
if (fullNameMatch || emailMatch) {
  console.log("🎯 Coincidencia encontrada:", order.id);

  matches.push({
    id: order.id,
    customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
    customer_email: order.billing.email,
    status: order.status,
    total: order.total,
    date_created: order.date_created,
    payment_method: order.payment_method_title || order.payment_method,
    products: order.line_items.map(item => {
      // Buscar opciones extra en _tmcartepo_data
      const extraOptionData = (item.meta_data || []).find(meta => meta.key === '_tmcartepo_data');
      const extra_options = Array.isArray(extraOptionData?.value)
        ? extraOptionData.value.map(opt => ({
            name: opt.name,
            value: opt.value,
            price: opt.price || 0
          }))
        : [];

      return {
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        extra_options // <-- añadidas aquí
      };
    })
  });

  if (!stopRequesting) stopRequesting = true;
}

      }

      if (orders.length < perPage * batchSize) {
        console.log("🛑 Fin anticipado: no hay más pedidos.");
        break;
      }
    }

    if (matches.length === 0) {
      console.log("❌ No se encontró ningún pedido completado que coincida.");
    }

    return matches;

  } catch (error) {
    console.error("💥 Error en búsqueda exacta:", error.response?.data || error);
    throw error;
  }
};

/*

//pedidos para envio manual de pedidos
const getPedidos = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);
 // console.log("queryParams recibidos:", queryParams);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);

    // Pasamos los queryParams directamente
    const response = await api.get("orders", queryParams);

    //console.log("URL final:", response.config.url);
    //console.log("Base URL:", response.config.baseURL);
   // console.log("Params:", response.config.params);

    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "completed" || order.status === "processing"
    );

    const filteredOrders = completedOrders.map(order => ({
      id: order.id,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      customer_email: order.billing.email,
      status: order.status,
      total: parseFloat(order.total || 0),
      payment_method: order.payment_method_title || order.payment_method,
      products: order.line_items.map(item => {
        // Buscar en meta_data la entrada con key = _tmcartepo_data
        const extraOptionData = (item.meta_data || []).find(meta => meta.key === '_tmcartepo_data');

        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: opt.price || 0
            }))
          : [];

        return {
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options
        };
      })
    }));

    return filteredOrders;
  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};*/

const getPedidos = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("orders", queryParams);

    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "completed" || order.status === "processing"
    );
    console.log(`Pedidos recibidos de WooCommerce (sin filtrar): ${response.data.length}`);

    const filteredOrders = completedOrders.map(order => ({
      id: order.id,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      customer_email: order.billing.email,
      status: order.status,
      total: parseFloat(order.total || 0),
      currency: order.currency, // 👈 NUEVO CAMPO
      payment_method: order.payment_method_title || order.payment_method,
      products: order.line_items.map(item => {
        const extraOptionData = (item.meta_data || []).find(meta => meta.key === '_tmcartepo_data');

        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: opt.price || 0
            }))
          : [];

        return {
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options
        };
      })
    }));

    return filteredOrders;
  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};
/*
// 📊 Obtener informe de ventas totales en MXN en un rango de fechas
const getVentasTotalesMXN = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Calculando ventas totales en MXN...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 🔄 Usamos el nuevo método con paginación completa
    const pedidos = await getAllPedidosByDateRange(idConfig, { startDate, endDate });

    console.log(`📦 Pedidos obtenidos del rango (${startDate} - ${endDate}): ${pedidos.length}`);

    // Filtrar solo los pedidos en MXN
    const mxnOrders = pedidos.filter(order => order.currency === "MXN");

    // Calcular monto total y cantidades
    const totalAmount = mxnOrders.reduce((acc, order) => acc + order.total, 0);

    return {
      total_orders: mxnOrders.length,
      total_amount_mxn: totalAmount,
      orders: mxnOrders.map(order => ({
        id: order.id,
        total: order.total,
        currency: order.currency,
        date_created: order.date_created,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        payment_method: order.payment_method
      }))
    };

  } catch (error) {
    console.error("💥 Error en getVentasTotalesMXN:", error);
    throw error;
  }
};*/
// 📊 Obtener informe de ventas totales en MXN en un rango de fechas


// 🔎 Obtener TODOS los pedidos dentro de un rango de fechas (con paginación)
const getAllPedidosByDateRange = async (idConfig, { startDate, endDate }) => {
  console.log("⏳ Iniciando búsqueda de pedidos por rango de fechas...");
  console.log("📅 Filtros recibidos:", { startDate, endDate });

  try {
    const api = await model.getWooApiInstanceByConfigId(idConfig);

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setFullYear(now.getFullYear() - 1);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : now;

    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    console.log("📅 Rango de fechas:", { startISO, endISO });

    const perPage = 100;
    const maxPages = 100; // 👉 máximo 10,000 pedidos (100 x 100)
    const batchSize = 5;

    let allOrders = [];

    for (let i = 0; i < maxPages; i += batchSize) {
      const pageBatch = Array.from({ length: batchSize }, (_, j) => i + j + 1);
      console.log(`🚀 Solicitando páginas:`, pageBatch);

      const promises = pageBatch.map(page =>
        api.get("orders", {
          per_page: perPage,
          page,
          after: startISO,
          before: endISO,
        }).then(res => res.data).catch(err => {
          console.warn(`⚠️ Error en página ${page}:`, err.message || err);
          return [];
        })
      );

      const results = await Promise.all(promises);
      const orders = results.flat();

      // Filtrar pedidos con estado válido
      const validOrders = orders.filter(order =>
        order.status === "completed" || order.status === "processing"
      );

      // Mapear al formato que ya usamos en getPedidos
      const formattedOrders = validOrders.map(order => ({
        id: order.id,
        customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        customer_email: order.billing.email,
        status: order.status,
        total: parseFloat(order.total || 0),
        currency: order.currency,
        payment_method: order.payment_method_title || order.payment_method,
        products: order.line_items.map(item => {
          const extraOptionData = (item.meta_data || []).find(meta => meta.key === '_tmcartepo_data');

          const extra_options = Array.isArray(extraOptionData?.value)
            ? extraOptionData.value.map(opt => ({
                name: opt.name,
                value: opt.value,
                price: opt.price || 0
              }))
            : [];

          return {
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            variation_id: item.variation_id || null,
            extra_options
          };
        })
      }));

      allOrders.push(...formattedOrders);

      // 🚪 Corte anticipado si ya no hay más pedidos
      if (orders.length < perPage * batchSize) {
        console.log("🛑 Fin anticipado: no hay más pedidos.");
        break;
      }
    }

    console.log(`✅ Pedidos obtenidos en total: ${allOrders.length}`);
    return allOrders;

  } catch (error) {
    console.error("💥 Error obteniendo pedidos por rango:", error.response?.data || error);
    throw error;
  }
};

const getPedidosInforme = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);
  console.log("queryParams recibidos:", queryParams);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
   // console.log("Instancia de API obtenida:", api);

    // Pasamos los queryParams directamente
    const response = await api.get("orders", queryParams);

    console.log("URL final:", response.config.url);
    console.log("Base URL:", response.config.baseURL);
    console.log("Params:", response.config.params);

    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "completed" || order.status === "processing"
    );

    const filteredOrders = completedOrders.map(order => ({
      id: order.id,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`,
      customer_email: order.billing.email,
      status: order.status,
      products: order.line_items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity
      }))
    }));

    return filteredOrders;
  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};




// Obtener configuración por ID
const getConfigById = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM woocommerce_api_config WHERE id = ?',
    [id]
  );
  return rows[0];
};

// Crear nueva configuración WooCommerce
const createConfig = async (config) => {
  const {
    empresa_id,
    nombre_alias,
    url,
    clave_cliente,
    clave_secreta,
    estado = 'activa',
    notas,
  } = config;

  const [result] = await db.query(
    `INSERT INTO woocommerce_api_config 
     (empresa_id, nombre_alias, url, clave_cliente, clave_secreta, estado, notas) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [empresa_id, nombre_alias, url, clave_cliente, clave_secreta, estado, notas]
  );

  return result.insertId;
};

// Actualizar configuración
const updateConfig = async (id, config) => {
  const {
    nombre_alias,
    url,
    clave_cliente,
    clave_secreta,
    estado,
    notas,
    ultima_verificacion,
  } = config;

  await db.query(
    `UPDATE woocommerce_api_config 
     SET nombre_alias = ?, url = ?, clave_cliente = ?, clave_secreta = ?, estado = ?, notas = ?, ultima_verificacion = ? 
     WHERE id = ?`,
    [nombre_alias, url, clave_cliente, clave_secreta, estado, notas, ultima_verificacion, id]
  );

  return true;
};

// Eliminar configuración
const deleteConfig = async (id) => {
  await db.query('DELETE FROM woocommerce_api_config WHERE id = ?', [id]);
  return true;
};

// Obtener configuración por empresa_id
const getConfigsByEmpresaId = async (empresaId) => {
  const [rows] = await db.query(
    'SELECT * FROM woocommerce_api_config WHERE empresa_id = ?',
    [empresaId]
  );
  return rows;
};
// 📈 Informe de tendencia de ventas por producto en MXN
// 📊 Analizar tendencia de ventas de productos en MXN
// 📊 Analizar tendencia de ventas de productos en MXN
const getTendenciaProductosMXN = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Calculando tendencia de productos en MXN...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 🔹 Normalizar fechas para evitar errores por horas
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // inicio del día

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // fin del día

    // 🔹 Calcular rango de días incluyente
    const msPorDia = 1000 * 60 * 60 * 24;
    const rangoDias = Math.floor((end - start) / msPorDia) + 1;

    // 🔹 Definir rango anterior equivalente
    const anteriorEnd = new Date(start);
    anteriorEnd.setDate(anteriorEnd.getDate() - 1);
    anteriorEnd.setHours(23, 59, 59, 999);

    const anteriorStart = new Date(anteriorEnd);
    anteriorStart.setDate(anteriorEnd.getDate() - (rangoDias - 1));
    anteriorStart.setHours(0, 0, 0, 0);

    console.log("📅 Rango actual:", { start, end, rangoDias });
    console.log("📅 Rango anterior:", { anteriorStart, anteriorEnd });

    // 🔄 Obtener pedidos de ambos rangos
    const pedidosActuales = await getAllPedidosByDateRange(idConfig, { 
      startDate: start.toISOString(), 
      endDate: end.toISOString() 
    });

    const pedidosAnteriores = await getAllPedidosByDateRange(idConfig, {
      startDate: anteriorStart.toISOString(),
      endDate: anteriorEnd.toISOString()
    });

    console.log(`📦 Pedidos actuales obtenidos: ${pedidosActuales.length}`);
    console.log(`📦 Pedidos anteriores obtenidos: ${pedidosAnteriores.length}`);

    // 🔹 Filtrar pedidos en MXN
    const pedidosMXNActuales = pedidosActuales.filter(o => o.currency === "MXN");
    const pedidosMXNAnteriores = pedidosAnteriores.filter(o => o.currency === "MXN");

    // 🔹 Agrupar por producto
    const agruparProductos = (pedidos) => {
      const map = {};
      pedidos.forEach(order => {
        order.products.forEach(item => {
          if (!map[item.product_id]) {
            map[item.product_id] = {
              product_id: item.product_id,
              name: item.name,
              total_quantity: 0,
              total_sales: 0
            };
          }
          // distribuir el total proporcionalmente según cantidad
          const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
          const proporcion = item.quantity / totalQty;

          map[item.product_id].total_quantity += item.quantity;
          map[item.product_id].total_sales += order.total * proporcion;
        });
      });
      return map;
    };

    const productosActuales = agruparProductos(pedidosMXNActuales);
    const productosAnteriores = agruparProductos(pedidosMXNAnteriores);

    // 🔹 Comparar productos
    const productosInforme = Object.values(productosActuales).map(prod => {
      const anterior = productosAnteriores[prod.product_id] || { total_quantity: 0, total_sales: 0 };

      const variacionCantidad = prod.total_quantity - anterior.total_quantity;
      let variacionPct = 0;
      if (anterior.total_quantity === 0 && prod.total_quantity > 0) {
        variacionPct = 100; // nuevo producto
      } else if (anterior.total_quantity > 0) {
        variacionPct = (variacionCantidad / anterior.total_quantity) * 100;
      }

      return {
        product_id: prod.product_id,
        name: prod.name,
        periodo_actual: {
          total_quantity: prod.total_quantity,
          avg_daily_quantity: (prod.total_quantity / rangoDias).toFixed(2),
          total_sales: prod.total_sales,
          avg_daily_sales: (prod.total_sales / rangoDias).toFixed(2)
        },
        periodo_anterior: {
          total_quantity: anterior.total_quantity,
          avg_daily_quantity: (anterior.total_quantity / rangoDias).toFixed(2),
          total_sales: anterior.total_sales,
          avg_daily_sales: (anterior.total_sales / rangoDias).toFixed(2)
        },
        variacion_cantidad: variacionCantidad,
        variacion_pct: parseFloat(variacionPct.toFixed(2))
      };
    });

    // 🔹 Ordenar por más crecimiento en cantidad
    productosInforme.sort((a, b) => b.variacion_cantidad - a.variacion_cantidad);

    return {
      rango_dias: rangoDias,
      total_orders_actuales: pedidosMXNActuales.length,
      total_orders_anteriores: pedidosMXNAnteriores.length,
      productos: productosInforme
    };

  } catch (error) {
    console.error("💥 Error en getTendenciaProductosMXN:", error);
    throw error;
  }
};
// 📊 Informe de ventas en MXN con detalle de productos y promedios diarios
const getVentasTotalesMXN = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Calculando informe extendido de ventas en MXN...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 🔄 Obtener pedidos paginados en el rango
    const pedidos = await getAllPedidosByDateRange(idConfig, { startDate, endDate });
    console.log(`📦 Pedidos obtenidos del rango: ${pedidos.length}`);

    // Filtrar pedidos en MXN
    const mxnOrders = pedidos.filter(order => order.currency === "MXN");

    // Calcular rango en días (mínimo 1 día para evitar división por cero)
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = end.getTime() - start.getTime();
const diffDays = Math.max(
  1,
  Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
);

    // Calcular monto total
    const totalAmount = mxnOrders.reduce((acc, order) => acc + order.total, 0);

    // 📦 Agrupación por producto
    const productStats = {};

    mxnOrders.forEach(order => {
      order.products.forEach(item => {
        if (!productStats[item.product_id]) {
          productStats[item.product_id] = {
            product_id: item.product_id,
            name: item.name,
            total_quantity: 0,
            total_sales: 0
          };
        }
        productStats[item.product_id].total_quantity += item.quantity;
        productStats[item.product_id].total_sales += item.quantity * (order.total / order.products.length);
      });
    });

    // Transformar en array y calcular promedio diario
    const productsReport = Object.values(productStats).map(prod => ({
      product_id: prod.product_id,
      name: prod.name,
      total_quantity: prod.total_quantity,
      total_sales: prod.total_sales,
      avg_daily_quantity: (prod.total_quantity / diffDays).toFixed(2),
      avg_daily_sales: (prod.total_sales / diffDays).toFixed(2)
    }));

    // Ordenar por cantidad total (más vendidos primero)
    productsReport.sort((a, b) => b.total_quantity - a.total_quantity);

    return {
      total_orders_revisados: pedidos.length,
      total_orders_mxn: mxnOrders.length,
      total_amount_mxn: totalAmount,
      rango_dias: diffDays,
      orders: mxnOrders.map(order => ({
        id: order.id,
        total: order.total,
        currency: order.currency,
        date_created: order.date_created,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        payment_method: order.payment_method
      })),
      products_summary: productsReport
    };

  } catch (error) {
    console.error("💥 Error en getVentasTotalesMXN:", error);
    throw error;
  }
};



module.exports = {
  getAllConfigs,
  getConfigById,
  getConfigsByEmpresaId,
  createConfig,
  updateConfig,
  deleteConfig,
  getProducts,
  getPedidos,
  getPedidoById,
  getPedidosInforme,
  searchPedidos,
  getAllProducts,
  syncProductsFromStore,
  getVentasTotalesMXN,
  getTendenciaProductosMXN
};
