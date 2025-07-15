const nodemailer = require('nodemailer');


/**
 * Crea un transporter SMTP con configuración personalizada
 * @param {Object} smtpConfig - Configuración SMTP
 * @param {string} smtpConfig.host
 * @param {number} smtpConfig.port
 * @param {boolean} smtpConfig.secure
 * @param {string} smtpConfig.user
 * @param {string} smtpConfig.pass
 * @returns {nodemailer.Transporter}
 */
const createTransporter = async (smtpConfig) => {
  console.log('🔧 Creando transporter con config:', smtpConfig);

  const { host, port, secure, user, pass } = smtpConfig;

  let transporter;

  try {
    const parsedPort = Number(port);
    if (isNaN(parsedPort)) {
      throw new Error(`El puerto SMTP proporcionado no es válido: ${port}`);
    }

    transporter = nodemailer.createTransport({
      host,
      port: parsedPort,
      secure: secure === true || secure === 'true',
      auth: { user, pass }
    });

    console.log('🚀 Transporter creado exitosamente.', transporter);

  } catch (err) {
    console.error('❌ Error al crear el transporter:', err.message);
    throw err;
  }

  // Verificar conexión SMTP
  try {
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada correctamente.');
  } catch (err) {
    console.error('❌ Error al verificar conexión SMTP:', err.message);
    throw err;
  }

  return transporter;
};


/**
 * Envía un correo electrónico usando configuración SMTP personalizada
 * @param {Object} params
 * @param {Object} params.smtpConfig - Config SMTP
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.text
 * @param {string} params.html
 */
const sendEnvioCorreo = async ({ smtpConfig, to, subject, text, html }) => {
    console.log('entro en el nuevo sendEnvioCorreo');
  const transporter = await createTransporter(smtpConfig);
  console.log('Transporter creado con configuración:', transporter);

  const mailOptions = {
    from: `"Mi Empresa" <${smtpConfig.user}>`,
    to,
    subject,
    text,
    html
  };

  await transporter.sendMail(mailOptions);
};

const sendCotizacionCorreo = async ({ smtpConfig, to, subject, text, html }) => {
  const transporter = await createTransporter(smtpConfig);

  const mailOptions = {
    from: `"${smtpConfig.sender_name}" <${smtpConfig.sender_email}>`,
    to,
    subject,
    text,
    html,
    replyTo: smtpConfig.reply_to_email || smtpConfig.sender_email,
  };

  await transporter.sendMail(mailOptions);
};


module.exports = {
  sendEnvioCorreo,
  sendCotizacionCorreo
};
