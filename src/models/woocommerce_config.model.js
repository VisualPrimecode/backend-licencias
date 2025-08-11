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
  searchPedidos
};
