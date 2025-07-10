/*const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const api = new WooCommerceRestApi({
  url: process.env.WOOCOMMERCE_URL,
  consumerKey: process.env.WOOCOMMERCE_KEY,
  consumerSecret: process.env.WOOCOMMERCE_SECRET,
  version: "wc/v3"
});

module.exports = {
  getPedidos: async () => {
    try {
      const response = await api.get("orders");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo pedidos:", error.response?.data || error);
      throw error;
    }
  },

  getPedidoPorId: async (id) => {
    try {
      const response = await api.get("orders/${id}");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo pedido ${id}: ", error.response?.data || error);
      throw error;
    }
  },

  getProductos: async () => {
    try {
      const response = await api.get("products");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo productos:", error.response?.data || error);
      throw error;
    }
  },

  crearWebhook: async ({ nombre, topic, url }) => {
    try {
      const response = await api.post("webhooks", {
        name: nombre,
        topic,
        delivery_url: url,
        status: "active"
      });
      return response.data;
    } catch (error) {
      console.error("Error creando webhook:", error.response?.data || error);
      throw error;
    }
  }
};

 */


const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

// Función que crea una instancia del cliente WooCommerce con la configuración de la base de datos
const createWooApiClient = (config) => {
  return new WooCommerceRestApi({
    url: config.url,
    consumerKey: config.clave_cliente,
    consumerSecret: config.clave_secreta,
    version: "wc/v3"
  });
};
