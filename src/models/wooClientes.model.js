const { get } = require('../app');
const db = require('../config/db');
const wooConfigAux = require('../models/woo_config_auxiliar');
const WooProductMapping = require('../models/wooProductMapping.model');

/**
 * Crear cliente Woo
 */
const crearCliente = async ({
  woo_config_id,
  woo_customer_id = null,
  email,
  nombre = null,
  apellido = null,
  telefono = null,
  direccion_1 = null,
  direccion_2 = null,
  ciudad = null,
  estado = null,
  codigo_postal = null,
  pais = null,
  cliente_json = null
}) => {
  const sql = `
    INSERT INTO woo_clientes (
      woo_config_id,
      woo_customer_id,
      email,
      nombre,
      apellido,
      telefono,
      direccion_1,
      direccion_2,
      ciudad,
      estado,
      codigo_postal,
      pais,
      cliente_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    woo_config_id,
    woo_customer_id,
    email,
    nombre,
    apellido,
    telefono,
    direccion_1,
    direccion_2,
    ciudad,
    estado,
    codigo_postal,
    pais,
    cliente_json ? JSON.stringify(cliente_json) : null
  ]);

  return result.insertId;
};
const crearClientesBatch = async (clientes) => {
  if (!Array.isArray(clientes) || clientes.length === 0) {
    return;
  }

  const sql = `
    INSERT INTO woo_clientes (
      woo_config_id,
      email,
      nombre,
      apellido,
      cliente_json
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      cliente_json = JSON_MERGE_PRESERVE(
        COALESCE(cliente_json, JSON_OBJECT()),
        VALUES(cliente_json)
      ),
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = clientes.map(cliente => ([
    cliente.woo_config_id,
    cliente.email,
    cliente.nombre || null,
    cliente.apellido || null,
    JSON.stringify({
      orders: Array.from(new Set(cliente.orders))
    })
  ]));

  await db.query(sql, [values]);
};


/**
 * Obtener cliente por ID
 */
const getClienteById = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM woo_clientes WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

/**
 * Obtener cliente por tienda + email
 */
const getClienteByEmail = async (woo_config_id, email) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_clientes
     WHERE woo_config_id = ? AND email = ?
     LIMIT 1`,
    [woo_config_id, email]
  );
  return rows[0] || null;
};

/**
 * Verificar si cliente existe
 */
const existeCliente = async (woo_config_id, email) => {
  const [rows] = await db.query(
    `SELECT id FROM woo_clientes
     WHERE woo_config_id = ? AND email = ?
     LIMIT 1`,
    [woo_config_id, email]
  );

  return rows.length > 0;
};

/**
 * Listar clientes por tienda
 */
const getClientesPorTienda = async (woo_config_id) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_clientes
     WHERE woo_config_id = ?
     ORDER BY created_at DESC`,
    [woo_config_id]
  );

  return rows;
};

/**
 * Actualizar cliente
 */
