const db = require('../config/db');

// Obtener todos los seriales
const getAllSeriales = async () => {
  const [rows] = await db.query('SELECT * FROM seriales ORDER BY id DESC');
  return rows;
};


// Obtener un serial por ID
const getSerialById = async (id) => {
  const [rows] = await db.query('SELECT * FROM seriales WHERE id = ?', [id]);
  return rows[0];
};
const getSerialesByNumeroPedido = async (id) => {
  const [rows] = await db.query('SELECT * FROM seriales WHERE numero_pedido = ?', [id]);
  return rows;
};

// Crear un nuevo serial
const createSerial = async ({
  codigo,
  producto_id,
  estado = 'disponible',
  observaciones,
  usuario_id,
  woocommerce_id // 👈 nuevo campo
}) => {
  const [result] = await db.query(
    `INSERT INTO seriales (codigo, producto_id, estado, observaciones, usuario_id, woocommerce_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [codigo, producto_id, estado, observaciones, usuario_id, woocommerce_id]
  );
  return result.insertId;
};


// Actualizar un serial
const updateSerial = async (id, {
  codigo,
  producto_id,
  estado,
  observaciones,
  usuario_id
}) => {
  const [result] = await db.query(
    `UPDATE seriales
     SET codigo = ?, producto_id = ?, estado = ?, observaciones = ?, usuario_id = ?
     WHERE id = ?`,
    [codigo, producto_id, estado, observaciones, usuario_id, id]
  );
  return result;
};

const updateSerialEstado = async (id, {
  estado,observaciones,numero_pedido, numero_envio, usuario_id
}) => {
  const [result] = await db.query(
    `UPDATE seriales
     SET estado = ?, observaciones = ?, numero_pedido = ?, numero_envio = ?, usuario_id = ?
     WHERE id = ?`,
    [estado,observaciones, numero_pedido, numero_envio, usuario_id, id]
  );
  return result;
};
const updateSerial2 = async (
  id,
  {
    codigo,
    producto_id,
    estado,
    observaciones,
    usuario_id,
    woocommerce_id,
    numero_pedido // 👈 nuevo campo
  }
) => {
  console.log("Actualizando serial con ID:", id);
  console.log("Datos a actualizar:", codigo, producto_id, estado, observaciones, usuario_id, woocommerce_id, numero_pedido);
  console.log("typeof woocommerce_id:", typeof woocommerce_id, "valor:", woocommerce_id);
  console.log("typeof id:", typeof id, "valor:", id);

  const [result] = await db.query(
    `UPDATE seriales
     SET codigo = ?,
         producto_id = ?, 
         estado = ?, 
         observaciones = ?, 
         usuario_id = ?, 
         woocommerce_id = ?,
         numero_pedido = ?      -- 👈 nuevo campo en la BD
     WHERE id = ?`,
    [
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id,
      woocommerce_id,
      numero_pedido, // 👈 en la query
      Number(id)     // 👈 forzamos a number
    ]
  );

  return result;
};

// Eliminar un serial
const deleteSerial = async (id) => {
  console.log("Eliminando serial con ID:", id);
  const [result] = await db.query('DELETE FROM seriales WHERE id = ?', [id]);
  return result;
};/*
const precargarWooIdsPorEmpresa = async () => {
  // 1. Obtener todas las empresas
  const [empresas] = await db.query('SELECT id, nombre FROM empresas');

  // 2. Obtener todas las configuraciones WooCommerce
  const [configs] = await db.query(
    'SELECT empresa_id, woocommerce_id FROM woocommerce_api_config ORDER BY id ASC'
  );

  // 3. Construir el mapa en memoria
  const empresaWooMap = {};
  for (const empresa of empresas) {
    // Busca la primera config asociada
    const config = configs.find(cfg => cfg.empresa_id === empresa.id);
    if (config) {
      empresaWooMap[empresa.nombre] = config.woocommerce_id;
    }
  }

  return empresaWooMap;
};*/

const precargarWooIdsPorEmpresa = async () => {
  // Trae todas las empresas con su configuración
  const [rows] = await db.query(`
    SELECT e.nombre, c.id AS config_id
    FROM empresas e
    JOIN woocommerce_api_config c ON c.empresa_id = e.id
    ORDER BY c.id ASC
  `);

  const empresaWooMap = {};
  for (const row of rows) {
    // Si hay varias configs por empresa, nos quedamos con la primera
    if (!empresaWooMap[row.nombre]) {
      empresaWooMap[row.nombre] = row.config_id;
    }
  }

  return empresaWooMap;
};


const insertarSerialesMasivos = async (seriales) => {
  try {
   const valores = seriales.map(serial => [
  serial.codigo,
  serial.id_serial || null,         // segundo campo
  serial.producto_id || null,       // tercero
  serial.estado || 'disponible',    // cuarto
  serial.observaciones || null,     // quinto
  serial.usuario_id || null,        // sexto
  serial.woocommerce_id || null     // séptimo
]);


    const [result] = await db.query(
      `INSERT INTO seriales (codigo, id_serial, producto_id, estado, observaciones, usuario_id, woocommerce_id)
       VALUES ?`,
      [valores]
    );

    return result;
  } catch (err) {
    console.error('❌ Error al insertar seriales masivos:', err);
    throw err;
  }
};
/*
// Obtener un serial disponible por producto y woocommerce
const obtenerSerialDisponible = async (producto_id, woocommerce_id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Seleccionar el primer serial disponible y bloquearlo
    const [rows] = await connection.query(
      `SELECT id, codigo
       FROM seriales
       WHERE producto_id = ?
         AND woocommerce_id = ?
         AND estado = 'disponible'
       ORDER BY fecha_ingreso ASC
       LIMIT 1
       FOR UPDATE`,
      [producto_id, woocommerce_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return undefined; // No hay serial disponible
    }

    const serial = rows[0];
        await connection.commit();

    

    return serial; // Retorna el serial ya reservado
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};*/
// Obtener varios seriales disponibles y marcarlos como reservados
const obtenerSerialesDisponibles = async (producto_id, woocommerce_id, cantidad, numero_pedido) => {
  const connection = await db.getConnection();
  console.log("entro a obtener seriales");
  try {
    await connection.beginTransaction();

    // 1. Seleccionar N seriales disponibles y bloquearlos
    const [rows] = await connection.query(
      `SELECT id, codigo
       FROM seriales
       WHERE producto_id = ?
         AND woocommerce_id = ?
         AND estado = 'disponible'
       ORDER BY fecha_ingreso ASC
       LIMIT ?
       FOR UPDATE`,
      [producto_id, woocommerce_id, cantidad]
    );
    console.log("numero de registros", rows.length);

    if (rows.length < cantidad) {
      await connection.rollback();
      return undefined; // No hay suficientes seriales
    }

    const idsSeriales = rows.map(s => s.id);
    console.log("IDs seleccionados:", idsSeriales);

    // 2. Actualizar estado inmediatamente a 'asignado' y guardar numero_pedido
    await connection.query(
      `UPDATE seriales
       SET estado = 'asignado',
           observaciones = ?,
           numero_pedido = ?
       WHERE id IN (?)`,
      [`Reservado para pedido ${numero_pedido}`, numero_pedido, idsSeriales]
    );

    await connection.commit();

    return rows; // Devuelve los seriales ya reservados

  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y reservar seriales: ' + error.message);
  } finally {
    connection.release();
  }
};



const obtenerSerialDisponible2 = async (producto_id, woocommerce_id, numero_pedido) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Seleccionar el primer serial disponible y bloquearlo
    const [rows] = await connection.query(
      `SELECT id, codigo
       FROM seriales
       WHERE producto_id = ?
         AND estado = 'disponible'
       ORDER BY fecha_ingreso ASC
       LIMIT 1
       FOR UPDATE`,
      [producto_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return undefined; // No hay serial disponible
    }

    const serial = rows[0];

    // 2. Marcar como asignado y actualizar el número de pedido y woocommerce_id
    await connection.query(
      `UPDATE seriales
       SET estado = 'asignado',
           numero_pedido = ?,
           woocommerce_id = ?
       WHERE id = ?`,
      [numero_pedido, woocommerce_id, serial.id]
    );

    // 3. Confirmar la transacción
    await connection.commit();

    // 4. Retornar el serial ya reservado con su número de pedido
    return {
      ...serial,
      estado: 'asignado',
      numero_pedido,
      woocommerce_id
    };
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};


// models/serialesModel.js

const getSerialesByWooData = async (woocommerceId, wooProductId, cantidad) => {
  console.log("Obteniendo seriales por datos de WooCommerce:", woocommerceId, wooProductId, cantidad);
  try {
    // 1. Buscar el producto interno en el mapeo
    const [productoMap] = await db.query(
      `SELECT producto_interno_id 
       FROM woo_product_mappings 
       WHERE woocommerce_id = ? AND woo_product_id = ? 
       LIMIT 1`,
      [woocommerceId, wooProductId]
    );

    if (productoMap.length === 0) {
      return { error: true, message: "No se encontró producto mapeado" };
    }

    const productoInternoId = productoMap[0].producto_interno_id;

    // 2. Buscar seriales disponibles asociados a ese producto
    const [seriales] = await db.query(
  `SELECT id, producto_id, codigo 
   FROM seriales 
   WHERE producto_id = ? AND estado = 'disponible' 
   ORDER BY fecha_ingreso ASC 
   LIMIT ?`,
  [productoInternoId, cantidad]
);

    /*
    const [seriales] = await db.query(
      `SELECT id, codigo 
       FROM seriales 
       WHERE producto_id = ? AND estado = 'disponible' 
       ORDER BY fecha_ingreso ASC 
       LIMIT ?`,
      [productoInternoId, cantidad]
    );
*/
    return { error: false, seriales };
  } catch (err) {
    console.error("Error en getSerialesByWooData:", err);
    throw err;
  }
};
const getSerialesPaginated = async (limit, offset) => {
  const [rows] = await db.query(
    'SELECT * FROM seriales ORDER BY id DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows;
};
const searchSeriales = async (filters) => {
  let baseQuery = 'SELECT * FROM seriales WHERE 1=1';
  const values = [];

  // 🔹 Filtro por código (LIKE)
  if (filters.codigo) {
    baseQuery += ' AND codigo LIKE ?';
    values.push(`%${filters.codigo}%`);
  }

  // 🔹 Filtro por estado
  if (filters.estado) {
    baseQuery += ' AND estado = ?';
    values.push(filters.estado);
  }

  // 🔹 Filtro por número de pedido
  if (filters.numeroPedido) {
    baseQuery += ' AND numero_pedido = ?';
    values.push(filters.numeroPedido);
  }

  
  // 🔹 Filtro por tienda (WooCommerce)
  if (filters.woocommerceId) {
    baseQuery += ' AND woocommerce_id = ?';
    values.push(filters.woocommerceId);
  }

  // 🔹 Filtro por producto interno
  if (filters.productoInternoId) {
    baseQuery += ' AND producto_id = ?';
    values.push(filters.productoInternoId);
  }

  // 🔹 Orden final
  baseQuery += ' ORDER BY id DESC';

  console.log('📝 Query generada:', baseQuery, values); // Debug

  const [rows] = await db.query(baseQuery, values);
  return rows;
};

module.exports = {
  getAllSeriales,
  getSerialById,
  createSerial,
  updateSerial,
    updateSerial2,
getSerialesByNumeroPedido,
  deleteSerial,
  insertarSerialesMasivos,
  obtenerSerialesDisponibles,
    obtenerSerialDisponible2,
    precargarWooIdsPorEmpresa,
    getSerialesByWooData,
    updateSerialEstado,
    searchSeriales,
    getSerialesPaginated
};
