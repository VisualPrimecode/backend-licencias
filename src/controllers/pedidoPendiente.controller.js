const PedidoPendiente = require('../models/pedidoPendiente.model');

/**
 * Obtener todos los pedidos pendientes
 */
exports.getPedidosPendientes = async (req, res) => {
  console.log("entro en getPedidosPendientes");
  try {
    const pedidos = await PedidoPendiente.getAllPedidosPendientesAun();
    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error al obtener pedidos pendientes:', error);
    res.status(500).json({ error: 'Error al obtener pedidos pendientes' });
  }
};

/**
 * Obtener pedido pendiente por ID
 */
exports.getPedidoPendienteById = async (req, res) => {
  console.log("entro en getPedidoPendienteById");
  try {
    const { id } = req.params;

    const pedido = await PedidoPendiente.getPedidoPendienteById(id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido pendiente no encontrado' });
    }

    res.json(pedido);
  } catch (error) {
    console.error('❌ Error al obtener pedido pendiente:', error);
    res.status(500).json({ error: 'Error al obtener pedido pendiente' });
  }
};

/**
 * Crear nuevo pedido pendiente
 */
exports.createPedidoPendiente = async (req, res) => {
  console.log("entro en createPedidoPendiente");
  try {
    const { numero_pedido, id_tienda, estado } = req.body;

    // Validación básica
    if (!numero_pedido || !id_tienda || !estado) {
      return res.status(400).json({
        error: 'numero_pedido, id_tienda y estado son obligatorios'
      });
    }

    const insertId = await PedidoPendiente.createPedidoPendiente({
      numero_pedido,
      id_tienda,
      estado
    });

    res.status(201).json({
      message: 'Pedido pendiente creado correctamente',
      id: insertId
    });
  } catch (error) {
    console.error('❌ Error al crear pedido pendiente:', error);
    res.status(500).json({ error: 'Error al crear pedido pendiente' });
  }
};

/**
 * Actualizar pedido pendiente
 */
exports.updatePedidoPendiente = async (req, res) => {
  console.log("entro en updatePedidoPendiente");
  try {
    const { id } = req.params;
    const { numero_pedido, id_tienda, estado } = req.body;

    if (!numero_pedido || !id_tienda || !estado) {
      return res.status(400).json({
        error: 'numero_pedido, id_tienda y estado son obligatorios'
      });
    }

    const affectedRows = await PedidoPendiente.updatePedidoPendiente(id, {
      numero_pedido,
      id_tienda,
      estado
    });

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido pendiente no encontrado' });
    }

    res.json({ message: 'Pedido pendiente actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar pedido pendiente:', error);
    res.status(500).json({ error: 'Error al actualizar pedido pendiente' });
  }
};

/**
 * Eliminar pedido pendiente
 */
exports.deletePedidoPendiente = async (req, res) => {
  console.log("entro en deletePedidoPendiente");
  try {
    const { id } = req.params;

    const affectedRows = await PedidoPendiente.deletePedidoPendiente(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido pendiente no encontrado' });
    }

    res.json({ message: 'Pedido pendiente eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar pedido pendiente:', error);
    res.status(500).json({ error: 'Error al eliminar pedido pendiente' });
  }
};

/**
 * Crear pedido pendiente solo si no existe
 */
exports.crearSiNoExistePedidoPendiente = async (req, res) => {
  console.log("entro en crearSiNoExistePedidoPendiente (controller)");

  try {
    const { numero_pedido, id_tienda, estado } = req.body;

    // Validación básica
    if (!numero_pedido || !id_tienda || !estado) {
      return res.status(400).json({
        error: 'numero_pedido, id_tienda y estado son obligatorios'
      });
    }

    const resultado = await PedidoPendiente.crearSiNoExistePedidoPendiente({
      numero_pedido,
      id_tienda,
      estado
    });

    if (!resultado.creado) {
      return res.status(200).json({
        creado: false,
        message: 'El pedido pendiente ya existe'
      });
    }

    res.status(201).json({
      creado: true,
      message: 'Pedido pendiente creado correctamente'
    });

  } catch (error) {
    console.error('❌ Error al crear pedido pendiente si no existe:', error);
    res.status(500).json({
      error: 'Error al crear pedido pendiente'
    });
  }
};
