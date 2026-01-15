const db = require('../config/db');
const model = require('../models/webhook.model');
const Config = require('../controllers/cotizacion.controller');
const serialModel = require('../models/serial.model');
const WooMap = require('../models/wooProductMapping.model');


// Obtener todas las configuraciones WooCommerce
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_api_config where id<6');
  return rows;
};
//obtener productos de WooCommerce por ID de wooCommerce


const getProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("products", queryParams);
console.log("response", response.data);

    // Retornar lista resumida de productos
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
    console.log('datos api', api);
    console.log(`🔍 Buscando pedido por ID: ${pedidoId}`);

    const response = await api.get(`orders/${pedidoId}`);
    const order = response.data;
   
    if (!order) {
      console.log("❌ Pedido no encontrado.");
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
const getPedidos = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("orders", queryParams);
 
    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "completed" || order.status === "processing"
    );
    console.log(`Pedidos recibidos de WooCommerce (sin filtrar):`, response.data);
    
    const filteredOrders = completedOrders.map(order => ({
      id: order.id,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
      customer_email: order.billing.email,
      status: order.status,
      date_completed: order.date_completed,
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
*/
//version que retorna fecha de modificacion y seriales asociados

const getPedidos = async (wooId, queryParams = {}) => {
  console.log("Obteniendo pedidos para WooCommerce ID:", wooId);

  try {
    const api = await model.getWooApiInstanceByConfigId(wooId);
    const response = await api.get("orders", queryParams);

    const VALID_STATUSES = new Set(["completed", "processing"]);

    // 1️⃣ Normalizamos pedidos desde Woo
    const pedidos = response.data
      .filter(order => VALID_STATUSES.has(order.status))
      .map(order => {
        const billing = order.billing || {};
        const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

        return {
          id: order.id, // numero_pedido
          woo_id: wooId,
          customer_name: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
          customer_email: billing.email || null,
          status: order.status,
          date_completed: order.date_modified,
          total: parseFloat(order.total) || 0,
          currency: order.currency || null,
          payment_method: order.payment_method_title ?? order.payment_method ?? "unknown",
          products: lineItems.map(item => {
            const extraOptionData = (item.meta_data || [])
              .find(meta => meta.key === '_tmcartepo_data');

            const extra_options = Array.isArray(extraOptionData?.value)
              ? extraOptionData.value.map(opt => ({
                  name: opt.name,
                  value: opt.value,
                  price: parseFloat(opt.price) || 0
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
        };
      });

    if (pedidos.length === 0) {
      return [];
    }

    // 2️⃣ Obtenemos seriales asociados a los pedidos
    const seriales = await serialModel.getSerialesByPedidos(
      pedidos.map(p => ({
        numero_pedido: p.id,
        woo_id: p.woo_id
      }))
    );

    // 3️⃣ Agrupamos seriales por pedido
    const serialesPorPedido = seriales.reduce((acc, serial) => {
      const pedidoId = serial.numero_pedido;

      if (!acc[pedidoId]) {
        acc[pedidoId] = [];
      }

      acc[pedidoId].push({
        codigo: serial.codigo,
        producto_id: serial.producto_id,
      });

      return acc;
    }, {});

    // 4️⃣ Adjuntamos seriales a cada pedido (nivel pedido)
    const pedidosFinales = pedidos.map(pedido => ({
      ...pedido,
      seriales: serialesPorPedido[pedido.id] || []
    }));
    console.log("Pedidos finales con seriales adjuntos:", pedidosFinales);
    return pedidosFinales;

  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};
//get pedidos 365 1 año pero debe escalar a un metodo que reciba el producto_id
/*
const getPedidosFiltradoProductos = async (wooId, queryParams = {}) => {
  console.log("Obteniendo pedidos para WooCommerce ID:", wooId);

  const VALID_STATUSES = new Set(["completed", "processing"]);
  const OFFICE_365_INTERNO_ID = 330;

  try {
    const api = await model.getWooApiInstanceByConfigId(wooId);
    const response = await api.get("orders", queryParams);

    // 1️⃣ Filtrar pedidos válidos por estado
    const pedidosWoo = response.data.filter(order =>
      VALID_STATUSES.has(order.status)
    );

    if (pedidosWoo.length === 0) {
      return [];
    }

    // 2️⃣ Extraer TODOS los woo_product_ids únicos
    const wooProductIds = [
      ...new Set(
        pedidosWoo.flatMap(order =>
          Array.isArray(order.line_items)
            ? order.line_items.map(item => item.product_id)
            : []
        )
      )
    ];

    // 3️⃣ Mapear Woo → producto interno (una sola query)
    const productosMapeados = await WooMap.getProductosInternosIds(
      wooId,
      wooProductIds
    );

    const wooToInternoMap = new Map(
      productosMapeados.map(p => [p.woo_product_id, p.producto_interno_id])
    );

    // 4️⃣ Normalizar pedidos + enriquecer productos + fechas
    const pedidosNormalizados = pedidosWoo.map(order => {
      const billing = order.billing || {};
      const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

      const dateCompleted = order.date_modified
        ? new Date(order.date_modified)
        : null;

      const expirationDate = dateCompleted
        ? new Date(dateCompleted)
        : null;

      if (expirationDate) {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const products = lineItems.map(item => {
        const extraOptionData = (item.meta_data || [])
          .find(meta => meta.key === "_tmcartepo_data");

        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: parseFloat(opt.price) || 0
            }))
          : [];

        return {
          product_id: item.product_id,
          producto_interno_id: wooToInternoMap.get(item.product_id) || null,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options
        };
      });

      return {
        id: order.id,
        woo_id: wooId,
        customer_name: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
        customer_email: billing.email || null,
        status: order.status,
        date_completed: dateCompleted ? dateCompleted.toISOString() : null,
        expiration_date: expirationDate ? expirationDate.toISOString() : null,
        total: parseFloat(order.total) || 0,
        currency: order.currency || null,
        payment_method:
          order.payment_method_title ??
          order.payment_method ??
          "unknown",
        products
      };
    });

    // 5️⃣ Filtrar pedidos con AL MENOS un Office 365 (ID interno)
    const pedidosFiltrados = pedidosNormalizados.filter(pedido =>
      pedido.products.some(
        p => p.producto_interno_id === OFFICE_365_INTERNO_ID
      )
    );

    if (pedidosFiltrados.length === 0) {
      return [];
    }

    // 6️⃣ Obtener seriales asociados
    const seriales = await serialModel.getSerialesByPedidos(
      pedidosFiltrados.map(p => ({
        numero_pedido: p.id,
        woo_id: p.woo_id
      }))
    );

    // 7️⃣ Agrupar seriales por pedido
    const serialesPorPedido = seriales.reduce((acc, serial) => {
      if (!acc[serial.numero_pedido]) {
        acc[serial.numero_pedido] = [];
      }

      acc[serial.numero_pedido].push({
        codigo: serial.codigo,
        producto_id: serial.producto_id
      });

      return acc;
    }, {});

    // 8️⃣ Adjuntar seriales a pedidos
    const pedidosFinales = pedidosFiltrados.map(pedido => ({
      ...pedido,
      seriales: serialesPorPedido[pedido.id] || []
    }));

    console.log("Pedidos finales con Office 365:", pedidosFinales);
    return pedidosFinales;

  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};
*/
/*
const getPedidosFiltradoProductos = async (
  wooId,
  productoInternoIds = [],
  queryParams = {}
) => {
  console.log("Obteniendo pedidos para WooCommerce ID:", wooId);

  const VALID_STATUSES = new Set(["completed", "processing"]);
  const PRODUCTOS_INTERNOS_SET = new Set(productoInternoIds);

  try {
    const api = await model.getWooApiInstanceByConfigId(wooId);
    const response = await api.get("orders", queryParams);

    // 1️⃣ Filtrar pedidos válidos por estado
    const pedidosWoo = response.data.filter(order =>
      VALID_STATUSES.has(order.status)
    );

    if (pedidosWoo.length === 0) {
      return [];
    }

    // 2️⃣ Extraer TODOS los woo_product_ids únicos
    const wooProductIds = [
      ...new Set(
        pedidosWoo.flatMap(order =>
          Array.isArray(order.line_items)
            ? order.line_items
                .map(item => item.product_id)
                .filter(id => id && id > 0)
            : []
        )
      )
    ];

    if (wooProductIds.length === 0) {
      return [];
    }

    // 3️⃣ Mapear Woo → producto interno (una sola query)
    const productosMapeados = await WooMap.getProductosInternosIds(
      wooId,
      wooProductIds
    );

    const wooToInternoMap = new Map(
      productosMapeados.map(p => [
        p.woo_product_id,
        p.producto_interno_id
      ])
    );

    // 4️⃣ Normalizar pedidos + enriquecer productos + fechas
    const pedidosNormalizados = pedidosWoo.map(order => {
      const billing = order.billing || {};
      const lineItems = Array.isArray(order.line_items)
        ? order.line_items
        : [];

      const dateCompleted = order.date_completed
        ? new Date(order.date_completed)
        : order.date_modified
        ? new Date(order.date_modified)
        : null;

      const expirationDate = dateCompleted
        ? new Date(dateCompleted)
        : null;

      if (expirationDate) {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const products = lineItems.map(item => {
        const extraOptionData = (item.meta_data || []).find(
          meta => meta.key === "_tmcartepo_data"
        );

        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: parseFloat(opt.price) || 0
            }))
          : [];

        return {
          product_id: item.product_id,
          producto_interno_id:
            wooToInternoMap.get(item.product_id) || null,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options
        };
      });

      return {
        id: order.id,
        woo_id: wooId,
        customer_name: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
        customer_email: billing.email || null,
        status: order.status,
        date_completed: dateCompleted
          ? dateCompleted.toISOString()
          : null,
        expiration_date: expirationDate
          ? expirationDate.toISOString()
          : null,
        total: parseFloat(order.total) || 0,
        currency: order.currency || null,
        payment_method:
          order.payment_method_title ??
          order.payment_method ??
          "unknown",
        products
      };
    });

    // 5️⃣ Filtrar pedidos que contengan AL MENOS UNO
    //    de los productos internos solicitados
    const pedidosFiltrados = pedidosNormalizados.filter(pedido =>
      pedido.products.some(
        p =>
          p.producto_interno_id &&
          PRODUCTOS_INTERNOS_SET.has(p.producto_interno_id)
      )
    );

    if (pedidosFiltrados.length === 0) {
      return [];
    }

    // 6️⃣ Obtener seriales asociados
    const seriales = await serialModel.getSerialesByPedidos(
      pedidosFiltrados.map(p => ({
        numero_pedido: p.id,
        woo_id: p.woo_id
      }))
    );

    // 7️⃣ Agrupar seriales por pedido
    const serialesPorPedido = seriales.reduce((acc, serial) => {
      if (!acc[serial.numero_pedido]) {
        acc[serial.numero_pedido] = [];
      }

      acc[serial.numero_pedido].push({
        codigo: serial.codigo,
        producto_id: serial.producto_id
      });

      return acc;
    }, {});

    // 8️⃣ Adjuntar seriales a pedidos
    const pedidosFinales = pedidosFiltrados.map(pedido => ({
      ...pedido,
      seriales: serialesPorPedido[pedido.id] || []
    }));

   // console.log("Pedidos finales filtrados:", pedidosFinales);
    return pedidosFinales;

  } catch (error) {
    console.error(
      "Error obteniendo pedidos:",
      error.response?.data || error
    );
    throw error;
  }
};*/
const getPedidosFiltradoProductos = async (
  wooId,
  productoInternoIds = [],
  queryParams = {}
) => {
  console.log('📦 Obteniendo pedidos para WooCommerce ID:', wooId);

  const VALID_STATUSES = new Set(['completed', 'processing']);
  const PRODUCTOS_INTERNOS_SET = new Set(productoInternoIds);

  try {
    const api = await model.getWooApiInstanceByConfigId(wooId);

    // ─────────────────────────────
    // 1️⃣ Normalizar paginación (por tienda)
    // ─────────────────────────────
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const per_page = Math.min(
      Math.max(parseInt(queryParams.per_page, 10) || 10, 1),
      100
    );

    // Empujar filtros a Woo cuando sea posible
    const wooQueryParams = {
      ...queryParams,
      page,
      per_page,
      status: 'completed,processing'
    };

    const response = await api.get('orders', wooQueryParams);
    const ordersRaw = Array.isArray(response.data) ? response.data : [];

    console.log(
      `➡️ Woo ID ${wooId}: ${ordersRaw.length} pedidos recibidos (page=${page})`
    );

    if (ordersRaw.length === 0) {
      return [];
    }

    // ─────────────────────────────
    // 2️⃣ Extraer IDs Woo de productos
    // ─────────────────────────────
    const wooProductIds = [
      ...new Set(
        ordersRaw.flatMap(order =>
          Array.isArray(order.line_items)
            ? order.line_items
                .map(item => item.product_id)
                .filter(id => id && id > 0)
            : []
        )
      )
    ];

    if (wooProductIds.length === 0) {
      return [];
    }

    // ─────────────────────────────
    // 3️⃣ Mapear Woo → producto interno
    // ─────────────────────────────
    const productosMapeados = await WooMap.getProductosInternosIds(
      wooId,
      wooProductIds
    );

    const wooToInternoMap = new Map(
      productosMapeados.map(p => [
        p.woo_product_id,
        p.producto_interno_id
      ])
    );

    // ─────────────────────────────
    // 4️⃣ Normalizar pedidos
    // ─────────────────────────────
    const pedidosNormalizados = ordersRaw.map(order => {
      const billing = order.billing || {};
      const lineItems = Array.isArray(order.line_items)
        ? order.line_items
        : [];

      const dateCompleted = order.date_completed
        ? new Date(order.date_completed)
        : order.date_modified
        ? new Date(order.date_modified)
        : null;

      const expirationDate = dateCompleted
        ? new Date(dateCompleted)
        : null;

      if (expirationDate) {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const products = lineItems.map(item => {
        const extraOptionData = (item.meta_data || []).find(
          meta => meta.key === '_tmcartepo_data'
        );

        const extra_options = Array.isArray(extraOptionData?.value)
          ? extraOptionData.value.map(opt => ({
              name: opt.name,
              value: opt.value,
              price: parseFloat(opt.price) || 0
            }))
          : [];

        return {
          product_id: item.product_id,
          producto_interno_id:
            wooToInternoMap.get(item.product_id) || null,
          name: item.name,
          quantity: item.quantity,
          variation_id: item.variation_id || null,
          extra_options
        };
      });

      return {
        id: order.id,
        woo_id: wooId,
        customer_name: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
        customer_email: billing.email || null,
        status: order.status,
        date_completed: dateCompleted
          ? dateCompleted.toISOString()
          : null,
        expiration_date: expirationDate
          ? expirationDate.toISOString()
          : null,
        total: parseFloat(order.total) || 0,
        currency: order.currency || null,
        payment_method:
          order.payment_method_title ??
          order.payment_method ??
          'unknown',
        products
      };
    });

    // ─────────────────────────────
    // 5️⃣ Filtrar por productos internos
    // ─────────────────────────────
    const pedidosFiltrados = pedidosNormalizados.filter(pedido =>
      pedido.products.some(
        p =>
          p.producto_interno_id &&
          PRODUCTOS_INTERNOS_SET.has(p.producto_interno_id)
      )
    );

    if (pedidosFiltrados.length === 0) {
      return [];
    }

    // ─────────────────────────────
    // 6️⃣ Obtener seriales asociados
    // ─────────────────────────────
    const seriales = await serialModel.getSerialesByPedidos(
      pedidosFiltrados.map(p => ({
        numero_pedido: p.id,
        woo_id: p.woo_id
      }))
    );

    const serialesPorPedido = seriales.reduce((acc, serial) => {
      if (!acc[serial.numero_pedido]) {
        acc[serial.numero_pedido] = [];
      }

      acc[serial.numero_pedido].push({
        codigo: serial.codigo,
        producto_id: serial.producto_id
      });

      return acc;
    }, {});

    // ─────────────────────────────
    // 7️⃣ Adjuntar seriales
    // ─────────────────────────────
    const pedidosFinales = pedidosFiltrados.map(pedido => ({
      ...pedido,
      seriales: serialesPorPedido[pedido.id] || []
    }));

    console.log(
      `✅ Woo ID ${wooId}: ${pedidosFinales.length} pedidos válidos devueltos`
    );

    return pedidosFinales;

  } catch (error) {
    console.error(
      '❌ Error obteniendo pedidos Woo:',
      error.response?.data || error
    );
    throw error;
  }
};


const getPedidosFiltradoProductosGlobal = async (
  productoInternoIds = [],
  queryParams = {}
) => {
  const WOO_TIENDAS = [3, 4, 5];
  let pedidosGlobales = [];

  try {
    // Normalizar paginación (defensivo, por si llega crudo)
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const per_page = Math.min(
      Math.max(parseInt(queryParams.per_page, 10) || 10, 1),
      100
    );

    const normalizedQueryParams = {
      ...queryParams,
      page,
      per_page
    };

    for (const wooId of WOO_TIENDAS) {
      console.log(
        `🛒 Procesando pedidos tienda Woo ID: ${wooId} (page=${page}, per_page=${per_page})`
      );

      const pedidosPorTienda = await getPedidosFiltradoProductos(
        wooId,
        productoInternoIds,
        normalizedQueryParams
      );

      if (Array.isArray(pedidosPorTienda) && pedidosPorTienda.length > 0) {
        pedidosGlobales = pedidosGlobales.concat(pedidosPorTienda);
      }
    }

    console.log(
      `🌍 Total pedidos globales obtenidos: ${pedidosGlobales.length}`
    );

    return pedidosGlobales;

  } catch (error) {
    console.error(
      '❌ Error obteniendo pedidos globales:',
      error.response?.data || error
    );
    throw error;
  }
};

const getPedidos2 = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("orders", queryParams);
 
    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data;


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
// Actualizar un pedido en WooCommerce
const updatePedido = async (configId, orderId, data = {}) => {
  console.log(`Actualizando pedido ${orderId} para el WooCommerce con ID de config: ${configId}`);

  try {
    const api = await model.getWooApiInstanceByConfigId(configId);
    console.log('Datos api:', api);
    // Petición PUT a WooCommerce
    const response = await api.put(`orders/${orderId}`, data);

    console.log(`Pedido ${orderId} actualizado correctamente en WooCommerce.`);
    
    // WooCommerce devuelve el objeto de pedido actualizado
    return response.data;

  } catch (error) {
    console.error("Error actualizando pedido en WooCommerce:", error.response?.data || error);
    throw error;
  }
};

const getPedidosFallidos = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("orders", queryParams);
    
    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "pending" || order.status === "cancelled" || order.status === "failed"|| order.status === "on-hold"
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
      /* log de depuracion */
      /*
     validOrders.forEach(pedido => {
  pedido.line_items.forEach(item => {
    console.log('Producto:', item.name);
    console.log('Precio unitario:', item.price);
    console.log('Cantidad:', item.quantity);
    console.log('Total producto:', item.total);
    console.log('---');
  });
});*/

      // Mapear al formato que ya usamos en getPedidos
      const formattedOrders = validOrders.map(order => ({
        id: order.id,
        customer_name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        customer_email: order.billing.email,
        status: order.status,
        total: parseFloat(order.total || 0),
        currency: order.currency,
        payment_method: order.payment_method_title || order.payment_method,
        date: order.date_created, // 👈 guardar fecha original en ISO
        products: order.line_items.map(item => {
  const extraOptionData = (item.meta_data || []).find(
    meta => meta.key === '_tmcartepo_data'
  );

  const extra_options = Array.isArray(extraOptionData?.value)
    ? extraOptionData.value.map(opt => ({
        name: opt.name,
        value: opt.value,
        price: parseFloat(opt.price || 0)
      }))
    : [];

  return {
    product_id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    variation_id: item.variation_id || null,

    // 🔥 PRECIOS REALES
    price_unit: parseFloat(item.price || 0),
    subtotal: parseFloat(item.subtotal || 0),
    total: parseFloat(item.total || 0),
    total_tax: parseFloat(item.total_tax || 0),

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

    // 🛡️ Filtro extra estricto por fecha
    const strictlyFilteredOrders = allOrders.filter(p => {
      const created = new Date(p.date);
      return created >= start && created <= end;
    });

    console.log(`📦 Pedidos crudos: ${allOrders.length}, después de filtro estricto: ${strictlyFilteredOrders.length}`);
    return strictlyFilteredOrders;

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

const getFlowConfigById = async (id) => {
  const [rows] = await db.query(
    'SELECT flow_api_key, flow_secret_key FROM woocommerce_api_config WHERE id = ? LIMIT 1',
    [id]
  );

  if (!rows || rows.length === 0) {
    throw new Error('No se encontró configuración Flow para este ID');
  }

  return {
    apiKey: rows[0].flow_api_key,
    secretKey: rows[0].flow_secret_key
  };
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


// 📦 Informe de ventas por país/divisa
const getVentasPorPais = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Generando informe de ventas por país/divisa...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });
  try {
    // 1️⃣ Obtener pedidos en el rango de fechas
    const pedidos = await getAllPedidosByDateRange(idConfig, { startDate, endDate });
 console.log("🐛 Pedidos crudos obtenidos:", JSON.stringify(pedidos, null, 2));
//console.log(`📦 Total pedidos obtenidos: ${pedidos.length}`);

    // 🔄 Tasas de conversión a CLP (ejemplo, actualizar según corresponda)
     const conversionRates = {
      MXN: 52,   // 1 MXN → CLP
      PEN: 276,  // 1 PEN → CLP
      COP: 0.24, // 1 COP → CLP
      ARS: 1.46,
      CLP: 1,    // nativo
    };

    // 2️⃣ Agrupar ventas por currency
    const ventasPorPais = pedidos.reduce((acc, pedido) => {
      const currency = pedido.currency || "UNKNOWN";

      if (!acc[currency]) {
        acc[currency] = {
          currency,
          total_ventas: 0,
          total_pedidos: 0,
          total_ventas_clp: 0,
          total_ventas_clp_formatted: "0",
        };
      }

      const total = parseFloat(pedido.total) || 0;
      acc[currency].total_ventas += total;
      acc[currency].total_pedidos += 1;

      if (conversionRates[currency]) {
        acc[currency].total_ventas_clp += total * conversionRates[currency];
        acc[currency].total_ventas_clp_formatted =
          acc[currency].total_ventas_clp.toLocaleString("es-CL");
      }

      return acc;
    }, {});

    // 3️⃣ Convertir a array ordenado por total_ventas_clp desc
    const ventasArray = Object.values(ventasPorPais).sort(
      (a, b) => b.total_ventas_clp - a.total_ventas_clp
    );

    // 4️⃣ Construir informe
    return {
      total_orders: pedidos.length,
      total_sales: ventasArray.reduce((sum, v) => sum + v.total_ventas_clp, 0),
      total_sales_formatted: ventasArray
        .reduce((sum, v) => sum + v.total_ventas_clp, 0)
        .toLocaleString("es-CL"),
      ventas_por_pais: ventasArray,
    };

  } catch (error) {
    console.error("💥 Error al generar informe de ventas por país:", error);
    throw error;
  }
};
/*
const getVentasPorPaisGlobal = async ({ startDate, endDate }) => {
  console.log("🌎 Generando informe GLOBAL de ventas por país...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Definir las tiendas fijas
    const tiendas = [
      { idConfig: 3, nombre: "licenciasorginales" },
      { idConfig: 4, nombre: "licenciassoftware" },
      { idConfig: 5, nombre: "licenciasdigitales" },
    ];

    // 2️⃣ Ejecutar getVentasPorPais para cada tienda
    const informesTiendas = [];
    for (const tienda of tiendas) {
      const informe = await getVentasPorPais(tienda.idConfig, { startDate, endDate });
      informesTiendas.push({ ...tienda, ...informe });
    }

    // 3️⃣ Consolidar resultados por currency
    const globalVentas = {};
    informesTiendas.forEach((tienda) => {
      tienda.ventas_por_pais.forEach((venta) => {
        if (!globalVentas[venta.currency]) {
          globalVentas[venta.currency] = {
            currency: venta.currency,
            total_ventas: 0,
            total_pedidos: 0,
            total_ventas_clp: 0,
            total_ventas_clp_formatted: "0",
          };
        }

        globalVentas[venta.currency].total_ventas += venta.total_ventas;
        globalVentas[venta.currency].total_pedidos += venta.total_pedidos;
        globalVentas[venta.currency].total_ventas_clp += venta.total_ventas_clp;
        globalVentas[venta.currency].total_ventas_clp_formatted =
          globalVentas[venta.currency].total_ventas_clp.toLocaleString("es-CL");
      });
    });

    // 4️⃣ Convertir a array ordenado
    const ventasPorPaisArray = Object.values(globalVentas).sort(
      (a, b) => b.total_ventas_clp - a.total_ventas_clp
    );

    // 5️⃣ Construir informe final
    const totalOrders = informesTiendas.reduce((sum, t) => sum + t.total_orders, 0);
    const totalSalesCLP = ventasPorPaisArray.reduce((sum, v) => sum + v.total_ventas_clp, 0);

    return {
      total_orders: totalOrders,
      total_sales: totalSalesCLP,
      total_sales_formatted: totalSalesCLP.toLocaleString("es-CL"),
      ventas_por_pais: ventasPorPaisArray,
      detalle_por_tienda: informesTiendas,
    };

  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de ventas por país:", error);
    throw error;
  }
};*/
const getVentasPorPaisGlobal = async ({ startDate, endDate }) => {
  console.log("🌎 Generando informe GLOBAL de ventas por país...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Definir las tiendas fijas
    const tiendas = [
      { idConfig: 3, idWoo: 1, nombre: "licenciasoriginales" },
      { idConfig: 4, idWoo: 2, nombre: "licenciassoftware" },
      { idConfig: 5, idWoo: 3, nombre: "licenciasdigitales" },
    ];

    // 2️⃣ Ejecutar métodos por tienda
    const informesTiendas = [];

    for (const tienda of tiendas) {
      const informeVentas = await getVentasPorPais(
        tienda.idConfig,
        { startDate, endDate }
      );

      let total_concretado = 0;

      const fakeReq = {
        params: { id: tienda.idConfig },
        query: {
          fechaInicio: startDate,
          fechaFin: endDate,
        },
      };

      const fakeRes = {
        status: () => ({
          json: (data) => {
            total_concretado = data.total_concretado || 0;
          },
        }),
      };

      await Config.getTotalConcretadoByIdWooPeriodo(fakeReq, fakeRes);

      console.log(
        `🏪 Tienda: ${tienda.nombre}, Total Concretado: ${total_concretado}`
      );

      informesTiendas.push({
        ...tienda,
        ...informeVentas,
        total_concretado,
      });
    }

    // 3️⃣ Consolidar resultados por currency
    const globalVentas = {};

    informesTiendas.forEach((tienda) => {
      tienda.ventas_por_pais.forEach((venta) => {
        if (!globalVentas[venta.currency]) {
          globalVentas[venta.currency] = {
            currency: venta.currency,
            total_ventas: 0,
            total_pedidos: 0,
            total_ventas_clp: 0,
            total_ventas_clp_formatted: "0",
          };
        }

        globalVentas[venta.currency].total_ventas += venta.total_ventas || 0;
        globalVentas[venta.currency].total_pedidos += venta.total_pedidos || 0;
        globalVentas[venta.currency].total_ventas_clp +=
          venta.total_ventas_clp || 0;

        globalVentas[venta.currency].total_ventas_clp_formatted =
          globalVentas[venta.currency].total_ventas_clp.toLocaleString("es-CL");
      });
    });

    // 4️⃣ Convertir a array y calcular ticket promedio por país
    const ventasPorPaisArray = Object.values(globalVentas).map((v) => {
      const ticket_promedio =
        v.total_pedidos > 0
          ? Math.trunc(v.total_ventas_clp / v.total_pedidos)
          : 0;

      return {
        ...v,
        ticket_promedio,
        ticket_promedio_formatted: ticket_promedio.toLocaleString("es-CL"),
      };
    }).sort((a, b) => b.total_ventas_clp - a.total_ventas_clp);

    // 5️⃣ Totales globales
    const totalOrders = informesTiendas.reduce(
      (sum, t) => sum + (t.total_orders || 0),
      0
    );

    const totalSalesCLP = Math.trunc(
      ventasPorPaisArray.reduce(
        (sum, v) => sum + (v.total_ventas_clp || 0),
        0
      )
    );

    const totalConcretadoGlobal = informesTiendas.reduce(
      (sum, t) => sum + (t.total_concretado || 0),
      0
    );

    const totalGeneral = totalSalesCLP + totalConcretadoGlobal;
    ventasPorPaisArray.forEach((v) => {
  const porcentaje =
    totalSalesCLP > 0
      ? (v.total_ventas_clp / totalSalesCLP) * 100
      : 0;

  v.porcentaje_total = Number(porcentaje.toFixed(2));
});


    // 6️⃣ Ticket promedio global
    const ticketPromedioGlobal =
      totalOrders > 0
        ? Math.trunc(totalSalesCLP / totalOrders)
        : 0;

    // 7️⃣ Retornar informe final
    return {
      total_orders: totalOrders,
      total_sales: totalSalesCLP,
      total_sales_formatted: totalSalesCLP.toLocaleString("es-CL"),

      ticket_promedio: ticketPromedioGlobal,
      ticket_promedio_formatted:
        ticketPromedioGlobal.toLocaleString("es-CL"),

      total_concretado: totalConcretadoGlobal,
      total_concretado_formatted:
        totalConcretadoGlobal.toLocaleString("es-CL"),

      total_general: totalGeneral,
      total_general_formatted: totalGeneral.toLocaleString("es-CL"),

      ventas_por_pais: ventasPorPaisArray,
      detalle_por_tienda: informesTiendas,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe GLOBAL de ventas por país:",
      error
    );
    throw error;
  }
};

// 📊 Informe GLOBAL: Promedio de ventas por producto
/*
const getPromedioProductosGlobal = async ({ startDate, endDate }) => {
  console.log("🌎 Generando informe GLOBAL de promedio de ventas por producto...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Tiendas incluidas en el análisis global
    const tiendas = [
      { idConfig: 3, nombre: "licenciasorginales" },
      { idConfig: 4, nombre: "licenciassoftware" },
      { idConfig: 5, nombre: "licenciasdigitales" },
    ];

    // 🔄 Tasas de conversión a CLP (revisar según tipo de cambio actual)
    const conversionRates = {
      MXN: 52,
      PEN: 276,
      COP: 0.24,
      CLP: 1,
    };

    // 2️⃣ Acumulador global de productos
    const globalProductos = {};

    // 3️⃣ Recorrer tiendas y acumular información
    for (const tienda of tiendas) {
      console.log(`🛍️ Procesando tienda: ${tienda.nombre}`);
      const pedidos = await getAllPedidosByDateRange(tienda.idConfig, { startDate, endDate });

      for (const pedido of pedidos) {
        const rate = conversionRates[pedido.currency] || 1;

        // ⚙️ Evitar contar el mismo producto más de una vez por pedido
        const productosUnicos = new Set();

        for (const item of pedido.products) {
          const productId = item.product_id || 0;
          const name = item.name || "Producto sin nombre";
          const quantity = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.price || 0); // si no existe, puede ser 0

          const totalItemCLP = (unitPrice * quantity) * rate;

          if (!globalProductos[productId]) {
            globalProductos[productId] = {
              product_id: productId,
              name,
              total_unidades: 0,
              total_ventas_clp: 0,
              total_pedidos: 0,
            };
          }

          // Acumulamos unidades y ventas
          globalProductos[productId].total_unidades += quantity;
          globalProductos[productId].total_ventas_clp += totalItemCLP;

          // Contamos pedidos únicos
          if (!productosUnicos.has(productId)) {
            productosUnicos.add(productId);
            globalProductos[productId].total_pedidos += 1;
          }
        }
      }
    }

    // 4️⃣ Calcular promedios finales
    const productosArray = Object.values(globalProductos).map((p) => {
      const promedioUnidadesPorPedido =
        p.total_pedidos > 0 ? p.total_unidades / p.total_pedidos : 0;

      const promedioVentaPorUnidadCLP =
        p.total_unidades > 0 ? p.total_ventas_clp / p.total_unidades : 0;

      return {
        ...p,
        promedio_unidades_por_pedido: parseFloat(promedioUnidadesPorPedido.toFixed(2)),
        promedio_venta_por_unidad_clp: parseFloat(promedioVentaPorUnidadCLP.toFixed(2)),
        total_ventas_clp_formatted: p.total_ventas_clp.toLocaleString("es-CL"),
      };
    });

    // 5️⃣ Ordenar por mayor venta total
    productosArray.sort((a, b) => b.total_ventas_clp - a.total_ventas_clp);

    // 6️⃣ Calcular métricas globales
    const totalSalesCLP = productosArray.reduce((sum, p) => sum + p.total_ventas_clp, 0);
    const totalUnits = productosArray.reduce((sum, p) => sum + p.total_unidades, 0);

    // 7️⃣ Devolver informe consolidado
    return {
      startDate,
      endDate,
      total_products: productosArray.length,
      total_units: totalUnits,
      total_sales_clp: totalSalesCLP,
      total_sales_clp_formatted: totalSalesCLP.toLocaleString("es-CL"),
      productos: productosArray,
    };

  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de promedio de ventas por producto:", error);
    throw error;
  }
};*/
/**
 * 🌎 Genera un informe GLOBAL del promedio de ventas por producto
 * Combina datos de todas las tiendas (licenciasoriginales, licenciassoftware, licenciasdigitales)
 * y calcula totales y promedios en CLP.
 */

const getProductoInternoId = async (empresaId, woocommerceId, wooProductData) => {
  console.log('🔍 Buscando producto interno para empresa:', empresaId, 'woocommerceId:', woocommerceId, 'wooProductData:', wooProductData);

  try {
    // Si wooProductData es un array, saco el primer elemento
    
    

    const [rows] = await db.query(
      `SELECT producto_interno_id 
       FROM woo_product_mappings
       WHERE empresa_id = ? AND woocommerce_id = ? AND woo_product_id = ?
       LIMIT 1`,
      [empresaId, woocommerceId, wooProductData]
    );

    return rows.length ? rows[0].producto_interno_id : null;
  } catch (error) {
    console.error("Error obteniendo producto interno:", error);
    throw error;
  }
};
const getPromedioProductosGlobal = async ({ startDate, endDate, empresaId }) => {
  console.log("🌎 Generando informe GLOBAL de promedio diario de unidades por producto (agrupado por ID interno)...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate, empresaId });

  try {
    const tiendas = [
      { idConfig: 3, nombre: "licenciasorginales", id_empresa: 10 },
      { idConfig: 4, nombre: "licenciassoftware", id_empresa: 11 },
      { idConfig: 5, nombre: "licenciasdigitales", id_empresa: 12 },
    ];

    // 🗓️ Calcular días en el rango
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const totalDays = Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 1);

    const globalProductos = {}; // agrupado por producto_interno_id
    const productoCache = new Map(); // cache: evita consultas repetidas

    // 🏪 Recorrer tiendas
    for (const tienda of tiendas) {
      console.log(`🛍️ Procesando tienda: ${tienda.nombre}`);
      const pedidos = await getAllPedidosByDateRange(tienda.idConfig, { startDate, endDate });
      console.log(`📦 Pedidos recibidos para ${tienda.nombre}: ${pedidos.length}`);

      for (const pedido of pedidos) {
        const productosUnicos = new Set();

        for (const item of pedido.products) {
          const cacheKey = `${tienda.id_empresa}-${tienda.idConfig}-${item.product_id}`;
          let internalProductId;

          // ⚡ Consultar desde caché si ya se resolvió antes
          if (productoCache.has(cacheKey)) {
            internalProductId = productoCache.get(cacheKey);
          } else {
            // 🔍 Obtener ID interno desde BD
            internalProductId =
              (await getProductoInternoId(
                tienda.id_empresa,
                tienda.idConfig,
                item.product_id
              )) || null;

            // Si no hay mapeo, usar ID temporal
            if (!internalProductId) {
              internalProductId = `no_mapeado_${tienda.idConfig}_${item.product_id}`;
            }

            // Guardar en caché
            productoCache.set(cacheKey, internalProductId);
          }

          const name = item.name || "Producto sin nombre";
          const quantity = parseFloat(item.quantity || 0);

          // 🧮 Agrupar por ID interno
          if (!globalProductos[internalProductId]) {
            globalProductos[internalProductId] = {
              product_id: internalProductId,
              names: new Set([name]),
              total_unidades: 0,
              total_pedidos: 0,
            };
          }

          // Acumular unidades
          globalProductos[internalProductId].total_unidades += quantity;

          // Contar solo una vez por pedido
          if (!productosUnicos.has(internalProductId)) {
            productosUnicos.add(internalProductId);
            globalProductos[internalProductId].total_pedidos += 1;
          }

          // Agregar nombre al set (por si viene distinto desde otra tienda)
          globalProductos[internalProductId].names.add(name);
        }
      }
    }

    // 📊 Calcular promedios finales
    const productosArray = Object.values(globalProductos).map((p) => {
      const promedioUnidadesPorPedido =
        p.total_pedidos > 0 ? p.total_unidades / p.total_pedidos : 0;

      const promedioDiarioUnidades = p.total_unidades / totalDays;

      return {
        product_id: p.product_id,
        names: Array.from(p.names),
        total_unidades: p.total_unidades,
        total_pedidos: p.total_pedidos,
        promedio_unidades_por_pedido: parseFloat(promedioUnidadesPorPedido.toFixed(2)),
        promedio_diario_unidades: parseFloat(promedioDiarioUnidades.toFixed(2)),
      };
    });

    // 🔢 Ordenar por total de unidades vendidas
    productosArray.sort((a, b) => b.total_unidades - a.total_unidades);

    const totalUnits = productosArray.reduce((sum, p) => sum + p.total_unidades, 0);

    // ✅ Resultado final
    return {
      rango: { startDate, endDate },
      total_products: productosArray.length,
      total_units: totalUnits,
      total_days: totalDays,
      productos: productosArray,
    };

  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de promedio diario de unidades por producto:", error);
    throw error;
  }
};

/**
 * Obtiene los pedidos de WooCommerce que aún no han sido registrados en la tabla 'envios'
 * @param {number} wooId - ID de configuración WooCommerce
 * @param {Array} pedidosWoo - Lista de pedidos obtenidos desde WooCommerce
 * @returns {Promise<Array>} - Lista de pedidos que no existen en la tabla 'envios'
 */
const getPedidosNoEnviadosPorTienda = async (wooId, pedidosWoo) => {
  if (!Array.isArray(pedidosWoo) || pedidosWoo.length === 0) {
    console.warn("⚠️ Lista de pedidos vacía o inválida.");
    return [];
  }

  // 1️⃣ Extraer los IDs de pedidos WooCommerce
  const wooOrderIds = pedidosWoo.map(p => (typeof p === "object" ? p.id : p));

  try {
    // 2️⃣ Consultar la base de datos solo por esos IDs
    const placeholders = wooOrderIds.map(() => "?").join(",");
    const query = `
      SELECT numero_pedido 
      FROM envios 
      WHERE woo_id = ? 
      AND numero_pedido IN (${placeholders})
    `;
    const params = [wooId, ...wooOrderIds];
    const [rows] = await db.query(query, params);

    // 3️⃣ Crear un conjunto con los pedidos ya registrados
    const pedidosExistentes = new Set(rows.map(r => r.numero_pedido.toString()));

    // 4️⃣ Filtrar los pedidos que aún no están registrados
    const pedidosNoEnviados = pedidosWoo.filter(p => {
      const id = typeof p === "object" ? p.id.toString() : p.toString();
      return !pedidosExistentes.has(id);
    });

    console.log(`🔍 WooID ${wooId} — Revisados: ${wooOrderIds.length}, Nuevos: ${pedidosNoEnviados.length}`);

    return pedidosNoEnviados;
  } catch (error) {
    console.error("❌ Error comprobando pedidos no enviados:", error);
    throw error;
  }
};
// 📦 Informe de ventas por tipo de software (CLP)
const getVentasPorTipoSoftware = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Generando informe de ventas por tipo de software...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
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

    // 1️⃣ Inicializar categorías
    const categorias = {
      office: { categoria: "Office", cantidad_vendida: 0, ingresos_clp: 0 },
      windows: { categoria: "Windows", cantidad_vendida: 0, ingresos_clp: 0 },
      autocad: { categoria: "AutoCAD", cantidad_vendida: 0, ingresos_clp: 0 },
    };

    // 2️⃣ Recorrer pedidos y productos
    pedidos.forEach((pedido) => {
      const currency = pedido.currency || "CLP";
      const rate = conversionRates[currency] || 1;

      if (!Array.isArray(pedido.products)) return;

      pedido.products.forEach((product) => {
        const nombre = (product.name || "").toLowerCase();
        const quantity = Number(product.quantity) || 0;
        const totalProducto = Number(product.total) || 0;
        const totalCLP = totalProducto * rate;

        if (nombre.includes("office")) {
          categorias.office.cantidad_vendida += quantity;
          categorias.office.ingresos_clp += totalCLP;
        } else if (nombre.includes("windows")) {
          categorias.windows.cantidad_vendida += quantity;
          categorias.windows.ingresos_clp += totalCLP;
        } else if (nombre.includes("autocad")) {
          categorias.autocad.cantidad_vendida += quantity;
          categorias.autocad.ingresos_clp += totalCLP;
        }
      });
    });

    // 3️⃣ Calcular ingresos totales
    const ingresosTotales = Object.values(categorias).reduce(
      (sum, cat) => sum + cat.ingresos_clp,
      0
    );

    // 4️⃣ Enriquecer métricas (% del total y ticket promedio)
    const resultado = Object.values(categorias).map((cat) => {
      const ticketPromedio =
        cat.cantidad_vendida > 0
          ? cat.ingresos_clp / cat.cantidad_vendida
          : 0;

      const porcentajeTotal =
        ingresosTotales > 0
          ? (cat.ingresos_clp / ingresosTotales) * 100
          : 0;

      return {
        categoria: cat.categoria,
        cantidad_vendida: cat.cantidad_vendida,

        ingresos_clp: Math.round(cat.ingresos_clp),
        ingresos_clp_formatted: Math.round(cat.ingresos_clp).toLocaleString("es-CL"),

        porcentaje_total: Number(porcentajeTotal.toFixed(2)),

        ticket_promedio_clp: Math.round(ticketPromedio),
        ticket_promedio_clp_formatted: Math.round(ticketPromedio).toLocaleString("es-CL"),
      };
    });

    // 5️⃣ Retornar informe
    return {
      total_orders: pedidos.length,
      ingresos_totales_clp: Math.round(ingresosTotales),
      ingresos_totales_clp_formatted: Math.round(ingresosTotales).toLocaleString("es-CL"),
      ventas_por_tipo_software: resultado,
    };

  } catch (error) {
    console.error("💥 Error al generar informe de ventas por tipo de software:", error);
    throw error;
  }
};
// 📦 Informe GLOBAL de ventas por tipo de software (3 tiendas)
const getVentasPorTipoSoftwareGlobal = async ({ startDate, endDate }) => {
  console.log("📊 Generando informe GLOBAL de ventas por tipo de software...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 🏬 IDs de las tiendas
    const tiendas = [3, 4, 5];

    // 🔄 Tasas de conversión a CLP
    const conversionRates = {
      MXN: 52,
      PEN: 276,
      COP: 0.24,
      ARS: 1.46,
      CLP: 1,
    };

    // 1️⃣ Inicializar categorías globales
    const categorias = {
      office: { categoria: "Office", cantidad_vendida: 0, ingresos_clp: 0 },
      windows: { categoria: "Windows", cantidad_vendida: 0, ingresos_clp: 0 },
      autocad: { categoria: "AutoCAD", cantidad_vendida: 0, ingresos_clp: 0 },
    };

    let totalOrders = 0;

    // 2️⃣ Recorrer tiendas
    for (const idConfig of tiendas) {
      console.log(`🏬 Procesando tienda ID: ${idConfig}`);

      const pedidos = await getAllPedidosByDateRange(idConfig, {
        startDate,
        endDate,
      });

      totalOrders += pedidos.length;

      // 3️⃣ Procesar pedidos de la tienda
      pedidos.forEach((pedido) => {
        const currency = pedido.currency || "CLP";
        const rate = conversionRates[currency] || 1;

        if (!Array.isArray(pedido.products)) return;

        pedido.products.forEach((product) => {
          const nombre = (product.name || "").toLowerCase();
          const quantity = Number(product.quantity) || 0;
          const totalProducto = Number(product.total) || 0;
          const totalCLP = totalProducto * rate;

          if (nombre.includes("office")) {
            categorias.office.cantidad_vendida += quantity;
            categorias.office.ingresos_clp += totalCLP;
          } else if (nombre.includes("windows")) {
            categorias.windows.cantidad_vendida += quantity;
            categorias.windows.ingresos_clp += totalCLP;
          } else if (nombre.includes("autocad")) {
            categorias.autocad.cantidad_vendida += quantity;
            categorias.autocad.ingresos_clp += totalCLP;
          }
        });
      });
    }

    // 4️⃣ Calcular ingresos totales globales
    const ingresosTotales = Object.values(categorias).reduce(
      (sum, cat) => sum + cat.ingresos_clp,
      0
    );

    // 5️⃣ Enriquecer métricas
    const resultado = Object.values(categorias).map((cat) => {
      const ticketPromedio =
        cat.cantidad_vendida > 0
          ? cat.ingresos_clp / cat.cantidad_vendida
          : 0;

      const porcentajeTotal =
        ingresosTotales > 0
          ? (cat.ingresos_clp / ingresosTotales) * 100
          : 0;

      return {
        categoria: cat.categoria,
        cantidad_vendida: cat.cantidad_vendida,

        ingresos_clp: Math.round(cat.ingresos_clp),
        ingresos_clp_formatted: Math.round(cat.ingresos_clp).toLocaleString("es-CL"),

        porcentaje_total: Number(porcentajeTotal.toFixed(2)),

        ticket_promedio_clp: Math.round(ticketPromedio),
        ticket_promedio_clp_formatted: Math.round(ticketPromedio).toLocaleString("es-CL"),
      };
    });

    // 6️⃣ Retornar informe global
    return {
      tiendas_incluidas: tiendas,
      total_orders: totalOrders,

      ingresos_totales_clp: Math.round(ingresosTotales),
      ingresos_totales_clp_formatted: Math.round(ingresosTotales).toLocaleString("es-CL"),

      ventas_por_tipo_software: resultado,
    };

  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de ventas por tipo de software:", error);
    throw error;
  }
};
// 📦 Informe: Top productos más vendidos (ranking)
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
  getAllPedidosByDateRange,
  getVentasTotalesMXN,
  getTendenciaProductosMXN,
  getVentasPorPais,
  getVentasPorPaisGlobal,
  getPromedioProductosGlobal,
  getPedidosNoEnviadosPorTienda,
  getFlowConfigById,
  getPedidosFallidos,
  updatePedido,
  getPedidos2,
  getVentasPorTipoSoftware,
  getVentasPorTipoSoftwareGlobal,
  getTopProductosVendidos,
  getPedidosFiltradoProductos,
  getPedidosFiltradoProductosGlobal
  
};
