const WooProductMapping = require('../models/wooProductMapping.model');

// Obtener todos los mapeos
exports.getMappings = async (req, res) => {
  console.log('Iniciando solicitud para obtener todos los mapeos');
  try {
    const mappings = await WooProductMapping.getAllMappings();
    res.json(mappings);
  } catch (error) {
    console.error('❌ Error al obtener los mapeos:', error);
    res.status(500).json({ error: 'Error al obtener los mapeos' });
  }
};

// Obtener un mapeo por ID
exports.getMappingById = async (req, res) => {
  console.log('Iniciando solicitud para obtener mapeo por ID');
  try {
    const { id } = req.params;
    const mapping = await WooProductMapping.getMappingById(id);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('❌ Error al obtener el mapeo:', error);
    res.status(500).json({ error: 'Error al obtener el mapeo' });
  }
};

// Obtener un mapeo por ID woocomerce
exports.getMappingByIdWoocomerce = async (req, res) => {
  console.log('Iniciando solicitud para obtener mapeo por ID de WooCommerce');
  try {
    const { woocomerce_id } = req.params;
    const mapping = await WooProductMapping.getMappingByIdWoo(woocomerce_id);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('❌ Error al obtener el mapeo:', error);
    res.status(500).json({ error: 'Error al obtener el mapeo' });
  }
};


// Crear un nuevo mapeo
exports.createMapping = async (req, res) => {
  console.log('Iniciando solicitud para crear un nuevo mapeo');
  try {
    const { empresa_id, woocommerce_id, woo_product_id, producto_interno_id } = req.body;

    // Validación simple
    if (!empresa_id || !woocommerce_id || !woo_product_id || !producto_interno_id) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const id = await WooProductMapping.createMapping({
      empresa_id,
      woocommerce_id,
      woo_product_id,
      producto_interno_id,
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear el mapeo:', error);
    res.status(500).json({ error: 'Error al crear el mapeo' });
  }
};

// Actualizar un mapeo
exports.updateMapping = async (req, res) => {
  console.log('Iniciando solicitud para actualizar mapeo por ID');
  try {
    const { id } = req.params;
    const { empresa_id, woocommerce_id, woo_product_id, producto_interno_id } = req.body;

    const existing = await WooProductMapping.getMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    await WooProductMapping.updateMapping(id, {
      empresa_id,
      woocommerce_id,
      woo_product_id,
      producto_interno_id,
    });

    res.json({ message: 'Mapeo actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar el mapeo:', error);
    res.status(500).json({ error: 'Error al actualizar el mapeo' });
  }
};

// Eliminar un mapeo
exports.deleteMapping = async (req, res) => {
  console.log('Iniciando solicitud para eliminar mapeo por ID');
  try {
    const { id } = req.params;

    const existing = await WooProductMapping.getMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    await WooProductMapping.deleteMapping(id);
    res.json({ message: 'Mapeo eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar el mapeo:', error);
    res.status(500).json({ error: 'Error al eliminar el mapeo' });
  }
};

// Obtener el producto interno asociado a un producto WooCommerce
exports.getProductoInternoByWoo = async (req, res) => {
  console.log('Iniciando solicitud para obtener producto interno por WooCommerce ID y Woo Product ID');
  try {
    const { woocommerce_id, woo_product_id } = req.query;
    console.log('Recibiendo solicitud para obtener producto interno por WooCommerce ID:', woocommerce_id, 'y Woo Product ID:', woo_product_id);
    if (!woocommerce_id || !woo_product_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const productoInternoId = await WooProductMapping.getProductoInternoId(
      parseInt(woocommerce_id),
      parseInt(woo_product_id)
    );

    if (productoInternoId) {
      res.json({ producto_interno_id: productoInternoId });
    } else {
      res.status(404).json({ error: 'No se encontró un mapeo para los IDs proporcionados' });
    }
  } catch (error) {
    console.error('❌ Error en getProductoInternoByWoo:', error.message);
    res.status(500).json({ error: 'Error al obtener producto interno' });
  }
};