const actualizarCliente = async (id, data) => {
  const campos = [];
  const valores = [];

  for (const [key, value] of Object.entries(data)) {
    campos.push(`${key} = ?`);
    valores.push(value);
  }

  if (!campos.length) return;

  const sql = `
    UPDATE woo_clientes
    SET ${campos.join(', ')}
    WHERE id = ?
  `;

  await db.query(sql, [...valores, id]);
};
/*
const guardarClientesDesdePedidos = async (
  woo_config_id,
  { startDate, endDate }
) => {
  console.log("👥 Iniciando guardado de clientes desde pedidos...");

  const pedidos = await wooConfigAux.getAllPedidosByDateRange(woo_config_id, {
    startDate,
    endDate
  });

  console.log(`📦 Pedidos recibidos: ${pedidos.length}`);

  for (const pedido of pedidos) {
    const email = pedido.customer_email?.trim().toLowerCase();
    if (!email) {
      console.warn(`⚠️ Pedido ${pedido.id} sin email, se omite`);
      continue;
    }

    const [nombre, ...restoApellido] = (pedido.customer_name || "").split(" ");
    const apellido = restoApellido.join(" ") || null;

    // 🔎 Buscar cliente existente
    const [rows] = await db.query(
      `
      SELECT id, cliente_json
      FROM woo_clientes
      WHERE woo_config_id = ?
        AND email = ?
      LIMIT 1
      `,
      [woo_config_id, email]
    );

    if (rows.length > 0) {
      // 🧠 Cliente existe → añadir pedido
      const cliente = rows[0];
      let clienteJson = cliente.cliente_json || {};

      if (typeof clienteJson === "string") {
        clienteJson = JSON.parse(clienteJson);
      }

      if (!Array.isArray(clienteJson.orders)) {
        clienteJson.orders = [];
      }

      if (!clienteJson.orders.includes(pedido.id)) {
        clienteJson.orders.push(pedido.id);

        await db.query(
          `
          UPDATE woo_clientes
          SET cliente_json = ?
          WHERE id = ?
          `,
          [JSON.stringify(clienteJson), cliente.id]
        );

        console.log(`➕ Pedido ${pedido.id} añadido a ${email}`);
      } else {
        console.log(`⏭️ Pedido ${pedido.id} ya existía para ${email}`);
      }

    } else {
      // 🆕 Cliente nuevo
      const clienteJson = {
        orders: [pedido.id]
      };

      await crearCliente({
        woo_config_id,
        email,
        nombre: nombre || null,
        apellido,
        cliente_json: clienteJson
      });

      console.log(`🆕 Cliente creado: ${email} (pedido ${pedido.id})`);
    }
  }

  console.log("✅ Proceso de clientes finalizado");
};*/
const guardarClientesDesdePedidos = async (
  woo_config_id,
  { startDate, endDate }
) => {
  console.log("👥 Iniciando guardado eficiente de clientes desde pedidos...");

  const pedidos = await wooConfigAux.getAllPedidosByDateRange(
    woo_config_id,
    { startDate, endDate }
  );

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    console.log("ℹ️ No hay pedidos para procesar");
    return;
  }

  const clientesMap = new Map();

  // 1️⃣ Agrupar pedidos por email
  for (const pedido of pedidos) {
    const email = pedido.customer_email?.trim().toLowerCase();
    if (!email) continue;

    const [nombre, ...resto] = (pedido.customer_name || "").trim().split(/\s+/);
    const apellido = resto.join(" ") || null;

    if (!clientesMap.has(email)) {
      clientesMap.set(email, {
        woo_config_id,
        email,
        nombre: nombre || null,
        apellido,
        orders: []
      });
    }

    clientesMap.get(email).orders.push({
      order_id: pedido.id,
      status: pedido.status,
      date: pedido.date,
      total: pedido.total,
      currency: pedido.currency,
      payment_method: pedido.payment_method,
      products: Array.isArray(pedido.products)
        ? pedido.products.map(p => ({
            product_id: p.product_id,
            name: p.name,
            quantity: p.quantity,
            variation_id: p.variation_id ?? null,
            extra_options: p.extra_options ?? []
          }))
        : []
    });
  }

  const clientes = [...clientesMap.values()];
  console.log(`👤 Clientes únicos detectados: ${clientes.length}`);

  // 2️⃣ Insertar en batches
  const CHUNK_SIZE = 500;

  for (let i = 0; i < clientes.length; i += CHUNK_SIZE) {
    const chunk = clientes.slice(i, i + CHUNK_SIZE);

    // Deduplicar pedidos por order_id
    for (const cliente of chunk) {
      const seen = new Set();
      cliente.orders = cliente.orders.filter(order => {
        if (seen.has(order.order_id)) return false;
        seen.add(order.order_id);
        return true;
      });
    }

    await crearClientesBatch(chunk);

    console.log(
      `📥 Batch ${Math.floor(i / CHUNK_SIZE) + 1} procesado (${chunk.length} clientes)`
    );
  }

  console.log("✅ Guardado de clientes finalizado correctamente");
};

