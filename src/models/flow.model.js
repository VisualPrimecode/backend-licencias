// models/flow.model.js

const crypto = require('node:crypto');
const axios = require('axios');
const querystring = require('node:querystring');
const { getFlowConfigById } = require('../models/woocommerce_config.model'); 


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



module.exports = {
  getTransactionsByDate,
  getTransactionsByRange
};
