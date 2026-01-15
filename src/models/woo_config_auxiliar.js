const model = require('../models/webhook.model');
const WooMap = require('../models/wooProductMapping.model');
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

const getVentasPorProductoGlobal = async ({ startDate, endDate }) => {
  console.log("📊 Generando informe GLOBAL de ventas por PRODUCTO (normalizado)...");

  try {
    // 🏬 Tiendas incluidas
    const tiendas = [3, 4, 5];

    // 🔄 Conversión a CLP
    const conversionRates = {
      MXN: 52,
      PEN: 276,
      COP: 0.24,
      ARS: 1.46,
      CLP: 1,
    };

    // 📦 Acumulador por producto interno
    const productos = {};

    let totalOrders = 0;

    // 🔁 Recorrer tiendas
    for (const woocommerce_id of tiendas) {
      console.log(`🏬 Procesando tienda ID: ${woocommerce_id}`);

      const pedidos = await getAllPedidosByDateRange(woocommerce_id, {
        startDate,
        endDate,
      });

      totalOrders += pedidos.length;

      // 👉 Extraer todos los woo_product_id de la tienda
      const wooProductIds = [];

      pedidos.forEach((pedido) => {
        if (!Array.isArray(pedido.products)) return;

        pedido.products.forEach((product) => {
          if (product.product_id) {
            wooProductIds.push(product.product_id);
          }
        });
      });

      // 🔗 Normalizar IDs externos → internos
      const mappings = await WooMap.getProductosInternosIds(
        woocommerce_id,
        [...new Set(wooProductIds)] // evitar duplicados
      );

      const mappingByWooId = {};
      mappings.forEach((m) => {
        mappingByWooId[m.woo_product_id] = m.producto_interno_id;
      });

      // 🔄 Procesar pedidos ya normalizados
      pedidos.forEach((pedido) => {
        const currency = pedido.currency || "CLP";
        const rate = conversionRates[currency] || 1;

        if (!Array.isArray(pedido.products)) return;

        pedido.products.forEach((product) => {
          const wooProductId = product.product_id;
         // console.log('producto', product.product_id);
          const productoInternoId = mappingByWooId[wooProductId];

          // 🚫 Ignorar productos sin mapeo interno
          if (!productoInternoId) return;

          const quantity = Number(product.quantity) || 0;
          const totalProducto = Number(product.total) || 0;
          const totalCLP = totalProducto * rate;

          // 🔹 Inicializar producto interno si no existe
          if (!productos[productoInternoId]) {
            productos[productoInternoId] = {
              producto_interno_id: productoInternoId,
              cantidad_vendida: 0,
              ingresos_clp: 0,
            };
          }

          productos[productoInternoId].cantidad_vendida += quantity;
          productos[productoInternoId].ingresos_clp += totalCLP;
        });
      });
    }

    // 💰 Ingresos totales
    const ingresosTotales = Object.values(productos).reduce(
      (sum, p) => sum + p.ingresos_clp,
      0
    );

    // 📊 Métricas finales
    const ventasPorProducto = Object.values(productos)
      .map((p) => {
        const ticketPromedio =
          p.cantidad_vendida > 0
            ? p.ingresos_clp / p.cantidad_vendida
            : 0;

        const porcentajeTotal =
          ingresosTotales > 0
            ? (p.ingresos_clp / ingresosTotales) * 100
            : 0;

        return {
          producto_interno_id: p.producto_interno_id,
          cantidad_vendida: p.cantidad_vendida,

          ingresos_clp: Math.round(p.ingresos_clp),
          ingresos_clp_formatted: Math.round(p.ingresos_clp).toLocaleString("es-CL"),

          porcentaje_total: Number(porcentajeTotal.toFixed(2)),

          ticket_promedio_clp: Math.round(ticketPromedio),
          ticket_promedio_clp_formatted: Math.round(ticketPromedio).toLocaleString("es-CL"),
        };
      })
      // 🔥 Orden descendente por ingresos
      .sort((a, b) => b.ingresos_clp - a.ingresos_clp);

    // ✅ Resultado final
    return {
      tiendas_incluidas: tiendas,
      total_orders: totalOrders,

      ingresos_totales_clp: Math.round(ingresosTotales),
      ingresos_totales_clp_formatted: Math.round(ingresosTotales).toLocaleString("es-CL"),

      ventas_por_producto: ventasPorProducto,
    };

  } catch (error) {
    console.error("💥 Error al generar informe GLOBAL de ventas por producto:", error);
    throw error;
  }
};


const getIngresosGlobalesCLP = async ({ startDate, endDate }) => {
  console.log("🧪 [getIngresosGlobalesCLP] Rango recibido");
  console.log("➡️ startDate (raw):", startDate);
  console.log("➡️ endDate   (raw):", endDate);
  console.log("➡️ startDate ISO :", startDate?.toISOString?.());
  console.log("➡️ endDate ISO   :", endDate?.toISOString?.());

  const tiendas = [3, 4, 5];

  const conversionRates = {
    MXN: 52,
    PEN: 276,
    COP: 0.24,
    ARS: 1.46,
    CLP: 1,
  };

  let ingresosTotales = 0;
  let totalOrders = 0;

  for (const idConfig of tiendas) {
    console.log(`🏬 Tienda ${idConfig} → consultando pedidos...`);

    const pedidos = await getAllPedidosByDateRange(idConfig, {
      startDate,
      endDate,
    });

    console.log(
      `📦 Tienda ${idConfig} → pedidos encontrados:`,
      pedidos.length
    );

    if (pedidos.length > 0) {
      const first = pedidos[0];
      const last = pedidos[pedidos.length - 1];

      console.log("🕒 Primer pedido:", first.created_at);
      console.log("🕒 Último pedido :", last.created_at);
    }

    totalOrders += pedidos.length;

    pedidos.forEach((pedido) => {
      const currency = pedido.currency || "CLP";
      const rate = conversionRates[currency] ?? 1;

      if (!Array.isArray(pedido.products)) return;

      pedido.products.forEach((product) => {
        ingresosTotales += (Number(product.total) || 0) * rate;
      });
    });
  }

  console.log("✅ Totales calculados");
  console.log("💰 ingresos_clp:", Math.round(ingresosTotales));
  console.log("🧾 total_orders:", totalOrders);

  return {
    ingresos_clp: Math.round(ingresosTotales),
    total_orders: totalOrders,
  };
};

