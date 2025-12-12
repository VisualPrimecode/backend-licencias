// controllers/flow.controller.js

const FlowModel = require('../models/flow.model');




/**
 * Obtener transacciones de un solo día
 * Ruta esperada:
 * GET /flow/transacciones/:flowId/:fecha
 */
exports.getTransactions = async (req, res) => {
  try {
    const { flowId, fecha } = req.params;

    if (!flowId || isNaN(flowId)) {
      return res.status(400).json({
        error: "Debe enviar un flowId válido"
      });
    }

    if (!fecha) {
      return res.status(400).json({
        error: "Debe enviar una fecha en formato YYYY-MM-DD"
      });
    }

    console.log("🔎 [DEBUG] Consultando transacciones Flow...");
    console.log("🔎 [DEBUG] flowId:", flowId);
    console.log("🔎 [DEBUG] fecha:", fecha);

    // -------------------------------
    // Llamada al modelo
    // -------------------------------
    const data = await FlowModel.getTransactionsByDate(fecha, flowId);

    console.log("📥 [DEBUG] Respuesta cruda desde FlowModel:");
    console.log(data);

    // -------------------------------
    // Validaciones antes del filtro
    // -------------------------------
    if (!Array.isArray(data)) {
      console.log("⚠️ [DEBUG] data NO ES UN ARRAY. Tipo:", typeof data);
      return res.json({
        flowId,
        fecha,
        transacciones: []
      });
    }

    console.log("📊 [DEBUG] Total transacciones recibidas:", data.length);

    // -------------------------------
    // Filtro status = 2 (logueando tipos)
    // -------------------------------
    const transaccionesFiltradas = data.filter(t => {
      console.log(
        `🔍 [DEBUG] Analizando transacción ID=${t.id || "?"} status=`,
        t.status,
        " (tipo:", typeof t.status + ")"
      );

      return Number(t.status) === 2;
    });

    console.log("✅ [DEBUG] Total transacciones filtradas (status=2):", transaccionesFiltradas.length);

    // -------------------------------
    // Respuesta final
    // -------------------------------
    return res.json({
      flowId,
      fecha,
      transacciones: transaccionesFiltradas
    });

  } catch (error) {
    console.error("❌ Error en getTransactions:", error);

    return res.status(500).json({
      error: "Error obteniendo transacciones para la fecha indicada",
      detalle: error.response?.data || error.message
    });
  }
};




/**
 * Obtener transacciones por rango de fechas
 * Ruta esperada:
 * GET /flow/transacciones/rango/:flowId/:inicio/:fin
 */
exports.getTransactionsRange = async (req, res) => {
  try {
    const { flowId, inicio, fin } = req.params;

    if (!flowId || isNaN(flowId)) {
      return res.status(400).json({
        error: "Debe enviar un flowId válido"
      });
    }

    if (!inicio || !fin) {
      return res.status(400).json({
        error: "Debe enviar fecha de inicio y fecha de fin en formato YYYY-MM-DD"
      });
    }

    const data = await FlowModel.getTransactionsByRange(inicio, fin, flowId);

    return res.json({
      flowId,
      rango: `${inicio} -> ${fin}`,
      dias_consultados: data.length,
      resultados: data
    });

  } catch (error) {
    console.error("❌ Error en getTransactionsRange:", error);

    return res.status(500).json({
      error: "Error obteniendo transacciones para el rango indicado",
      detalle: error.response?.data || error.message
    });
  }
};
exports.getFailedOrdersWithPayment = async (req, res) => {
  try {
    const { wooId, flowId } = req.params;

    if (!wooId || !flowId) {
      return res.status(400).json({
        success: false,
        message: "wooId y flowId son requeridos"
      });
    }

    console.log(`🔍 Buscando pedidos fallidos con pago | Woo: ${wooId} | Flow: ${flowId}`);

    // Llamar al modelo
    const results = await FlowModel.matchFailedOrdersWithFlow(wooId, flowId);

    // Filtrar SOLO los pedidos fallidos que tienen transacción
    const matched = results.filter(r => r.transaccion !== null);

    return res.json({
      success: true,
      total: matched.length,
      data: matched
    });

  } catch (error) {
    console.error("❌ Error en getFailedOrdersWithPayment:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Error interno en el servidor"
    });
  }
};