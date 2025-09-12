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


module.exports = { 
  getInformeLicenciasOriginales,
  getInformeLicenciasPorMes,
  getInformeLicenciasPorRango,
  getInformePorRango, 
  getInformePedidosDetalladoJejePorRango,
  getInformePedidosTotalesJejePorRango 
};