// 📊 Informe de Producto de Entrada (clientes nuevos)
const getProductoEntradaClientesNuevos = async (
  idConfig,
  { startDate, endDate }
) => {
  console.log("📊 Generando informe de producto de entrada...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Obtener clientes históricos
    const clientes = await getClientesPorTienda(idConfig);
    console.log(`👥 Clientes obtenidos: ${clientes.length}`);

    // 2️⃣ Inicializar categorías
    const categorias = {
      office: {
        categoria: "Office",
        clientes_nuevos: 0,
        unidades_vendidas: 0,
      },
      windows: {
        categoria: "Windows",
        clientes_nuevos: 0,
        unidades_vendidas: 0,
      },
      autocad: {
        categoria: "AutoCAD",
        clientes_nuevos: 0,
        unidades_vendidas: 0,
      },
    };

    let totalClientesNuevosPeriodo = 0;

    // 3️⃣ Recorrer clientes
    clientes.forEach((cliente) => {
      const orders = cliente.cliente_json?.orders;

      // Cliente sin pedidos o con más de 1 pedido → no es nuevo
      if (!Array.isArray(orders) || orders.length !== 1) return;

      const primerPedido = orders[0];

      // Validar estado del pedido
      if (
        !["processing", "completed"].includes(primerPedido.status)
      ) {
        return;
      }

      // Validar fecha dentro del período
      const fechaPedido = new Date(primerPedido.date);
      if (
        fechaPedido < new Date(startDate) ||
        fechaPedido > new Date(endDate)
      ) {
        return;
      }

      totalClientesNuevosPeriodo += 1;

      // 4️⃣ Analizar productos del primer pedido
      if (!Array.isArray(primerPedido.products)) return;

      primerPedido.products.forEach((product) => {
        const nombre = (product.name || "").toLowerCase();
        const quantity = Number(product.quantity) || 0;

        if (nombre.includes("office")) {
          categorias.office.clientes_nuevos += 1;
          categorias.office.unidades_vendidas += quantity;
        } else if (nombre.includes("windows")) {
          categorias.windows.clientes_nuevos += 1;
          categorias.windows.unidades_vendidas += quantity;
        } else if (nombre.includes("autocad")) {
          categorias.autocad.clientes_nuevos += 1;
          categorias.autocad.unidades_vendidas += quantity;
        }
      });
    });

    // 5️⃣ Normalizar salida
    const resultado = Object.values(categorias).map((cat) => ({
      ...cat,
      porcentaje_clientes_nuevos:
        totalClientesNuevosPeriodo > 0
          ? Number(
              (
                (cat.clientes_nuevos / totalClientesNuevosPeriodo) *
                100
              ).toFixed(2)
            )
          : 0,
    }));

    // 6️⃣ Retornar informe
    return {
      total_clientes_nuevos_periodo: totalClientesNuevosPeriodo,
      producto_de_entrada: resultado,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe de producto de entrada:",
      error
    );
    throw error;
  }
};

