const { sendEnvioCorreo } = require('../utils/mailer');

const productosNoPrioritarios = [
  "office 365 pro plus - 5 pc permanente",
  "office 365 family",
  "Office 365 renovacion",
  "Avast Ultimate 2024",
  "Office 2024 Home",
  "Office 2019 home and bussiness",
  "visio 2016",
  "AVAST Internet Security 2022",
  "autocad 2025 lt subscripcion anual duplicado",
  "Office 365 Pro Plus – 5PC Permanente",
  "office 365 indefinido",
  "McAfee LiveSafe",
  "Windows 10 pro",
  "Windows 10",
  "Microsoft Word 2021",
  "Microsoft Exel 2021",
  "office 2021 pro plus 5 pc",
  "Office 2021 pro plus vinculable",
  "office 2019 home and bussiness",
  "eset internet security",
  "Windows 10 Pro + Office 2019 Pro",
  "Windows 11 Pro + Office 2021 Pro",
  "office mac 2021 home and bussiness",
  "mcafee total protection",
  "office 2024 ltsc professional plus reinstalable",
  "Office 2021 Pro Plus Reinstalable",
  "microsoft 365 family copilot IA 15 meses",
  "mcafee internet security",
  "kasperski total security",
  "project 2024",
  "visio 2024",
  "Office 2016 for Mac Home & Business",
  "Avast Premiun Security",
  "Office Mac 2019 home and business",
  "Windows 11 Pro y Office 365",
  "Trend Micro Maximum Security 1 anio",
  "Windows 11 Pro + Office 2021 Pro + Antivirus McAfee",
  "Panda Dome Essential 2022",
  "Windows 8.1 Pro",
  "Windows Server 2019 Standard",
  "Panda Dome Essential 2023",
  "panda dome essentials",
  "minecraft"
];

module.exports = async function alertasStockProcessor(job) {
  const alerta = job.data;
  if (!alerta.smtpConfig || !alerta.smtpConfig.host || !alerta.smtpConfig.user || !alerta.smtpConfig.pass) {
  console.warn("⚠️ Job sin smtpConfig válido recibido, se omitirá:", alerta);
  return { success: false, skipped: true };
}

  console.log("📬 [alertasStockProcessor] Datos recibidos:", alerta);

  try {
    const smtpConfig = alerta.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ smtpConfig inválido o incompleto en el job');
    }

    const { rango, total_productos, resultados = [] } = alerta;

    if (!Array.isArray(resultados)) {
      throw new Error('❌ El campo "resultados" debe ser un array de productos.');
    }

    if (!resultados.length) {
      console.log('✅ No hay productos con riesgo de stock.');
      return { success: true, total: 0 };
    }

    const fechaInicio = rango?.fechaInicio
      ? new Date(rango.fechaInicio).toLocaleDateString()
      : 'N/D';
    const fechaFin = rango?.fechaFin
      ? new Date(rango.fechaFin).toLocaleDateString()
      : 'N/D';

    // ✅ Separar productos prioritarios y no prioritarios
    const productosPrioritarios = resultados.filter(
      p => !productosNoPrioritarios.includes(p.producto)
    );
    const productosComunes = resultados.filter(
      p => productosNoPrioritarios.includes(p.producto)
    );

    function generarFilasHTML(productos) {
      return productos.map((p, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${p.producto}</td>
          <td>${p.stock_disponible}</td>
          <td>${p.promedio_diario}</td>
          <td>${p.dif_dia}</td>
          <td>${p.estado_stock}</td>
        </tr>
      `).join('');
    }

    const htmlPrioritarios = generarFilasHTML(productosPrioritarios);
    const htmlComunes = generarFilasHTML(productosComunes);

    // ✅ Construir correo HTML
    const htmlFinal = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #D9534F;">⚠️ Alerta de Stock Insuficiente</h2>
        <p>Se detectaron productos con riesgo de stock en el siguiente rango de fechas:</p>
        <ul>
          <li><strong>Fecha Inicio:</strong> ${fechaInicio}</li>
          <li><strong>Fecha Fin:</strong> ${fechaFin}</li>
          <li><strong>Total productos analizados:</strong> ${total_productos}</li>
          <li><strong>Productos con riesgo:</strong> ${resultados.length}</li>
        </ul>

        ${productosPrioritarios.length ? `
        <h3>🔥 Productos de alta rotación (requieren reposición inmediata)</h3>
        <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th>#</th>
              <th>Producto</th>
              <th>Stock Disponible</th>
              <th>Promedio Diario</th>
              <th>Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${htmlPrioritarios}
          </tbody>
        </table>` : ''}

        ${productosComunes.length ? `
        <h3>📦 Otros productos con riesgo de stock</h3>
        <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th>#</th>
              <th>Producto</th>
              <th>Stock Disponible</th>
              <th>Promedio Diario</th>
              <th>Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${htmlComunes}
          </tbody>
        </table>` : ''}

        <p style="margin-top: 20px;">Por favor, revisa el inventario y considera reponer estos productos prioritarios antes que los demás.</p>
      </div>
    `;

    // ✅ Soporte para múltiples destinatarios
    const destinatarios = Array.isArray(alerta.email_destinatario)
      ? alerta.email_destinatario.join(',')
      : alerta.email_destinatario || 'alertas@miempresa.com';

    // 📨 Enviar correo real
    await sendEnvioCorreo({
      smtpConfig,
      to: destinatarios,
      subject: '⚠️ Alerta de Stock Insuficiente',
      text: `Se detectaron productos con riesgo de stock entre ${fechaInicio} y ${fechaFin}.`,
      html: htmlFinal,
      nombreEmpresa: alerta.empresaName || 'Sistema de Alertas'
    });

    console.log(`✅ Job procesado correctamente. Total alertas: ${resultados.length}`);
    return { success: true, total: resultados.length };

  } catch (error) {
    console.error('❌ Error en alertasStockProcessor:', error);
    throw error;
  }
};
