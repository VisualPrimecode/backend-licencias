const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function verificarStockProcessor(job) {
  const data = job.data;
  console.log("🧮 [verificarStockProcessor] Datos recibidos:", data);

  try {
    const { meta, resultados, empresa, smtpConfig, email_destinatario } = data;

    // 1️⃣ Validaciones básicas
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ Configuración SMTP inválida o incompleta.');
    }

    if (!Array.isArray(resultados)) {
      throw new Error('❌ El campo "resultados" debe ser un array.');
    }

    if (!meta || typeof meta.total_productos !== 'number') {
      throw new Error('❌ Estructura de meta inválida.');
    }

    if (!resultados.length) {
      console.log('✅ No se encontraron productos para alertar.');
      return { success: true, total: 0 };
    }

    // 2️⃣ Separar por estado
    const criticos = resultados.filter(
      r => r.estado_stock?.toLowerCase() === "crítico" || r.estado_stock?.toLowerCase() === "critico"
    );
    const advertencias = resultados.filter(
      r => r.estado_stock?.toLowerCase() === "advertencia"
    );

    // 3️⃣ Etiqueta dinámica de columna
    const etiquetaColumna = resultados.some(r => r.promedio_diario)
      ? 'Promedio Diario'
      : 'Consumo Estimado Restante';

    // 4️⃣ Generación de filas reutilizable
    const generarFilasHTML = (productos) => productos.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.producto}</td>
        <td>${p.stock_disponible}</td>
        <td>${p.promedio_diario ?? p.consumo_estimado_restante ?? 'N/A'}</td>
        <td>${p.estado_stock}</td>
      </tr>
    `).join('');

    const filasCriticos = generarFilasHTML(criticos);
    const filasAdvertencias = generarFilasHTML(advertencias);

    // 5️⃣ Asunto del correo dinámico
    const subject = resultados.some(r => r.consumo_estimado_restante)
      ? '⏳ Alerta Predictiva de Agotamiento por Rango Horario'
      : '📊 Alerta de Stock (Promedio Diario)';

    // 6️⃣ Texto base dinámico
    const text = resultados.some(r => r.consumo_estimado_restante)
      ? `Se detectaron riesgos de agotamiento basado en consumo estimado en los rangos horarios restantes.`
      : `Se detectaron productos con stock bajo basado en promedio diario de consumo.`;

    // 7️⃣ Construcción HTML
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #333; max-width: 750px; margin: 20px auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        
        <h2 style="color: #2c3e50; text-align: center; margin-bottom: 10px;">
          ${subject}
        </h2>

        <p style="text-align: center; color: #555; margin-bottom: 20px;">
          Fecha de cálculo: <strong>${new Date(meta.fecha_calculo ?? Date.now()).toLocaleString()}</strong>
        </p>

        <div style="background-color: #f7f7f7; padding: 10px 15px; border-radius: 6px; margin-bottom: 25px;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li><strong>Total productos alertados:</strong> ${resultados.length}</li>
          </ul>
        </div>

        ${criticos.length ? `
          <h3 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 5px;">
            🚨 Productos Críticos
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: center;">
            <thead>
              <tr style="background-color: #f9d6d5; color: #a94442;">
                <th>#</th>
                <th style="text-align: left;">Producto</th>
                <th>Stock</th>
                <th>${etiquetaColumna}</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${filasCriticos}</tbody>
          </table>
        ` : ''}

        ${advertencias.length ? `
          <h3 style="color: #f0ad4e; border-bottom: 2px solid #f0ad4e; padding-bottom: 5px;">
            ⚠️ Productos en Advertencia
          </h3>
          <table style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
              <tr style="background-color: #fff3cd; color: #856404;">
                <th>#</th>
                <th style="text-align: left;">Producto</th>
                <th>Stock</th>
                <th>${etiquetaColumna}</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${filasAdvertencias}</tbody>
          </table>
        ` : ''}

        ${resultados.some(r => r.consumo_estimado_restante) ? `
          <p style="color:#d9534f; font-size: 13px; margin-top:10px;">
            ⚠️ Esta alerta se generó con estimación de consumo restante según la hora actual. 
            Los productos podrían agotarse durante la jornada.
          </p>
        ` : ''}

        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="text-align: center; color: #777; font-size: 12px; margin-top: 10px;">
          Mensaje automático del sistema de inventario de <strong>${empresa?.nombre || 'la empresa'}</strong>.
        </p>
      </div>
    `;

    // 8️⃣ Destinatarios
    const destinatarios = Array.isArray(email_destinatario)
      ? email_destinatario.join(',')
      : email_destinatario || 'alertas@miempresa.com';

    // 9️⃣ Enviar correo
    await sendEnvioCorreo({
      smtpConfig,
      to: destinatarios,
      subject,
      text,
      html,
      nombreEmpresa: empresa?.nombre || 'Sistema de Inventario'
    });

    console.log(`✅ Correo enviado correctamente a ${destinatarios}. Total productos: ${resultados.length}`);
    return { success: true, total: resultados.length };

  } catch (error) {
    console.error('❌ Error en verificarStockProcessor:', error);
    throw error;
  }
};