const calcularCrecimiento = (actual, anterior) => {
  const diferencia = actual - anterior;

  const porcentaje =
    anterior > 0 ? (diferencia / anterior) * 100 : actual > 0 ? 100 : 0;

  return {
    actual,
    anterior,
    diferencia,
    porcentaje: Number(porcentaje.toFixed(2)),
  };
};
const getCrecimientoVentasGlobal = async () => {
  console.log("📈 Generando informe de crecimiento de ventas (tendencia real)...");
const ahora = new Date();

// Inicio de hoy
const inicioHoy = new Date(
  ahora.getFullYear(),
  ahora.getMonth(),
  ahora.getDate(),
  0, 0, 0, 0
);

// Fin de hoy = ahora (NO fin del día)
const finHoy = new Date(ahora);

// Inicio de ayer
const inicioAyer = new Date(inicioHoy);
inicioAyer.setDate(inicioHoy.getDate() - 1);

// Fin de ayer = misma hora que ahora pero ayer
const finAyer = new Date(finHoy);
finAyer.setDate(finHoy.getDate() - 1);
console.log("horas diarias comparadas", {
  inicioHoy,
  finHoy,
  inicioAyer,
  finAyer,
});
  // =========================
  // 🗓️ MENSUAL PROPORCIONAL (MTD vs MTD)
  // =========================

  const diaActual = ahora.getDate();

  const inicioMesActual = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    1
  );

  const inicioMesAnterior = new Date(
    ahora.getFullYear(),
    ahora.getMonth() - 1,
    1
  );

  const finMesAnterior = new Date(
    ahora.getFullYear(),
    ahora.getMonth() - 1,
    diaActual
  );

  // =========================
  // 🔄 Obtener ingresos
  // =========================

  const [
    ventasHoy,
    ventasAyer,
    ventasMesActual,
    ventasMesAnterior,
  ] = await Promise.all([
    getIngresosGlobalesCLP({
      startDate: inicioHoy,
      endDate: ahora,
    }),
    getIngresosGlobalesCLP({
      startDate: inicioAyer,
      endDate: finAyer,
    }),
    getIngresosGlobalesCLP({
      startDate: inicioMesActual,
      endDate: ahora,
    }),
    getIngresosGlobalesCLP({
      startDate: inicioMesAnterior,
      endDate: finMesAnterior,
    }),
  ]);

  return {
    hoy_vs_ayer: {
      ...calcularCrecimiento(
        ventasHoy.ingresos_clp,
        ventasAyer.ingresos_clp
      ),
    },

    mes_actual_vs_anterior: {
      ...calcularCrecimiento(
        ventasMesActual.ingresos_clp,
        ventasMesAnterior.ingresos_clp
      ),
    },
  };
};



const getAllPedidosByDateRange = async (idConfig, { startDate, endDate }) => { 
  //console.log("⏳ Iniciando búsqueda de pedidos por rango de fechas...");
 // console.log("📅 Filtros recibidos:", { startDate, endDate });

  try {
    const api = await model.getWooApiInstanceByConfigId(idConfig);

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setFullYear(now.getFullYear() - 1);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : now;
/*  if (endDate) {
      end.setHours(23, 59, 59, 999);
    }
*/
    const startISO = start.toISOString();
    const endISO = end.toISOString();

   // console.log("📅 Rango de fechas:", { startISO, endISO });

    const perPage = 100;
    const maxPages = 100; // 👉 máximo 10,000 pedidos (100 x 100)
    const batchSize = 5;

    let allOrders = [];

    for (let i = 0; i < maxPages; i += batchSize) {
      const pageBatch = Array.from({ length: batchSize }, (_, j) => i + j + 1);
     // console.log(`🚀 Solicitando páginas:`, pageBatch);

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
      //console.log('orders',validOrders);
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
       // console.log("🛑 Fin anticipado: no hay más pedidos.");
        break;
      }
    }

    // 🛡️ Filtro extra estricto por fecha
    const strictlyFilteredOrders = allOrders.filter(p => {
      const created = new Date(p.date);
      return created >= start && created <= end;
    });

    //console.log(`📦 Pedidos crudos: ${allOrders.length}, después de filtro estricto: ${strictlyFilteredOrders.length}`);
    return strictlyFilteredOrders;

  } catch (error) {
    console.error("💥 Error obteniendo pedidos por rango:", error.response?.data || error);
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
    getTopProductosVendidos,
    getVentasPorTipoSoftwareGlobal,
    getAllPedidosByDateRange, 
    getCrecimientoVentasGlobal,
    getVentasPorProductoGlobal
  }