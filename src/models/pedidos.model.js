//Pedidos
const getPedidos = async () => {
    try {
      const response = await api.get("orders");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo pedidos:", error.response?.data || error);
      throw error;
    }
  }