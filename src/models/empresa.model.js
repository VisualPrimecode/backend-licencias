const db = require('../config/db');


// Obtener todas las empresas
const getAllEmpresas = async () => {
  const [rows] = await db.query('SELECT * FROM empresas');
  return rows;
};

// Crear una nueva empresa
const createEmpresa = async ({
  nombre,
  dominio_web,
  email_contacto,
  logo_url,
  idioma,
  horario_envio,
  metodo_integracion,
}) => {
  const [result] = await db.query(
    `INSERT INTO empresas 
      (nombre, dominio_web, email_contacto, logo_url, idioma, horario_envio, metodo_integracion, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [nombre, dominio_web, email_contacto, logo_url, idioma, horario_envio, metodo_integracion]
  );

  return result.insertId;
};

// Buscar una empresa por ID
const getEmpresaById = async (id) => {
  const [rows] = await db.query('SELECT * FROM empresas WHERE id = ?', [id]);
  return rows[0];
};

// Actualizar una empresa
const updateEmpresa = async (id, datos) => {
  const campos = [];
  const valores = [];

  for (const [clave, valor] of Object.entries(datos)) {
    campos.push(`${clave} = ?`);
    valores.push(valor);
  }

  if (campos.length === 0) {
    throw new Error('No se proporcionaron datos para actualizar.');
  }

  valores.push(id);
  const sql = `UPDATE empresas SET ${campos.join(', ')} WHERE id = ?`;
  const [result] = await db.query(sql, valores);
  return result;
};

// Eliminar una empresa
const deleteEmpresa = async (id) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Eliminar registros en tablas relacionadas
    await connection.query('DELETE FROM configuraciones_empresa WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM envios WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM plantillas_envio WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM producto_empresas WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM usuarios_empresas WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM webhooks_logs WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM woo_product_mappings WHERE empresa_id = ?', [id]);
    await connection.query('DELETE FROM woocommerce_api_config WHERE empresa_id = ?', [id]);

    // Eliminar empresa
    await connection.query('DELETE FROM empresas WHERE id = ?', [id]);

    await connection.commit();
    connection.release();
    return { success: true, message: 'Empresa eliminada correctamente' };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw new Error('Error al eliminar empresa: ' + error.message);
  }
};



// Asignar un usuario a una empresa
const asignarUsuarioAEmpresa = async ({ usuario_id, empresa_id }) => {
  const [result] = await db.query(
    'INSERT INTO usuarios_empresas (usuario_id, empresa_id) VALUES (?, ?)',
    [usuario_id, empresa_id]
  );
  return result.insertId;
};
// Desasignar un usuario de una empresa
const desasignarUsuarioDeEmpresa = async ({ usuario_id, empresa_id }) => {
  const [result] = await db.query(
    'DELETE FROM usuarios_empresas WHERE usuario_id = ? AND empresa_id = ?',
    [usuario_id, empresa_id]
  );
  return result;
};
const getEmpresaPorUsuario = async (usuarioId) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios_empresas ue JOIN empresas e ON ue.empresa_id = e.id WHERE ue.usuario_id = ?',
      [usuarioId]
    );

    return rows; // Devuelve un arreglo de empresas
  } catch (error) {
    throw new Error('Error al obtener empresas del usuario: ' + error.message);
  }
};
const getUsuariosPorEmpresa = async (empresaId) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id as usuario_id, u.nombre as nombre_usuario, u.email, u.rol
       FROM usuarios_empresas ue
       JOIN usuarios u ON ue.usuario_id = u.id
       WHERE ue.empresa_id = ?`,
      [empresaId]
    );

    return rows; // Devuelve un arreglo de usuarios asociados a la empresa
  } catch (error) {
    throw new Error('Error al obtener usuarios de la empresa: ' + error.message);
  }
};



// Obtener todos los productos asociados a una empresa
const getProductosPorEmpresa = async (empresaId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         p.id, 
         p.nombre, 
         p.categoria, 
         p.subcategoria, 
         p.tipo_licencia, 
         p.requiere_online, 
         pe.precio, 
         pe.stock
       FROM productos p
       INNER JOIN producto_empresas pe ON p.id = pe.producto_id
       WHERE pe.empresa_id = ?`,
      [empresaId]
    );
    return rows;
  } catch (error) {
    throw new Error('Error al obtener productos por empresa: ' + error.message);
  }
};
// Asignar un producto a una empresa
// Asignar un producto a una empresa
const asignarProductoAEmpresa = async ({ empresa_id, producto_id, precio, stock }) => {
  try {
    const [result] = await db.query(
      `INSERT INTO producto_empresas (empresa_id, producto_id, precio, stock)
       VALUES (?, ?, ?, ?)`,
      [empresa_id, producto_id, precio, stock]
    );
    return result.insertId;
  } catch (error) {
    throw new Error('Error al asignar producto a empresa: ' + error.message);
  }
};
// Obtener empresa y primer usuario por ID config WooCommerce
const getEmpresaYUsuarioByWooConfigId = async (configId) => {
  const [rows] = await db.query(
    `
    SELECT e.*, ue.usuario_id
    FROM woocommerce_api_config w
    INNER JOIN empresas e ON w.empresa_id = e.id
    LEFT JOIN usuarios_empresas ue ON e.id = ue.empresa_id
    WHERE w.id = ?
    LIMIT 1
    `,
    [configId]
  );
  return rows[0]; // asumimos que solo nos interesa el primero
};


module.exports = {
  getAllEmpresas,
  createEmpresa,
  getEmpresaById,
  updateEmpresa,
  deleteEmpresa,
  asignarUsuarioAEmpresa,
  desasignarUsuarioDeEmpresa,
  getEmpresaPorUsuario,
  getProductosPorEmpresa,
  asignarProductoAEmpresa,
  getUsuariosPorEmpresa,
  getEmpresaYUsuarioByWooConfigId
};