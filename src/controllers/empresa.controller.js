const Empresa = require('../models/empresa.model');

// Obtener todos los productos asociados a una empresa específica
exports.getProductosPorEmpresa = async (req, res) => {
  console.log('🔍 Obteniendo productos para la empresa con ID: %s', req.params.empresaId);
  const empresaId = req.params.empresaId;

  try {
    const productos = await Empresa.getProductosPorEmpresa(empresaId);

    res.status(200).json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos por empresa:', error.message);
    res.status(500).json({ error: 'Error al obtener productos por empresa' });
  }
};

// Obtener todas las empresas
exports.getEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.getAllEmpresas();
    res.json(empresas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
};

// Obtener una empresa por ID
exports.getEmpresaById = async (req, res) => {
  try {
    const { id } = req.params;
    const empresa = await Empresa.getEmpresaById(id);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar empresa' });
  }
};

exports.createEmpresa = async (req, res) => {
  try {
    const {
      nombre,
      dominio_web,
      email_contacto,
      logo_url,
      idioma,
      horario_envio,
      metodo_integracion
    } = req.body;

    // Validaciones básicas
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El nombre es requerido y debe ser un texto' });
    }

    if (!email_contacto || !/^[\w.-]+@[\w.-]+\.\w+$/.test(email_contacto)) {
      return res.status(400).json({ error: 'Email de contacto inválido' });
    }

    const metodosPermitidos = ['webhook', 'api', 'woocommerce'];
    if (!metodosPermitidos.includes(metodo_integracion)) {
      return res.status(400).json({ error: `Método de integración inválido. Permitidos: ${metodosPermitidos.join(', ')}` });
    }

    // Agrega aquí más validaciones si quieres ser más estricto (idioma, horario_envio, etc.)

    // Construir objeto limpio
    const nuevaEmpresa = {
      nombre,
      dominio_web,
      email_contacto,
      logo_url: logo_url || '',
      idioma: idioma || 'es',
      horario_envio: horario_envio || '08:00-22:00',
      metodo_integracion,
    };

    const id = await Empresa.createEmpresa(nuevaEmpresa);
    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error en createEmpresa:', error);
    res.status(500).json({ error: 'Error al crear empresa' });
  }
};


// Actualizar una empresa existente
exports.updateEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    const result = await Empresa.updateEmpresa(id, datosActualizados);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ mensaje: 'Empresa actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
};

// Eliminar una empresa
exports.deleteEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Empresa.deleteEmpresa(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ mensaje: 'Empresa eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
};

exports.asignarUsuarioAEmpresa = async (req, res) => {
  try {
    const { usuario_id, empresa_id } = req.body;

    console.log('🧩 Datos recibidos en body:', { usuario_id, empresa_id });

    if (!usuario_id || !empresa_id) {
      console.warn('⚠️ Faltan usuario_id o empresa_id');
      return res.status(400).json({ error: 'usuario_id y empresa_id son requeridos' });
    }

    console.log('📡 Ejecutando inserción en usuarios_empresa...');
    const insertId = await Empresa.asignarUsuarioAEmpresa({ usuario_id, empresa_id });
    
    console.log('✅ Inserción completada con ID:', insertId);
    res.status(201).json({ mensaje: 'Usuario asignado a empresa exitosamente', id: insertId });
  } catch (error) {
    console.error('❌ Error en asignarUsuarioAEmpresa:', error);
    res.status(500).json({ error: 'Error al asignar usuario a empresa' });
  }
};

exports.desasignarUsuarioDeEmpresa = async (req, res) => {
  try {
    const { usuario_id, empresa_id } = req.body;

    if (!usuario_id || !empresa_id) {
      return res.status(400).json({ error: 'usuario_id y empresa_id son requeridos' });
    }

    const result = await Empresa.desasignarUsuarioDeEmpresa({ usuario_id, empresa_id });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontró asignación para eliminar' });
    }

    res.json({ mensaje: 'Usuario desasignado de la empresa exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desasignar usuario de empresa' });
  }
};

// Obtener empresa_id a partir del usuario_id
exports.getEmpresaPorUsuario = async (req, res) => {
  const usuarioId = req.params.usuarioId;

  try {
    const empresaId = await Empresa.getEmpresaPorUsuario(usuarioId);

    if (empresaId !== null) {
      res.status(200).json({ empresa_id: empresaId });
    } else {
      res.status(404).json({ message: 'El usuario no está asignado a ninguna empresa' });
    }
  } catch (error) {
    console.error('❌ Error en getEmpresaPorUsuario:', error.message);
    res.status(500).json({ error: 'Error al obtener empresa del usuario' });
  }
};

exports.getUsuariosPorEmpresa = async (req, res) => {
  const empresaId = req.params.empresaId;
  console.log('🔍 Obteniendo usuarios para la empresa con ID:', empresaId);
  try {
    const usuarios = await Empresa.getUsuariosPorEmpresa(empresaId);

    if (usuarios && usuarios.length > 0) {
      res.status(200).json({ usuarios });
    } else {
      res.status(404).json({ message: 'No se encontraron usuarios para esta empresa' });
    }
  } catch (error) {
    console.error('❌ Error en getUsuariosPorEmpresa:', error.message);
    res.status(500).json({ error: 'Error al obtener usuarios de la empresa' });
  }
};


exports.asignarProductoAEmpresa = async (req, res) => {
  try {
    const { empresa_id, producto_id, precio, stock } = req.body;

    // Validaciones básicas
    if (!empresa_id || !producto_id) {
      return res.status(400).json({ error: 'empresa_id y producto_id son obligatorios' });
    }

    if (precio == null || isNaN(precio)) {
      return res.status(400).json({ error: 'precio debe ser un número válido' });
    }

    if (stock == null || !Number.isInteger(stock)) {
      return res.status(400).json({ error: 'stock debe ser un número entero válido' });
    }

    const insertId = await Empresa.asignarProductoAEmpresa({
      empresa_id,
      producto_id,
      precio,
      stock,
    });

    res.status(201).json({ message: 'Producto asignado exitosamente', id: insertId });
  } catch (error) {
    console.error('❌ Error al asignar producto a empresa:', error.message);
    res.status(500).json({ error: 'Error al asignar producto a empresa' });
  }
};

exports.getEmpresaYUsuarioByWooConfigId = async (req, res) => {
  try {
    const configId = req.params.configId;

    const resultado = await Empresa.getEmpresaYUsuarioByWooConfigId(configId);

    if (!resultado) {
      return res.status(404).json({ error: 'No se encontró ninguna empresa asociada al ID de configuración proporcionado.' });
    }

    res.json({
      empresa: {
        id: resultado.id,
        nombre: resultado.nombre,
        dominio_web: resultado.dominio_web,
        email_contacto: resultado.email_contacto
      },
      usuario_id: resultado.usuario_id || null, // Puede no existir
    });
  } catch (error) {
    console.error('Error al obtener empresa y usuario:', error);
    res.status(500).json({ error: 'Error al obtener empresa y usuario' });
  }
};
