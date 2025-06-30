const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),           // <- asegúrate que sea número
  secure: process.env.SMTP_SECURE === 'true',    // <- convertir string a boolean
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEnvioCorreo = async ({ to, subject, text, html }) => {
    console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS);
  const mailOptions = {
    from: `"Mi Empresa" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  };

  await transporter.sendMail(mailOptions);
};
const verifySMTPConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Conexión SMTP verificada correctamente.');
  } catch (err) {
    console.error('❌ Error al verificar conexión SMTP:', err.message);
    if (err.response) console.error('Respuesta SMTP:', err.response);
  }
};

module.exports = {
  sendEnvioCorreo,
  verifySMTPConnection
};
