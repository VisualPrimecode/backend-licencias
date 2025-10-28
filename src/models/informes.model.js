const connectToDB = require('../utils/connectToDB');
const db = require('../config/db'); // Para conectarse al sistema y obtener los datos de conexión

//LICENCIAS ORIGINALES
// Funciones para obtener informes de licencias originales
const getInformeLicenciasOriginales = async (configId, fechaInicio, fechaFin) => {
      console.log('entro en getInformeLicenciasOriginales');

  let externalDb;
  console.log("Obteniendo informe de licencias originales para config ID:", configId);
  try {
    // 1. Obtener datos de conexión
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    console.log('🔧 Config de conexión:', config);

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    // 2. Intentar conexión externa
    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa establecida');

    // 3. Ejecutar consulta en BD externa con rango de fechas
    const query = `
      SELECT 
        SUM(total_pagado) AS total_pagado_general
      FROM (
        SELECT 
          oi.order_id AS id_pedido, 
          CASE 
              WHEN CAST(oim_qty.meta_value AS UNSIGNED) > 1 THEN ROUND(oim.meta_value)
              WHEN ROUND(oim.meta_value) % 100 = 90 THEN ROUND(oim.meta_value)
              ELSE ROUND(oim.meta_value * 1.19)
          END AS total_pagado
        FROM wp_woocommerce_order_items AS oi
        LEFT JOIN wp_woocommerce_order_itemmeta AS oim 
          ON oi.order_item_id = oim.order_item_id 
          AND oim.meta_key = '_line_total'
        LEFT JOIN wp_woocommerce_order_itemmeta AS oim_qty
          ON oi.order_item_id = oim_qty.order_item_id 
          AND oim_qty.meta_key = '_qty'
        JOIN wp_wc_order_stats AS o_stats 
          ON oi.order_id = o_stats.order_id 
          AND o_stats.status IN ('wc-completed', 'wc-processing')
        WHERE 
          oi.order_item_name NOT LIKE '%IVA%' 
          AND DATE(o_stats.date_created) BETWEEN ? AND ?
      ) AS sub;
    `;

    const [result] = await externalDb.query(query, [fechaInicio, fechaFin]);

    return result;

  } catch (error) {
    console.error('❌ Error al obtener informe de licencias:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    // 4. Asegurar cierre de conexión externa
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};

const getInformeLicenciasPorMes = async (configId, anio) => {
      console.log("entro en getInformeLicenciasPorMes")

  let externalDb;
  console.log(`📅 Obteniendo informe mensual de licencias originales para el año ${anio}, config ID: ${configId}`);
  try {
    // 1. Obtener configuración de conexión
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    // 2. Conectar a la BD externa
    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa establecida');

    // 3. Consulta mensual agrupada por mes
    const query = `
      SELECT 
        MONTH(o_stats.date_created) AS mes,
        SUM(
          CASE 
              WHEN CAST(oim_qty.meta_value AS UNSIGNED) > 1 THEN ROUND(oim.meta_value)
              WHEN ROUND(oim.meta_value) % 100 = 90 THEN ROUND(oim.meta_value)
              ELSE ROUND(oim.meta_value * 1.19)
          END
        ) AS total_pagado
      FROM wp_woocommerce_order_items AS oi
      LEFT JOIN wp_woocommerce_order_itemmeta AS oim 
        ON oi.order_item_id = oim.order_item_id 
        AND oim.meta_key = '_line_total'
      LEFT JOIN wp_woocommerce_order_itemmeta AS oim_qty
        ON oi.order_item_id = oim_qty.order_item_id 
        AND oim_qty.meta_key = '_qty'
      JOIN wp_wc_order_stats AS o_stats 
        ON oi.order_id = o_stats.order_id 
        AND o_stats.status IN ('wc-completed', 'wc-processing')
      WHERE 
        oi.order_item_name NOT LIKE '%IVA%' 
        AND YEAR(o_stats.date_created) = ?
      GROUP BY mes
      ORDER BY mes;
    `;

    const [result] = await externalDb.query(query, [anio]);

    return result.map(row => ({
      mes: row.mes,
      total_pagado: row.total_pagado ?? 0
    }));

  } catch (error) {
    console.error('❌ Error al obtener informe mensual:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};
const getInformeLicenciasPorRango = async (configId, fechaInicio, fechaFin) => {
    console.log("entro en getInformeLicenciasPorRango")

  let externalDb;
  console.log(`📊 Obteniendo informe total y mensual para config ID: ${configId}`);

  try {
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa establecida');

    const query = `
      SELECT 
        MONTH(o_stats.date_created) AS mes,
        SUM(CASE 
          WHEN CAST(oim_qty.meta_value AS UNSIGNED) > 1 THEN ROUND(oim.meta_value)
          WHEN ROUND(oim.meta_value) % 100 = 90 THEN ROUND(oim.meta_value)
          ELSE ROUND(oim.meta_value * 1.19)
        END) AS total_pagado
      FROM wp_woocommerce_order_items AS oi
      LEFT JOIN wp_woocommerce_order_itemmeta AS oim 
        ON oi.order_item_id = oim.order_item_id 
        AND oim.meta_key = '_line_total'
      LEFT JOIN wp_woocommerce_order_itemmeta AS oim_qty
        ON oi.order_item_id = oim_qty.order_item_id 
        AND oim_qty.meta_key = '_qty'
      JOIN wp_wc_order_stats AS o_stats 
        ON oi.order_id = o_stats.order_id 
        AND o_stats.status IN ('wc-completed', 'wc-processing')
      WHERE 
        oi.order_item_name NOT LIKE '%IVA%' 
        AND DATE(o_stats.date_created) BETWEEN ? AND ?
      GROUP BY mes
      ORDER BY mes;
    `;

    const [mensual] = await externalDb.query(query, [fechaInicio, fechaFin]);

    // Calcular total general desde el resultado mensual
    const total_general = mensual.reduce((acc, cur) => acc + (cur.total_pagado || 0), 0);


    return {
        total_general,
  por_mes: mensual

    };

  } catch (error) {
    console.error('❌ Error al obtener informe por rango:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};

//LICENCIAS software

const getInformePorRango = async (configId, fechaInicio, fechaFin) => {
  console.log("entro en getInformePorRango")
  let externalDb;
  console.log(`📦 Obteniendo informe detallado para config ID: ${configId}`);

  try {
    // Obtener configuración de conexión
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    // Conectarse a la base de datos externa
    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa establecida');

    // Consulta SQL adaptada con filtro por rango de fechas
    const query = `
      SELECT 
        MONTH(p.post_date) AS mes,
        SUM(CAST(cmeta_total.meta_value AS UNSIGNED)) AS total_pagado
      FROM xrz_posts AS p
      LEFT JOIN xrz_postmeta AS cmeta_total  
        ON p.ID = cmeta_total.post_id 
        AND cmeta_total.meta_key = '_order_total'
      WHERE 
        p.post_type = 'shop_order'
        AND p.post_status IN ('wc-completed', 'wc-processing')
        AND DATE(p.post_date) BETWEEN ? AND ?
      GROUP BY mes
      ORDER BY mes;
    `;



    const [mensual] = await externalDb.query(query, [fechaInicio, fechaFin]);

    // Calcular total general sumando todos los montos por mes
const total_general = mensual.reduce(
  (acc, cur) => acc + Number(cur.total_pagado || 0),
  0
);
const por_mes = mensual.map(row => ({
  mes: Number(row.mes),
  total_pagado: Number(row.total_pagado)
}));
    return {
  total_general,
  por_mes
};
  } catch (error) {
    console.error('❌ Error al obtener informe detallado por rango de  licenciasoriginales:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};

//licencias digitales
const getInformePedidosDetalladoJejePorRango = async (configId, fechaInicio, fechaFin) => {
  console.log('entro en getInformePedidosDetalladoJejePorRango');
  let externalDb;
  console.log(`📦 Obteniendo informe detallado JEJE por rango para config ID: ${configId}`);

  try {
    // Obtener configuración de conexión
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    // Establecer conexión externa
    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa establecida');

    const query = `
      SELECT 
        oi.order_id AS id_pedido,  
        ROUND(SUM(oim_meta2.meta_value * 1.19), 2) AS monto_con_iva,  
        GROUP_CONCAT(oi.order_item_name SEPARATOR ', ') AS productos,  
        p.post_date AS fecha,
        SUM(oim_meta1.meta_value) AS cantidad_total,  
        ROUND(MAX(cmeta_total.meta_value), 2) AS total_pagado,  
        COALESCE(cmeta_customer.meta_value, 'Cliente Invitado') AS nombre,
        COALESCE(cmeta_lastname.meta_value, '') AS apellido,
        COALESCE(cmeta_email.meta_value, 'Sin correo') AS correo,
        COALESCE(cmeta_payment.meta_value, 'Desconocido') AS medio_pago
      FROM jeje_woocommerce_order_items AS oi
      JOIN jeje_woocommerce_order_itemmeta AS oim_meta1 
          ON oi.order_item_id = oim_meta1.order_item_id 
          AND oim_meta1.meta_key = '_qty'
      JOIN jeje_woocommerce_order_itemmeta AS oim_meta2 
          ON oi.order_item_id = oim_meta2.order_item_id 
          AND oim_meta2.meta_key = '_line_total'
      JOIN jeje_posts AS p 
          ON oi.order_id = p.ID 
          AND p.post_type = 'shop_order'
      LEFT JOIN jeje_postmeta AS cmeta_email 
          ON oi.order_id = cmeta_email.post_id 
          AND cmeta_email.meta_key = '_billing_email'
      LEFT JOIN jeje_postmeta AS cmeta_customer 
          ON oi.order_id = cmeta_customer.post_id 
          AND cmeta_customer.meta_key = '_billing_first_name'
      LEFT JOIN jeje_postmeta AS cmeta_lastname 
          ON oi.order_id = cmeta_lastname.post_id 
          AND cmeta_lastname.meta_key = '_billing_last_name'
      LEFT JOIN jeje_postmeta AS cmeta_total  
          ON oi.order_id = cmeta_total.post_id 
          AND cmeta_total.meta_key = '_order_total'
      LEFT JOIN jeje_postmeta AS cmeta_payment  
          ON oi.order_id = cmeta_payment.post_id 
          AND cmeta_payment.meta_key = '_payment_method_title'
      WHERE 
        DATE(p.post_date) BETWEEN ? AND ?
        AND p.post_status IN ('wc-completed', 'wc-processing')
      GROUP BY oi.order_id
      ORDER BY p.post_date DESC;
    `;

    const [resultados] = await externalDb.query(query, [fechaInicio, fechaFin]);

    return {
      cantidad_pedidos: resultados.length,
      datos: resultados
    };
  } catch (error) {
    console.error('❌ Error al obtener informe detallado licenciasdigitales:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};
const getInformePedidosTotalesJejePorRango = async (configId, fechaInicio, fechaFin) => {
  console.log('entro en getInformePedidosTotalesJejePorRango');
  let externalDb;
  console.log(`📊 Obteniendo informe total y mensual (JEJE) para config ID: ${configId}`);

  try {
    // Obtener configuración de conexión
    const [rows] = await db.query(
      'SELECT * FROM db_connection_config WHERE id_woo = ?',
      [configId]
    );
    const config = rows[0];

    if (!config) {
      throw new Error('❌ Configuración no encontrada.');
    }

    if (config.estado !== 'activa') {
      throw new Error('⚠️ Conexión inactiva. No se puede establecer conexión.');
    }

    // Conexión a la base de datos externa
    externalDb = await connectToDB(config);
    console.log('✅ Conexión a BD externa JEJE establecida');

    // Consulta SQL para sumar total y agrupar por mes
    const query = `
      SELECT 
        MONTH(p.post_date) AS mes,
        SUM(CAST(cmeta_total.meta_value AS UNSIGNED)) AS total_pagado
      FROM jeje_posts AS p
      LEFT JOIN jeje_postmeta AS cmeta_total  
        ON p.ID = cmeta_total.post_id 
        AND cmeta_total.meta_key = '_order_total'
      WHERE 
        p.post_type = 'shop_order'
        AND p.post_status IN ('wc-completed', 'wc-processing')
        AND DATE(p.post_date) BETWEEN ? AND ?
      GROUP BY mes
      ORDER BY mes;
    `;

    const [mensual] = await externalDb.query(query, [fechaInicio, fechaFin]);

    // Calcular total general correctamente como número
    const total_general = mensual.reduce(
      (acc, cur) => acc + Number(cur.total_pagado || 0),
      0
    );

    const por_mes = mensual.map(row => ({
      mes: Number(row.mes),
      total_pagado: Number(row.total_pagado)
    }));

    return {
      total_general,
      por_mes
    };
  } catch (error) {
    console.error('❌ Error al obtener informe JEJE por rango:', error.message);
    throw new Error('Error al obtener datos desde la base de datos externa: ' + error.message);
  } finally {
    if (externalDb) {
      try {
        await externalDb.end();
        console.log('🔌 Conexión externa JEJE cerrada correctamente');
      } catch (err) {
        console.warn('⚠️ Error al cerrar conexión externa:', err.message);
      }
    }
  }
};

const getProductosVendidosPorRango = async (fechaInicio, fechaFin) => {
  console.log("📊 Entrando en getProductosVendidosPorRango");
  console.log(`⏳ Fechas: ${fechaInicio} → ${fechaFin}`);

  try {
    const query = `
      SELECT 
          DATE_FORMAT(e.fecha_envio, '%Y-%m') AS mes,
          s.producto_id,
          p.nombre AS producto,
          COUNT(s.id) AS total_vendidos
      FROM envios e
      JOIN seriales s 
          ON e.numero_pedido = s.numero_pedido
      JOIN productos p 
          ON s.producto_id = p.id
      WHERE e.estado = 'enviado'
        AND e.fecha_envio BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(e.fecha_envio, '%Y-%m'), s.producto_id
      ORDER BY mes, total_vendidos DESC;
    `;

    const [rows] = await db.query(query, [fechaInicio, fechaFin]);

    return rows;

  } catch (error) {
    console.error('❌ Error en getProductosVendidosPorRango:', error.message);
    throw new Error('Error al obtener productos vendidos: ' + error.message);
  }
};

const getEstadoStockProductos = async (fechaInicio, fechaFin) => {
  console.log("📊 Entrando en getEstadoStockProductos metodo del modelo");
  console.log(`⏳ Fechas analizadas: ${fechaInicio} → ${fechaFin}`);

  try {
    const query = `
      WITH ventas_diarias AS (
    SELECT 
        s.producto_id,
        DATE(e.fecha_envio) AS fecha,
        COUNT(s.id) AS unidades_vendidas
    FROM envios e
    JOIN seriales s ON e.numero_pedido = s.numero_pedido
    WHERE e.estado = 'enviado'
      AND e.fecha_envio BETWEEN ? AND ?
    GROUP BY s.producto_id, DATE(e.fecha_envio)
),
promedios AS (
    SELECT 
        producto_id,
        ROUND(AVG(unidades_vendidas), 2) AS promedio_diario,
        ROUND(AVG(unidades_vendidas) * 7, 2) AS estimado_semanal,
        COUNT(DISTINCT fecha) AS dias_con_ventas
    FROM ventas_diarias
    GROUP BY producto_id
),
stock_actual AS (
    SELECT 
        s.producto_id,
        COUNT(s.id) AS disponibles
    FROM seriales s
    WHERE s.estado = 'disponible'
    GROUP BY s.producto_id
)
SELECT 
    p.id AS producto_id,
    p.nombre AS producto,
    COALESCE(sa.disponibles, 0) AS stock_disponible,
    COALESCE(pr.promedio_diario, 0) AS promedio_diario,
    COALESCE(pr.estimado_semanal, 0) AS estimado_semanal,
    COALESCE(pr.dias_con_ventas, 0) AS dias_con_ventas,
    -- Días de cobertura = stock / promedio_diario
    CASE 
        WHEN COALESCE(pr.promedio_diario, 0) > 0 
        THEN ROUND(COALESCE(sa.disponibles, 0) / pr.promedio_diario, 1)
        ELSE NULL
    END AS dias_cobertura,
    CASE 
        WHEN COALESCE(pr.promedio_diario, 0) = 0 THEN 'Sin ventas en período'
        WHEN COALESCE(sa.disponibles, 0) / COALESCE(pr.promedio_diario, 1) < 1 
            THEN 'CRÍTICO: Stock para menos de 1 día'
        WHEN COALESCE(sa.disponibles, 0) / COALESCE(pr.promedio_diario, 1) < 7 
            THEN 'ALERTA: Stock para menos de 1 semana'
        WHEN COALESCE(sa.disponibles, 0) / COALESCE(pr.promedio_diario, 1) < 14 
            THEN 'PRECAUCIÓN: Stock para menos de 2 semanas'
        ELSE 'Stock suficiente'
    END AS estado_stock
FROM productos p
LEFT JOIN stock_actual sa ON p.id = sa.producto_id
LEFT JOIN promedios pr ON p.id = pr.producto_id
ORDER BY dias_cobertura ASC NULLS LAST, pr.promedio_diario DESC;

    `;

    // Ejecutar consulta con los parámetros de fecha
    const [rows] = await db.query(query, [fechaInicio, fechaFin, fechaInicio, fechaFin]);

    console.log(`✅ Consulta completada. Registros obtenidos: ${rows.length}`);
    return rows;

  } catch (error) {
    console.error('❌ Error en getEstadoStockProductos:', error.message);
    throw new Error('Error al obtener estado de stock: ' + error.message);
  }
};

/*
const verificarStockProductos = async (productosProcesados) => {
  console.log("📦 Iniciando verificación de stock para productos del pedido...");
  
  try {
    if (!Array.isArray(productosProcesados) || productosProcesados.length === 0) {
      console.warn("⚠️ No se recibieron productos para verificar stock.");
      return [];
    }

    // 1️⃣ Extraer IDs únicos de producto
    const productoIds = [
      ...new Set(productosProcesados.map(p => p.producto_id))
    ];

    console.log(`🧮 Productos a verificar: ${productoIds.join(", ")}`);

    // 2️⃣ Definir rango de fechas para calcular consumo promedio (últimos 30 días)
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaFin.getDate() - 30);

    // 3️⃣ Consulta SQL principal
    const query = `
      WITH promedio_diario AS (
        SELECT 
            sub.producto_id,
            ROUND(AVG(sub.total_vendidos), 2) AS promedio_diario
        FROM (
            SELECT 
                DATE(e.fecha_envio) AS fecha,
                s.producto_id,
                COUNT(s.id) AS total_vendidos
            FROM envios e
            JOIN seriales s ON e.numero_pedido = s.numero_pedido
            WHERE e.estado = 'enviado'
              AND s.producto_id IN (?)
              AND e.fecha_envio BETWEEN ? AND ?
            GROUP BY DATE(e.fecha_envio), s.producto_id
        ) AS sub
        GROUP BY sub.producto_id
      ),
      stock_actual AS (
        SELECT 
            s.producto_id,
            COUNT(s.id) AS stock_actual
        FROM seriales s
        WHERE s.estado = 'disponible'
          AND s.producto_id IN (?)
        GROUP BY s.producto_id
      )
      SELECT 
          p.id AS producto_id,
          p.nombre AS nombre_producto,
          COALESCE(sa.stock_actual, 0) AS stock_actual,
          COALESCE(pd.promedio_diario, 0) AS promedio_diario
      FROM productos p
      LEFT JOIN stock_actual sa ON p.id = sa.producto_id
      LEFT JOIN promedio_diario pd ON p.id = pd.producto_id
      WHERE p.id IN (?)
    `;

    const [rows] = await db.query(query, [
      productoIds,
      fechaInicio,
      fechaFin,
      productoIds,
      productoIds
    ]);

    console.log(`✅ Verificación completada. Productos analizados: ${rows.length}`);

    // 4️⃣ Calcular porcentajes y clasificar estado
    const resultados = rows.map(row => {
      const promedio = row.promedio_diario || 0;
      const stock = row.stock_actual || 0;

      let porcentaje_stock = 0;
      if (promedio > 0) {
        porcentaje_stock = (stock / promedio) * 100;
      } else {
        porcentaje_stock = 100; // sin histórico → se asume stock óptimo
      }

      let estado_stock = "optimo";
      if (porcentaje_stock < 20) {
        estado_stock = "critico";
      } else if (porcentaje_stock < 50 && porcentaje_stock >= 30) {
        estado_stock = "advertencia";
      } else if (porcentaje_stock < 30) {
        estado_stock = "bajo";
      }

      return {
        producto_id: row.producto_id,
        nombre_producto: row.nombre_producto,
        stock_actual: stock,
        promedio_diario: promedio,
        porcentaje_stock: Number(porcentaje_stock.toFixed(2)),
        estado_stock
      };
    });

    // 5️⃣ Logs de resumen
    const criticos = resultados.filter(r => r.estado_stock === "critico").length;
    const advertencias = resultados.filter(r => r.estado_stock === "advertencia").length;
    console.log(`📊 Resumen: ${criticos} críticos | ${advertencias} advertencias`);

    return resultados;

  } catch (error) {
    console.error("❌ Error en verificarStockProductos:", error);
    throw new Error("Error al verificar stock de productos: " + error.message);
  }
};*/

/**
 * Verifica el stock de productos específicos (por ejemplo, los de un pedido),
 * evalúa su nivel en base al promedio diario de ventas,
 * y genera alertas en caso de advertencia o nivel crítico.
 */
// models/informeModel.js
const obtenerEstadoAlertaStock = async () => {
  const query = `
    SELECT activo
    FROM alertas_control
    ORDER BY id DESC
    LIMIT 1
  `;

  const [rows] = await db.query(query);

  // Si no hay filas, asumimos desactivado por seguridad
  if (rows.length === 0) return false;

  return Boolean(rows[0].activo);
};
const obtenerPatronHorario = async (productoIds) => {
  console.log("📊 Analizando patrón horario (1 mes)...");

  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setMonth(fechaFin.getMonth() - 1);

  const query = `
    SELECT 
        p.nombre AS nombre_producto,
        sub.producto_id,
        sub.rango_horario,
        ROUND(AVG(sub.total_vendidos), 2) AS promedio_vendidos,
        (
          SELECT COUNT(*) 
          FROM seriales s2
          WHERE s2.producto_id = sub.producto_id
            AND s2.estado = 'disponible'
        ) AS stock_actual
    FROM (
        SELECT 
            s.producto_id,
            CASE 
                WHEN HOUR(e.fecha_envio) BETWEEN 0 AND 5 THEN 'madrugada'
                WHEN HOUR(e.fecha_envio) BETWEEN 6 AND 11 THEN 'mañana'
                WHEN HOUR(e.fecha_envio) BETWEEN 12 AND 17 THEN 'tarde'
                ELSE 'noche'
            END AS rango_horario,
            COUNT(s.id) AS total_vendidos
        FROM envios e
        JOIN seriales s 
            ON e.numero_pedido = s.numero_pedido
        WHERE e.estado = 'enviado'
          AND e.fecha_envio BETWEEN ? AND ?
          AND s.producto_id IN (?)
        GROUP BY 
            s.producto_id, 
            rango_horario, 
            DATE(e.fecha_envio)
    ) AS sub
    JOIN productos p ON p.id = sub.producto_id
    GROUP BY 
        sub.producto_id, 
        sub.rango_horario
    ORDER BY 
        sub.producto_id,
        FIELD(sub.rango_horario, 'madrugada', 'mañana', 'tarde', 'noche');
  `;

  const [rows] = await db.query(query, [
    fechaInicio,
    fechaFin,
    productoIds
  ]);

  console.log(`✅ Patrón horario generado (${rows.length} registros).`);
  return rows;
};



const verificarStockProductos = async (productos) => {
  console.log("📦 Iniciando verificación de stock de productos...");

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new Error('Debe proporcionar una lista de productos para verificar el stock.');
  }

  // 🔹 Definir fechas internas (últimos 30 días)
  const fechaFin = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaFin.getDate() - 30);

  const productoIds = productos.map(p => p.producto_id);

  try {
    // 🔹 Consulta principal
    const query = `
      WITH promedio_diario AS (
          SELECT 
              sub.producto_id,
              ROUND(AVG(sub.total_vendidos), 2) AS promedio_diario
          FROM (
              SELECT 
                  DATE(e.fecha_envio) AS fecha,
                  s.producto_id,
                  COUNT(s.id) AS total_vendidos
              FROM envios e
              JOIN seriales s 
                  ON e.numero_pedido = s.numero_pedido
              WHERE e.estado = 'enviado'
                AND e.fecha_envio BETWEEN ? AND ?
                AND s.producto_id IN (?)
              GROUP BY DATE(e.fecha_envio), s.producto_id
          ) AS sub
          GROUP BY sub.producto_id
      ),
      stock_actual AS (
          SELECT 
              s.producto_id,
              COUNT(s.id) AS disponibles
          FROM seriales s
          WHERE s.estado = 'disponible'
            AND s.producto_id IN (?)
          GROUP BY s.producto_id
      )
      SELECT 
          p.id AS producto_id,
          p.nombre AS producto,
          COALESCE(sa.disponibles, 0) AS stock_disponible,
          COALESCE(pd.promedio_diario, 0) AS promedio_diario,
          CASE
              WHEN COALESCE(sa.disponibles, 0) <= (0.2 * COALESCE(pd.promedio_diario, 0)) THEN 'Crítico'
              WHEN COALESCE(sa.disponibles, 0) <= (0.3 * COALESCE(pd.promedio_diario, 0)) THEN 'Advertencia'
              WHEN COALESCE(sa.disponibles, 0) > (0.5 * COALESCE(pd.promedio_diario, 0)) THEN 'Óptimo'
              ELSE 'Aceptable'
          END AS estado_stock
      FROM productos p
      LEFT JOIN stock_actual sa ON p.id = sa.producto_id
      LEFT JOIN promedio_diario pd ON p.id = pd.producto_id
      WHERE p.id IN (?)
      ORDER BY p.id;
    `;

    const [rows] = await db.query(query, [
      fechaInicio,
      fechaFin,
      productoIds,
      productoIds,
      productoIds
    ]);

    console.log(`✅ Verificación completada. ${rows.length} productos analizados.`);

    // ⚙️ Solo devolvemos los resultados, sin encolar nada
    return rows;

  } catch (error) {
    console.error('❌ Error en verificarStockProductos:', error.message);
    throw new Error('Error al verificar el stock de productos: ' + error.message);
  }
};






module.exports = { 
  getInformeLicenciasOriginales,
  getInformeLicenciasPorMes,
  getInformeLicenciasPorRango,
  getInformePorRango, 
  getInformePedidosDetalladoJejePorRango,
  getInformePedidosTotalesJejePorRango,
  getProductosVendidosPorRango,
  getEstadoStockProductos,
  verificarStockProductos,
  obtenerPatronHorario,
  obtenerEstadoAlertaStock 
};
