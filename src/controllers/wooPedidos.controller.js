const WooPedidos = require('../models/wooPedidos.model');

/**
 * Obtener pedidos por tienda
 * GET /woo-pedidos/:woo_config_id
 */
exports.getPedidosPorTienda = async (req, res) => {
  console.log('📥 Entró en getPedidosPorTienda');
  const { woo_config_id } = req.params;

  try {
    const pedidos = await WooPedidos.getPedidosPorTienda(woo_config_id);
    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

/**
 * Obtener pedido por número y tienda
 * GET /woo-pedidos/:woo_config_id/:numero_pedido
 */
exports.getPedidoPorNumero = async (req, res) => {
  const { woo_config_id, numero_pedido } = req.params;

  try {
    const pedido = await WooPedidos.getPedidoPorNumero(
      numero_pedido,
      woo_config_id
    );

    if (!pedido) {
      return res.status(404).json({
        mensaje: 'Pedido no encontrado'
      });
    }

    res.json(pedido);
  } catch (error) {
    console.error('❌ Error al obtener pedido:', error);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
};

/**
 * Crear pedido
 * POST /woo-pedidos
 */
exports.crearPedido = async (req, res) => {
  console.log('🆕 Entró en crearPedido');

  try {
    const id = await WooPedidos.crearPedido(req.body);

    res.status(201).json({
      mensaje: 'Pedido creado correctamente',
      id
    });
  } catch (error) {
    // Duplicado (unique key)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El pedido ya existe para esta tienda'
      });
    }

    console.error('❌ Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

/**
 * Marcar pedido como enviado
 * PATCH /woo-pedidos/:id/enviado
 */
exports.marcarPedidoEnviado = async (req, res) => {
  const { id } = req.params;
  const { estado_envio } = req.body;

  try {
    await WooPedidos.marcarPedidoEnviado(id, estado_envio);

    res.json({
      mensaje: 'Pedido marcado como enviado'
    });
  } catch (error) {
    console.error('❌ Error al marcar pedido como enviado:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
};

/**
 * Registrar error de envío
 * PATCH /woo-pedidos/:id/error
 */
exports.registrarErrorEnvio = async (req, res) => {
  const { id } = req.params;
  const { error } = req.body;

  try {
    await WooPedidos.registrarErrorEnvio(id, error);

    res.json({
      mensaje: 'Error de envío registrado'
    });
  } catch (err) {
    console.error('❌ Error al registrar error de envío:', err);
    res.status(500).json({ error: 'Error al registrar error' });
  }
};

/**
 * Obtener pedidos pendientes de envío
 * GET /woo-pedidos-pendientes
 */
exports.getPedidosPendientes = async (req, res) => {
  try {
    const pedidos = await WooPedidos.getPedidosPendientesEnvio();
    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error al obtener pedidos pendientes:', error);
    res.status(500).json({ error: 'Error al obtener pedidos pendientes' });
  }
};
/**
 * Verificar si un pedido Woo ya existe
 * GET /woo-pedidos/existe
 * query params:
 *  - woo_config_id
 *  - numero_pedido
 *  - woo_order_id (opcional)
 */
exports.existePedidoWoo = async (req, res) => {
  const { woo_config_id, numero_pedido, woo_order_id } = req.query;

  if (!woo_config_id || !numero_pedido) {
    return res.status(400).json({
      error: 'woo_config_id y numero_pedido son obligatorios'
    });
  }

  try {
    const existe = await WooPedidos.existePedidoWoo({
      woo_config_id,
      numero_pedido,
      woo_order_id: woo_order_id || null
    });

    res.json({ existe });
  } catch (error) {
    console.error('❌ Error al verificar existencia del pedido:', error);
    res.status(500).json({
      error: 'Error al verificar pedido'
    });
  }
};
exports.GuardarPedidosPorTienda = async (req, res) => {
  console.log('📊 Iniciando guardado pedidos desde woocommerce');

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
    const resultado = await WooPedidos.guardarPedidosDesdeWoo(
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
    console.error('💥 Error al guardar los pedidos:', error);

    res.status(500).json({
      ok: false,
      error: 'Error al guardar los pedidos desde woocommerce'
    });
  }
};
