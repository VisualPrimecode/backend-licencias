const WooClientes = require('../models/wooClientes.model');

/**
 * Obtener clientes por tienda
 * GET /woo-clientes/:woo_config_id
 */
exports.getClientesPorTienda = async (req, res) => {
  console.log('📥 Entró en getClientesPorTienda');
  const { woo_config_id } = req.params;

  try {
    const clientes = await WooClientes.getClientesPorTienda(woo_config_id);
    res.json(clientes);
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

/**
 * Obtener cliente por ID
 * GET /woo-clientes/id/:id
 */
exports.getClienteById = async (req, res) => {
  const { id } = req.params;

  try {
    const cliente = await WooClientes.getClienteById(id);

    if (!cliente) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado'
      });
    }

    res.json(cliente);
  } catch (error) {
    console.error('❌ Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

/**
 * Obtener cliente por email y tienda
 * GET /woo-clientes/buscar?woo_config_id=1&email=test@email.com
 */
exports.getClienteByEmail = async (req, res) => {
  const { woo_config_id, email } = req.query;

  if (!woo_config_id || !email) {
    return res.status(400).json({
      error: 'woo_config_id y email son obligatorios'
    });
  }

  try {
    const cliente = await WooClientes.getClienteByEmail(
      woo_config_id,
      email
    );

    if (!cliente) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado'
      });
    }

    res.json(cliente);
  } catch (error) {
    console.error('❌ Error al obtener cliente por email:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

/**
 * Crear cliente
 * POST /woo-clientes
 */
exports.crearCliente = async (req, res) => {
  console.log('🆕 Entró en crearCliente');

  try {
    const id = await WooClientes.crearCliente(req.body);

    res.status(201).json({
      mensaje: 'Cliente creado correctamente',
      id
    });
  } catch (error) {
    // Duplicado por email + tienda
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El cliente ya existe para esta tienda'
      });
    }

    console.error('❌ Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

/**
 * Actualizar cliente
 * PATCH /woo-clientes/:id
 */
exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;

  try {
    await WooClientes.actualizarCliente(id, req.body);

    res.json({
      mensaje: 'Cliente actualizado correctamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};
exports.GuardarClientesDePedidosPorTienda = async (req, res) => {
  console.log('📊 Iniciando guardado de clientes desde pedidos');

  try {
    const { id } = req.params; // woo_config_id
    const { startDate, endDate } = req.query;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Falta el id de la tienda (woo_config_id)'
      });
    }

    // 👉 Ejecutar proceso principal
    const resultado = await WooClientes.guardarClientesDesdePedidos(
      Number(id),
      { startDate, endDate }
    );

    /**
     * resultado esperado desde el servicio:
     * {
     *   pedidosProcesados,
     *   clientesNuevos,
     *   clientesExistentes,
     *   pedidosOmitidos
     * }
     */

    res.json({
      ok: true,
      store_id: Number(id),
      range: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary: resultado
    });

  } catch (error) {
    console.error('💥 Error al guardar los clientes:', error);

    res.status(500).json({
      ok: false,
      error: 'Error al guardar los clientes desde pedidos'
    });
  }
};

exports.informeFrecuenciaClientes = async (req, res) => {
  console.log('📊 creando informe frecuencia clientes');

  try {
    const { id } = req.params; // woo_config_id
    const { startDate, endDate } = req.query;

    // Validar id de la tienda
    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Falta el id de la tienda (woo_config_id)'
      });
    }

    // Validar rango de fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        error: 'Debe indicar startDate y endDate'
      });
    }

    // Ejecutar servicio
    const resultado = await WooClientes.getInformeFrecuenciaCompra(
      Number(id),
      { startDate, endDate }
    );

    /**
     * resultado esperado desde el servicio:
     * {
     *   clientes_activos,
     *   clientes_nuevos,
     *   clientes_recurrentes,
     *   porcentaje_clientes_nuevos,
     *   porcentaje_clientes_recurrentes,
     *   promedio_compras_por_cliente
     * }
     */

    return res.json({
      ok: true,
      store_id: Number(id),
      range: {
        startDate,
        endDate
      },
      summary: resultado
    });

  } catch (error) {
    console.error('💥 Error al crear el informe de los clientes:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error al crear el informe de los clientes'
    });
  }
};
/*Por categoria */
exports.informeProductoEntrada = async (req, res) => {
  console.log('📊 creando informe frecuencia clientes');

  try {
    const { id } = req.params; // woo_config_id
    const { startDate, endDate } = req.query;

    // Validar id de la tienda
    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Falta el id de la tienda (woo_config_id)'
      });
    }

    // Validar rango de fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        error: 'Debe indicar startDate y endDate'
      });
    }

    // Ejecutar servicio
    const resultado = await WooClientes.getProductoEntradaClientesNuevos(
      Number(id),
      { startDate, endDate }
    );


    return res.json({
      ok: true,
      store_id: Number(id),
      range: {
        startDate,
        endDate
      },
      summary: resultado
    });

  } catch (error) {
    console.error('💥 Error al crear el informe de los clientes:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error al crear el informe de los clientes'
    });
  }
};
exports.informeProductoEntradaPorProducto = async (req, res) => {
  console.log('📊 creando informe frecuencia clientes');

  try {
    const { id } = req.params; // woo_config_id
    const { startDate, endDate } = req.query;

    // Validar id de la tienda
    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Falta el id de la tienda (woo_config_id)'
      });
    }

    // Validar rango de fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        error: 'Debe indicar startDate y endDate'
      });
    }

    // Ejecutar servicio
    const resultado = await WooClientes.getProductoEntradaPorProducto(
      Number(id),
      { startDate, endDate }
    );


    return res.json({
      ok: true,
      store_id: Number(id),
      range: {
        startDate,
        endDate
      },
      summary: resultado
    });

  } catch (error) {
    console.error('💥 Error al crear el informe de los clientes:', error);

    return res.status(500).json({
      ok: false,
      error: 'Error al crear el informe de los clientes'
    });
  }
};
exports.informeProductoEntradaGlobalPorProducto = async (req, res) => {
  console.log('📊 creando informe GLOBAL de producto de entrada');

  try {
    const { startDate, endDate } = req.query;

    // Validar rango de fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        error: 'Debe indicar startDate y endDate'
      });
    }

    // Ejecutar servicio GLOBAL
    const resultado =
      await WooClientes.getProductoEntradaGlobalPorProductoInterno({
        startDate,
        endDate
      });

    return res.json({
      ok: true,
      stores: [3, 4, 5],
      range: {
        startDate,
        endDate
      },
      summary: resultado
    });

  } catch (error) {
    console.error(
      '💥 Error al crear el informe GLOBAL de producto de entrada:',
      error
    );

    return res.status(500).json({
      ok: false,
      error: 'Error al crear el informe global de producto de entrada'
    });
  }
};

