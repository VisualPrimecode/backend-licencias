const db = require('../config/db');

// Obtener todos los seriales
const getAllSeriales = async () => {
  const [rows] = await db.query('SELECT * FROM seriales ORDER BY id DESC');
  return rows;
};

const getSerialesPaginated = async (limit, offset) => {
  const [rows] = await db.query(
    'SELECT * FROM seriales ORDER BY id DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
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

const updateSerial2 = async (id, {
  codigo,
  producto_id,
  estado,
  observaciones,
  usuario_id,
  woocommerce_id // 👈 nuevo campo
}) => {
  console.log("Actualizando serial con ID:", id);
  console.log("Datos a actualizar:",codigo, producto_id, estado, observaciones, usuario_id, woocommerce_id);
  console.log("typeof woocommerce_id:", typeof woocommerce_id, "valor:", woocommerce_id);
console.log("typeof id:", typeof id, "valor:", id);

 const [result] = await db.query(
  `UPDATE seriales
   SET codigo = ?,
       producto_id = ?, 
       estado = ?, 
       observaciones = ?, 
       usuario_id = ?, 
       woocommerce_id = ? 
   WHERE id = ?`,
  [
    codigo,
    producto_id,
    estado,
    observaciones,
    usuario_id,
    woocommerce_id,
    Number(id)   // 👈 forzamos a number
  ]
);

  return result;
};

// Eliminar un serial
const deleteSerial = async (id) => {
  console.log("Eliminando serial con ID:", id);
  const [result] = await db.query('DELETE FROM seriales WHERE id = ?', [id]);
  return result;
};

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
      `INSERT INTO serialesAux (codigo, id_serial, producto_id, estado, observaciones, usuario_id, woocommerce_id)
       VALUES ?`,
      [valores]
    );

    return result;
  } catch (err) {
    console.error('❌ Error al insertar seriales masivos:', err);
    throw err;
  }
};

// Obtener varios seriales disponibles y marcarlos como reservados
//version antigua que diferencia el stock de seriles por tiendas
/*
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
*/

//version nuevo que no diferencia el stock de seriles por tiendas, por el caso actual
//donde todas la tiendas del sistema companten stock de seriales
const obtenerSerialesDisponibles = async (producto_id, cantidad, numero_pedido) => {
  const connection = await db.getConnection();
  console.log("entro a obtener seriales");
  try {
    await connection.beginTransaction();

    // 1. Seleccionar N seriales disponibles (sin discriminar por tienda)
    const [rows] = await connection.query(
      `SELECT id, codigo
       FROM seriales
       WHERE producto_id = ?
         AND estado = 'disponible'
       ORDER BY fecha_ingreso ASC
       LIMIT ?
       FOR UPDATE`,
      [producto_id, cantidad]
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


//lo mismo que obtenerSerialesDisponibles, este es el metodo antiguo que discrimina el stock de seriales por tienda
//me parece que es para el envio automatico y el otro para el envio manual u viceversa

/*
const obtenerSerialDisponible2 = async (producto_id, woocommerce_id, numero_pedido) => {
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

    // 2. Marcar como asignado y guardar número de pedido
    await connection.query(
      `UPDATE seriales
       SET estado = 'asignado',
           numero_pedido = ?
       WHERE id = ?`,
      [numero_pedido, serial.id]
    );

    // 3. Confirmar la transacción
    await connection.commit();

    // 4. Retornar el serial ya reservado con su número de pedido
    return {
      ...serial
    };
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};*/
//una version que no discrima el stock de seriales por tienda
/*
const obtenerSerialDisponible2 = async (producto_id, numero_pedido) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Seleccionar el primer serial disponible (sin discriminar por tienda) y bloquearlo
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

    // 2. Marcar como asignado y guardar número de pedido
    await connection.query(
      `UPDATE seriales
       SET estado = 'asignado',
           numero_pedido = ?
       WHERE id = ?`,
      [numero_pedido, serial.id]
    );

    // 3. Confirmar la transacción
    await connection.commit();

    // 4. Retornar el serial ya reservado
    return {
      ...serial
    };
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};
*/
//nueva version no discrimina el stock de seriales por tienda y ademas trae el concepto de producto hermano
//que son productos que comparten el mismo tiopo de seriales

// models/serialesModel.js
const mapaEquivalencias = {
  // Claves: producto_id principal
  // Valores: array de producto_id equivalentes
  //caso Windows 11 y 10 pro
  336:[371],
371:[336],
//caso Windows 11 y 10 home

337:[338],
338:[337],
//caso office, Word,exel 2021
331:[400,391],
400:[331,391],
391:[400,331],
//caso mcafe antivirus pls, internet security y total protection
339:[340,341],
340:[339,341],
341:[340,339]
};

const obtenerSerialDisponible2 = async (producto_id, numero_pedido) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Función auxiliar para intentar obtener un serial
    const intentarObtener = async (pid) => {
      const [rows] = await connection.query(
        `SELECT id, codigo
         FROM seriales
         WHERE producto_id = ?
           AND estado = 'disponible'
         ORDER BY fecha_ingreso ASC
         LIMIT 1
         FOR UPDATE`,
        [pid]
      );
      return rows;
    };

    // 2. Intentar con el producto solicitado
    let rows = await intentarObtener(producto_id);

    // 3. Si no hay stock, revisar equivalencias
    if (rows.length === 0 && mapaEquivalencias[producto_id]) {
      for (const equivalente of mapaEquivalencias[producto_id]) {
        rows = await intentarObtener(equivalente);
        if (rows.length > 0) {
          producto_id = equivalente; // actualizar al producto que efectivamente se usó
          break;
        }
      }
    }

    if (rows.length === 0) {
      await connection.rollback();
      return undefined; // No hay serial disponible ni en equivalentes
    }

    const serial = rows[0];

    // 4. Marcar como asignado y guardar número de pedido
    await connection.query(
      `UPDATE seriales
       SET estado = 'asignado',
           numero_pedido = ?
       WHERE id = ?`,
      [numero_pedido, serial.id]
    );

    await connection.commit();

    return {
      ...serial,
      producto_id // retornamos el producto_id real de donde salió el serial
    };
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};

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
    return { error: false, seriales };
  } catch (err) {
    console.error("Error en getSerialesByWooData:", err);
    throw err;
  }
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
  getSerialesPaginated,
  searchSeriales
};
