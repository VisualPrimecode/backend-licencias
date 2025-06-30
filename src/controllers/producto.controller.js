const Producto = require('../models/producto.model');

// Obtener todos los productos
exports.getProductos = async (req, res) => {
  try {
    const productos = await Producto.getAllProductos();
    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener un producto por ID
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.getProductoById(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Crear un producto
exports.createProducto = async (req, res) => {
  try {
    const {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online
    } = req.body;

    // Validaciones básicas
    if (!nombre || !tipo_licencia) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const tiposPermitidos = ['permanente', '1año', '3años'];
    if (!tiposPermitidos.includes(tipo_licencia)) {
      return res.status(400).json({ error: `Tipo de licencia inválido. Permitidos: ${tiposPermitidos.join(', ')}` });
    }

    const id = await Producto.createProducto({
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online: requiere_online ? 1 : 0
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// Actualizar un producto
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online
    } = req.body;

    const producto = await Producto.getProductoById(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.updateProducto(id, {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online: requiere_online ? 1 : 0
    });

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Eliminar un producto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.getProductoById(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.deleteProducto(id);
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
