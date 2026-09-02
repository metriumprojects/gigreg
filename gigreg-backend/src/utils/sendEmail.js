import nodemailer from "nodemailer";

const formatEmailError = (error) => ({
  message: error?.message || "Failed to send email",
  code: error?.code,
  command: error?.command,
  responseCode: error?.responseCode,
});

const sendEmail = async (options = {}) => {
  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      throw new Error("SMTP credentials are not configured");
    }

    if (!options.to || !options.subject || !options.html) {
      throw new Error("Email recipient, subject and html body are required");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: options.from || `"Help from SkillSlide" <${process.env.SMTP_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { status: true, info };
  } catch (error) {
    const formattedError = formatEmailError(error);
    console.error("Email send failed:", formattedError);
    return { status: false, error: formattedError };
  }
};

export default sendEmail;
