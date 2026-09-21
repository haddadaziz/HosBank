const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
    }
});

const emailService = {
    async sendVerificationEmail(email, token, req) {
        const protocol = req ? req.protocol : "http";
        const host = req ? req.get("host") : "localhost:3000";
        const verifyUrl = `${protocol}://${host}/verify-email?token=${token}`;

        console.log("\n====================================================================");
        console.log("📧 SERVICE D'ENVOI D'E-MAIL HOSBANK - VÉRIFICATION DE COMPTE");
        console.log("👤 Destinataire       :", email);
        console.log("🎫 Token de sécurité  :", token);
        console.log("👉 LIEN D'ACTIVATION  :", verifyUrl);
        console.log("⏱️ Validité du lien   : 24 heures");
        console.log("====================================================================\n");

        const mailOptions = {
            from: '"HosBank Sécurité" <securite@hosbank.fr>',
            to: email,
            subject: "HosBank - Activez votre compte bancaire",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F6EFE0; padding: 30px; border-radius: 12px; color: #282330;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="color: #746B92; font-size: 26px; margin: 0;">HosBank</h1>
                        <p style="color: #9D937F; font-size: 13px; margin: 5px 0 0 0;">Une banque radicalement différente</p>
                    </div>

                    <div style="background-color: #FFFFFF; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <h2 style="font-size: 20px; color: #282330; margin-top: 0;">Bienvenue chez HosBank !</h2>
                        <p style="font-size: 15px; line-height: 1.6; color: #555;">
                            Votre inscription a été enregistrée avec succès. Pour des raisons de sécurité bancaire et conformément à la réglementation, veuillez confirmer votre adresse e-mail pour activer votre compte.
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verifyUrl}" style="background-color: #746B92; color: #FFFFFF; padding: 14px 32px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 15px;">
                                Confirmer mon adresse e-mail
                            </a>
                        </div>

                        <p style="font-size: 13px; color: #888; line-height: 1.5;">
                            Ce lien de sécurité est valable pendant <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                        </p>
                    </div>
                </div>
            `
        };

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                await transporter.sendMail(mailOptions);
            } catch (err) {
                console.warn("Erreur envoi email :", err.message);
            }
        }

        return verifyUrl;
    }
};

module.exports = emailService;