// 📊 Informe de Producto de Entrada (por producto)
// 📊 Informe de Producto de Entrada (por producto, ordenado por ID interno)
const getProductoEntradaPorProducto = async (
  idConfig,
  { startDate, endDate }
) => {
  console.log("📊 Generando informe de producto de entrada por producto...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Obtener clientes históricos
    const clientes = await getClientesPorTienda(idConfig);
    console.log(`👥 Clientes obtenidos: ${clientes.length}`);

    const productosEntrada = {};
    let totalClientesNuevosPeriodo = 0;

    // 2️⃣ Recorrer clientes
    clientes.forEach((cliente) => {
      const orders = cliente.cliente_json?.orders;

      // Cliente no nuevo
      if (!Array.isArray(orders) || orders.length !== 1) return;

      const primerPedido = orders[0];

      // Validar estado
      if (!["processing", "completed"].includes(primerPedido.status)) return;

      // Validar fecha dentro del período
      const fechaPedido = new Date(primerPedido.date);
      if (
        fechaPedido < new Date(startDate) ||
        fechaPedido > new Date(endDate)
      ) return;

      totalClientesNuevosPeriodo += 1;

      // 3️⃣ Analizar productos del primer pedido
      if (!Array.isArray(primerPedido.products)) return;

      primerPedido.products.forEach((product) => {
        const wooProductId = product.product_id;
        const nombre = product.name || "Producto sin nombre";
        const quantity = Number(product.quantity) || 0;

        if (!wooProductId) return;

        if (!productosEntrada[wooProductId]) {
          productosEntrada[wooProductId] = {
            woo_product_id: wooProductId,
            nombre,
            clientes_nuevos: 0,
            unidades_vendidas: 0,
          };
        }

        productosEntrada[wooProductId].clientes_nuevos += 1;
        productosEntrada[wooProductId].unidades_vendidas += quantity;
      });
    });

    // 4️⃣ Resolver IDs internos
    const wooProductIds = Object.keys(productosEntrada).map(Number);

    const mapeos = await WooProductMapping.getProductosInternosIds(
      idConfig,
      wooProductIds
    );

    // Crear mapa rápido
    const mapaInternos = mapeos.reduce((acc, item) => {
      acc[item.woo_product_id] = item.producto_interno_id;
      return acc;
    }, {});

    // 5️⃣ Normalizar y ordenar salida
    const resultado = Object.values(productosEntrada)
      .map((prod) => ({
        ...prod,
        producto_interno_id: mapaInternos[prod.woo_product_id] ?? null,
        porcentaje_clientes_nuevos:
          totalClientesNuevosPeriodo > 0
            ? Number(
                (
                  (prod.clientes_nuevos / totalClientesNuevosPeriodo) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort((a, b) => {
        if (a.producto_interno_id === null) return 1;
        if (b.producto_interno_id === null) return -1;
        return a.producto_interno_id - b.producto_interno_id;
      });

    // 6️⃣ Retornar informe
    return {
      total_clientes_nuevos_periodo: totalClientesNuevosPeriodo,
      productos_de_entrada: resultado,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe de producto de entrada por producto:",
      error
    );
    throw error;
  }
};

/*
// 📊 Informe GLOBAL de Producto de Entrada (por producto interno)
const getProductoEntradaGlobalPorProductoInterno = async (
  { startDate, endDate }
) => {
  console.log("📊 Generando informe GLOBAL de producto de entrada...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  // Tiendas habilitadas
  const tiendas = [3, 4, 5];

  try {
    const productosEntrada = {};
    let totalClientesNuevosPeriodo = 0;

    // 1️⃣ Recorrer tiendas
    for (const idConfig of tiendas) {
      console.log(`🏬 Procesando tienda ${idConfig}`);

      // Obtener clientes por tienda
      const clientes = await getClientesPorTienda(idConfig);

      // 2️⃣ Procesar clientes
      for (const cliente of clientes) {
        const orders = cliente.cliente_json?.orders;

        // Solo clientes nuevos
        if (!Array.isArray(orders) || orders.length !== 1) continue;

        const primerPedido = orders[0];

        // Validar estado
        if (!["processing", "completed"].includes(primerPedido.status)) continue;

        // Validar fecha dentro del período
        const fechaPedido = new Date(primerPedido.date);
        if (
          fechaPedido < new Date(startDate) ||
          fechaPedido > new Date(endDate)
        ) continue;

        totalClientesNuevosPeriodo += 1;

        if (!Array.isArray(primerPedido.products)) continue;

        // 3️⃣ Obtener woo_product_ids del pedido
        const wooProductIds = primerPedido.products
          .map(p => p.product_id)
          .filter(Boolean);

        if (!wooProductIds.length) continue;

        // 4️⃣ Resolver IDs internos para esta tienda
        const mapeos = await WooProductMapping.getProductosInternosIds(
          idConfig,
          wooProductIds
        );

        const mapaInternos = mapeos.reduce((acc, item) => {
          acc[item.woo_product_id] = item.producto_interno_id;
          return acc;
        }, {});

        // 5️⃣ Acumular por producto interno
        primerPedido.products.forEach((product) => {
          const wooProductId = product.product_id;
          const productoInternoId = mapaInternos[wooProductId];

          if (!productoInternoId) return;

          const quantity = Number(product.quantity) || 0;
          const nombre = product.name || "Producto sin nombre";

          if (!productosEntrada[productoInternoId]) {
            productosEntrada[productoInternoId] = {
              producto_interno_id: productoInternoId,
              nombre_referencia: nombre,
              clientes_nuevos: 0,
              unidades_vendidas: 0,
            };
          }

          productosEntrada[productoInternoId].clientes_nuevos += 1;
          productosEntrada[productoInternoId].unidades_vendidas += quantity;
        });
      }
    }

    // 6️⃣ Normalizar y ordenar salida
    const resultado = Object.values(productosEntrada)
      .map((prod) => ({
        ...prod,
        porcentaje_clientes_nuevos:
          totalClientesNuevosPeriodo > 0
            ? Number(
                (
                  (prod.clientes_nuevos / totalClientesNuevosPeriodo) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort(
        (a, b) => a.producto_interno_id - b.producto_interno_id
      );

    // 7️⃣ Retornar informe global
    return {
      tiendas_procesadas: tiendas,
      total_clientes_nuevos_periodo: totalClientesNuevosPeriodo,
      productos_de_entrada_global: resultado,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe GLOBAL de producto de entrada:",
      error
    );
    throw error;
  }
};*/

// 📊 Informe GLOBAL de Producto de Entrada (cliente nuevo por marca version 1 mal mapeado)
/*
const getProductoEntradaGlobalPorProductoInterno = async ({ startDate, endDate }) => {
  console.log("📊 Generando informe GLOBAL de producto de entrada por MARCA...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  const tiendas = [3, 4, 5];

  try {
    const clientesPorEmail = {};
    const productosEntrada = {};
    let totalClientesNuevosPeriodo = 0;

    // 1️⃣ Recolectar clientes de todas las tiendas
    for (const idConfig of tiendas) {
      const clientes = await getClientesPorTienda(idConfig);

      clientes.forEach((cliente) => {
        if (!cliente.email) return;

        if (!clientesPorEmail[cliente.email]) {
          clientesPorEmail[cliente.email] = [];
        }

        const orders = cliente.cliente_json?.orders || [];
        clientesPorEmail[cliente.email].push(
          ...orders.map((o) => ({
            ...o,
            woo_config_id: idConfig,
          }))
        );
      });
    }

    // 2️⃣ Procesar cliente por cliente (email único)
    for (const email of Object.keys(clientesPorEmail)) {
      const pedidos = clientesPorEmail[email];

      if (!pedidos.length) continue;

      // Ordenar pedidos globales por fecha
      pedidos.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      // Cliente nuevo GLOBAL = solo 1 pedido histórico
      if (pedidos.length !== 1) continue;

      const primerPedido = pedidos[0];

      // Validar estado
      if (!["processing", "completed"].includes(primerPedido.status)) continue;

      // Validar fecha dentro del período
      const fechaPedido = new Date(primerPedido.date);
      if (
        fechaPedido < new Date(startDate) ||
        fechaPedido > new Date(endDate)
      ) continue;

      totalClientesNuevosPeriodo += 1;

      if (!Array.isArray(primerPedido.products)) continue;

      const idConfig = primerPedido.woo_config_id;

      // 3️⃣ Resolver IDs internos de productos
      const wooProductIds = primerPedido.products
        .map((p) => p.product_id)
        .filter(Boolean);

      const mapeos = await WooProductMapping.getProductosInternosIds(
        idConfig,
        wooProductIds
      );

      const mapaInternos = mapeos.reduce((acc, item) => {
        acc[item.woo_product_id] = item.producto_interno_id;
        return acc;
      }, {});

      // 4️⃣ Acumular métricas por producto interno
      primerPedido.products.forEach((product) => {
        const wooProductId = product.product_id;
        const productoInternoId = mapaInternos[wooProductId];

        if (!productoInternoId) return;

        const quantity = Number(product.quantity) || 0;
        const nombre = product.name || "Producto sin nombre";

        if (!productosEntrada[productoInternoId]) {
          productosEntrada[productoInternoId] = {
            producto_interno_id: productoInternoId,
            nombre_referencia: nombre,
            clientes_nuevos: 0,
            unidades_vendidas: 0,
          };
        }

        productosEntrada[productoInternoId].clientes_nuevos += 1;
        productosEntrada[productoInternoId].unidades_vendidas += quantity;
      });
    }

    // 5️⃣ Normalizar y ordenar salida
    const resultado = Object.values(productosEntrada)
      .map((prod) => ({
        ...prod,
        porcentaje_clientes_nuevos:
          totalClientesNuevosPeriodo > 0
            ? Number(
                (
                  (prod.clientes_nuevos / totalClientesNuevosPeriodo) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort(
        (a, b) => a.producto_interno_id - b.producto_interno_id
      );

    // 6️⃣ Retornar informe
    return {
      tiendas_procesadas: tiendas,
      total_clientes_nuevos_periodo: totalClientesNuevosPeriodo,
      productos_de_entrada_global: resultado,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe GLOBAL de producto de entrada por marca:",
      error
    );
    throw error;
  }
};*/
// 📊 Informe GLOBAL de Producto de Entrada (cliente nuevo por marca)
const getProductoEntradaGlobalPorProductoInterno = async ({ startDate, endDate }) => {
  console.log("📊 Generando informe GLOBAL de producto de entrada por MARCA...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  const tiendas = [3, 4, 5];

  try {
    const clientesPorEmail = {};
    const productosEntrada = {};
    const productosPorTienda = {}; // 🔹 recolección previa
    let totalClientesNuevosPeriodo = 0;

    // 1️⃣ Recolectar clientes y pedidos de todas las tiendas
    for (const idConfig of tiendas) {
      const clientes = await getClientesPorTienda(idConfig);

      clientes.forEach((cliente) => {
        if (!cliente.email) return;

        if (!clientesPorEmail[cliente.email]) {
          clientesPorEmail[cliente.email] = [];
        }

        const orders = cliente.cliente_json?.orders || [];
        orders.forEach((order) => {
          clientesPorEmail[cliente.email].push({
            ...order,
            woo_config_id: idConfig,
          });
        });
      });
    }

    // 2️⃣ Procesar clientes únicos (por email)
    for (const email of Object.keys(clientesPorEmail)) {
      const pedidos = clientesPorEmail[email];
      if (!pedidos.length) continue;

      // Ordenar pedidos globales por fecha
      pedidos.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Cliente nuevo GLOBAL = solo 1 pedido histórico
      if (pedidos.length !== 1) continue;

      const primerPedido = pedidos[0];

      // Validar estado
      if (!["processing", "completed"].includes(primerPedido.status)) continue;

      // Validar período
      const fechaPedido = new Date(primerPedido.date);
      if (
        fechaPedido < new Date(startDate) ||
        fechaPedido > new Date(endDate)
      ) continue;

      totalClientesNuevosPeriodo += 1;

      if (!Array.isArray(primerPedido.products)) continue;

      const idConfig = primerPedido.woo_config_id;

      if (!productosPorTienda[idConfig]) {
        productosPorTienda[idConfig] = {};
      }

      // 3️⃣ Recolectar productos (SIN mapear)
      primerPedido.products.forEach((product) => {
        const wooProductId = product.product_id;
        if (!wooProductId) return;

        if (!productosPorTienda[idConfig][wooProductId]) {
          productosPorTienda[idConfig][wooProductId] = [];
        }

        productosPorTienda[idConfig][wooProductId].push({
          quantity: Number(product.quantity) || 0,
          nombre: product.name || "Producto sin nombre",
        });
      });
    }

    // 4️⃣ Mapeo batch por tienda (UNA vez por tienda)
    const mapaGlobalProductos = {}; // "idConfig|woo_product_id" → producto_interno_id

    for (const idConfig of Object.keys(productosPorTienda)) {
      const wooProductIds = Object.keys(productosPorTienda[idConfig]).map(Number);

      if (!wooProductIds.length) continue;

      const mapeos = await WooProductMapping.getProductosInternosIds(
        Number(idConfig),
        wooProductIds
      );

      mapeos.forEach((item) => {
        const key = `${idConfig}|${item.woo_product_id}`;
        mapaGlobalProductos[key] = item.producto_interno_id;
      });
    }

    // 5️⃣ Acumulación final por producto interno
    Object.entries(productosPorTienda).forEach(([idConfig, productos]) => {
      Object.entries(productos).forEach(([wooProductId, items]) => {
        const key = `${idConfig}|${wooProductId}`;
        const productoInternoId = mapaGlobalProductos[key];

        if (!productoInternoId) return;

        items.forEach(({ quantity, nombre }) => {
          if (!productosEntrada[productoInternoId]) {
            productosEntrada[productoInternoId] = {
              producto_interno_id: productoInternoId,
              nombre_referencia: nombre,
              clientes_nuevos: 0,
              unidades_vendidas: 0,
            };
          }

          productosEntrada[productoInternoId].clientes_nuevos += 1;
          productosEntrada[productoInternoId].unidades_vendidas += quantity;
        });
      });
    });

    // 6️⃣ Normalizar salida
    const resultado = Object.values(productosEntrada)
      .map((prod) => ({
        ...prod,
        porcentaje_clientes_nuevos:
          totalClientesNuevosPeriodo > 0
            ? Number(
                (
                  (prod.clientes_nuevos / totalClientesNuevosPeriodo) *
                  100
                ).toFixed(2)
              )
            : 0,
      }))
      .sort((a, b) => a.producto_interno_id - b.producto_interno_id);

    // 7️⃣ Retornar informe
    return {
      tiendas_procesadas: tiendas,
      total_clientes_nuevos_periodo: totalClientesNuevosPeriodo,
      productos_de_entrada_global: resultado,
    };

  } catch (error) {
    console.error(
      "💥 Error al generar informe GLOBAL de producto de entrada por marca:",
      error
    );
    throw error;
  }
};






// 📊 Informe de Frecuencia de Compra (periódico)
const getInformeFrecuenciaCompra = async (idConfig, { startDate, endDate }) => {
  console.log("📊 Generando informe de frecuencia de compra...");
  console.log("📅 Parámetros recibidos:", { startDate, endDate });

  try {
    // 1️⃣ Obtener pedidos del período
    const pedidos = await wooConfigAux.getAllPedidosByDateRange(idConfig, { startDate, endDate });
    console.log(`📦 Pedidos en el período: ${pedidos.length}`);

    if (!pedidos.length) {
      return {
        clientes_activos: 0,
        porcentaje_clientes_nuevos: 0,
        porcentaje_clientes_recurrentes: 0,
        promedio_compras_por_cliente: 0,
      };
    }

    // 2️⃣ Mapear pedidos por email de cliente
    const pedidosPorCliente = pedidos.reduce((acc, pedido) => {
      const email = pedido.customer_email;
      if (!email) return acc;

      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {});

    const emailsActivos = Object.keys(pedidosPorCliente);

    // 3️⃣ Obtener clientes históricos
    const clientes = await getClientesPorTienda(idConfig);

    // Indexar clientes por email
    const clientesPorEmail = clientes.reduce((acc, cliente) => {
      if (cliente.email) {
        acc[cliente.email] = cliente;
      }
      return acc;
    }, {});

    let clientesNuevos = 0;
    let clientesRecurrentes = 0;
    let totalPedidosPeriodo = pedidos.length;

    // 4️⃣ Clasificar clientes activos
    emailsActivos.forEach((email) => {
      const cliente = clientesPorEmail[email];

      if (!cliente || !cliente.cliente_json?.orders) {
        // Si no hay histórico, se considera nuevo
        clientesNuevos += 1;
        return;
      }

      const totalPedidosHistoricos = cliente.cliente_json.orders.length;

      if (totalPedidosHistoricos === 1) {
        clientesNuevos += 1;
      } else if (totalPedidosHistoricos > 1) {
        clientesRecurrentes += 1;
      }
    });

    const totalClientesActivos = clientesNuevos + clientesRecurrentes;

    // 5️⃣ Calcular métricas
    const porcentajeClientesNuevos =
      totalClientesActivos > 0
        ? ((clientesNuevos / totalClientesActivos) * 100).toFixed(2)
        : 0;

    const porcentajeClientesRecurrentes =
      totalClientesActivos > 0
        ? ((clientesRecurrentes / totalClientesActivos) * 100).toFixed(2)
        : 0;

    const promedioComprasPorCliente =
      totalClientesActivos > 0
        ? (totalPedidosPeriodo / totalClientesActivos).toFixed(2)
        : 0;

    // 6️⃣ Retornar informe
    return {
      clientes_activos: totalClientesActivos,
      clientes_nuevos: clientesNuevos,
      clientes_recurrentes: clientesRecurrentes,
      porcentaje_clientes_nuevos: Number(porcentajeClientesNuevos),
      porcentaje_clientes_recurrentes: Number(porcentajeClientesRecurrentes),
      promedio_compras_por_cliente: Number(promedioComprasPorCliente),
    };

  } catch (error) {
    console.error("💥 Error al generar informe de frecuencia de compra:", error);
    throw error;
  }
};


module.exports = {
  crearCliente,
  getClienteById,
  getClienteByEmail,
  existeCliente,
  getClientesPorTienda,
  actualizarCliente,
  guardarClientesDesdePedidos,
  getInformeFrecuenciaCompra,
  crearClientesBatch,
  getProductoEntradaClientesNuevos,
  getProductoEntradaPorProducto,
  getProductoEntradaGlobalPorProductoInterno
};
