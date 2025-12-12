// models/flow.model.js

const crypto = require('node:crypto');
const axios = require('axios');
const querystring = require('node:querystring');
const { getFlowConfigById, getPedidosFallidos } = require('../models/woocommerce_config.model'); 



/**
 * Consulta transacciones de Flow por una fecha (YYYY-MM-DD)
 * flowId = ID en la tabla woocommerce_api_config
 */
const getTransactionsByDate = async (date, flowId, start = 0, limit = 50) => {
  try {

    // ----------------------------------
    // 1. Traer apiKey y secretKey de la BD
    // ----------------------------------
    const flowConfig = await getFlowConfigById(flowId);

    const params = {
      apiKey: flowConfig.apiKey,
      date,
      start,
      limit
    };

    // ----------------------------------
    // 2. Generar firma
    // ----------------------------------
    const keys = Object.keys(params).sort();
    let toSign = "";

    keys.forEach(key => {
      toSign += key + params[key];
    });

    const signature = crypto
      .createHmac("sha256", flowConfig.secretKey)
      .update(toSign)
      .digest("hex");

    const fullParams = { ...params, s: signature };

    const queryString = querystring.stringify(fullParams);
    const url = `https://flow.cl/api/payment/getTransactions?${queryString}`;

    // ----------------------------------
    // 3. Ejecutar petición a Flow
    // ----------------------------------
    const response = await axios.get(url);

    return response.data;

  } catch (error) {
    console.error("❌ Error en modelo Flow:", error);
    throw error;
  }
};



/**
 * Consulta transacciones por rango de fechas
 */
const getTransactionsByRange = async (startDate, endDate, flowId) => {
  try {
    const results = [];
    let currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
      const dateString = currentDate.toISOString().split("T")[0];

      console.log(`🔎 Consultando Flow para el día: ${dateString}`);

      let dailyData = await getTransactionsByDate(dateString, flowId);

      // ----------------------------------------------------
      // 🔹 Filtrar SOLO las transacciones con status = 2
      // 🔹 Mantener estructura completa { total, hasMore, data }
      // ----------------------------------------------------
      if (dailyData && Array.isArray(dailyData.data)) {

        const dataFiltrada = dailyData.data.filter(tx => tx.status === 2);

        // Mantener estructura original y actualizar total correctamente
        dailyData = {
          ...dailyData,
          data: dataFiltrada,
          total: dataFiltrada.length  // Mantener número (int)
        };
      }

      results.push({
        fecha: dateString,
        transacciones: dailyData
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;

  } catch (error) {
    console.error("❌ Error en rango de fechas:", error);
    throw error;
  }
};

const matchFailedOrdersWithFlow = async (wooConfigId, flowConfigId) => {
  try {
    // ------------------------------
    // 1. Fechas: hoy y ayer
    // ------------------------------
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);

    const formatDate = d => d.toISOString().split("T")[0];

    const startDate = formatDate(ayer);
    const endDate = formatDate(hoy);

    // ------------------------------
    // 2. Obtener pedidos fallidos
    // ------------------------------
    const failedOrders = await getPedidosFallidos(wooConfigId);

    // ------------------------------
    // 3. Obtener transacciones de Flow
    // ------------------------------
    const flowResult = await getTransactionsByRange(startDate, endDate, flowConfigId);

    // Aplanar todas las transacciones del rango
    const allTransactions = [];
    flowResult.forEach(day => {
      if (day.transacciones?.data) {
        allTransactions.push(...day.transacciones.data);
      }
    });

    // ------------------------------
    // 4. Crear mapa por commerceOrder
    // ------------------------------
    const txMap = new Map();

    allTransactions.forEach(tx => {
      const key = String(tx.commerceOrder).trim();
      txMap.set(key, tx); // basta UNA coincidencia
    });

    // ------------------------------
    // 5. Construir lista final
    // ------------------------------
    const result = failedOrders.map(order => {
      const orderIdKey = String(order.id);

      const transaccion = txMap.get(orderIdKey) || null;

      return {
        pedido: order,
        transaccion
      };
    });

    return result;

  } catch (error) {
    console.error("❌ Error en matchFailedOrdersWithFlow:", error);
    throw error;
  }
};



module.exports = {
  getTransactionsByDate,
  getTransactionsByRange,
  matchFailedOrdersWithFlow
};
