// utils/woocommerceClient.js
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const createWooCommerceClient = ({ url, consumerKey, consumerSecret }) => {
  return new WooCommerceRestApi({
    url,
    consumerKey,
    consumerSecret,
    version: "wc/v3",
  });
};

module.exports = createWooCommerceClient;
