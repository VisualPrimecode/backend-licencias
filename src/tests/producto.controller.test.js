// tests/producto.controller.test.js
const productoController = require('../controllers/producto.controller');
const Producto = require('../models/producto.model');

// ✨ Mocker manual
jest.mock('../models/producto.model');

describe('getProductoById', () => {
  let req, res;

  beforeEach(() => {
    req = { params: { id: '123' } };
    res = {
      status: jest.fn().mockReturnThis(),  // permite encadenamiento .status().json()
      json: jest.fn(),
    };
  });

  it('debe devolver el producto si existe', async () => {
    const productoFalso = { id: '123', nombre: 'Producto X' };
    Producto.getProductoById.mockResolvedValue(productoFalso);

    await productoController.getProductoById(req, res);

    expect(Producto.getProductoById).toHaveBeenCalledWith('123');
    expect(res.json).toHaveBeenCalledWith(productoFalso);
  });

  it('debe devolver 404 si el producto no existe', async () => {
    Producto.getProductoById.mockResolvedValue(null);

    await productoController.getProductoById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Producto no encontrado' });
  });

  it('debe devolver 500 si ocurre un error', async () => {
    Producto.getProductoById.mockRejectedValue(new Error('Fallo DB'));

    await productoController.getProductoById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener producto' });
  });
});
