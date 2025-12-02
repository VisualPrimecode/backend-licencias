const ProductoPersonalizado = require('../models/productosPersonalizados');

// Obtener todos los productos personalizados
exports.getProductosPersonalizados = async (req, res) => {
  console.log('Obteniendo todos los productos personalizados...');
  try {
    const productos = await ProductoPersonalizado.getAllProductosPersonalizados();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos personalizados' });
  }
};

// Crear un nuevo producto personalizado
exports.createProductoPersonalizado = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      unidad_medida,
      cantidad_default,
      creado_por
    } = req.body;

    const id = await ProductoPersonalizado.createProductoPersonalizado({
      nombre,
      descripcion,
      precio,
      unidad_medida,
      cantidad_default,
      creado_por
    });

    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto personalizado' });
  }
};

// Obtener un producto por ID
exports.getProductoPersonalizadoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    const producto = await ProductoPersonalizado.getProductoPersonalizadoById(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Actualizar un producto personalizado
exports.updateProductoPersonalizado = async (req, res) => {
  try {
    const { id } = req.params;
    const nuevosDatos = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    const result = await ProductoPersonalizado.updateProductoPersonalizado(id, nuevosDatos);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Eliminación lógica
exports.deleteProductoPersonalizado = async (req, res) => {
  console.log('Eliminando producto personalizado...');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    const result = await ProductoPersonalizado.deleteProductoPersonalizado(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
