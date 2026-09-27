const nodemailer = require("nodemailer");

// Configuration du transporteur Nodemailer (SMTP Mailtrap)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT || "2525", 10),
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
    }
});

const emailService = {
    // Envoi de l'email d'activation avec le lien et le token
    async sendVerificationEmail(email, token, req) {
        // 1. Construire le lien d'activation avec le token
        const protocol = req ? req.protocol : "http";
        const host = req ? req.get("host") : "localhost:3000";
        const verifyUrl = `${protocol}://${host}/verify-email?token=${token}`;

        // 2. Affichage dans la console pour faciliter les tests
        console.log("=================================================");
        console.log("📧 ENVOI E-MAIL D'ACTIVATION HOSBANK");
        console.log("👤 Destinataire       :", email);
        console.log("👉 Lien d'activation  :", verifyUrl);
        console.log("⏱️ Validité           : 24 heures (Usage unique)");
        console.log("=================================================");

        // 3. Préparer les options du message
        const mailOptions = {
            from: '"HosBank Sécurité" <securite@hosbank.fr>',
            to: email,
            subject: "HosBank - Activez votre compte bancaire",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F6EFE0; padding: 25px; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #746B92; margin: 0;">HosBank</h1>
                        <p style="color: #9D937F; margin: 5px 0 0;">Activation de votre compte</p>
                    </div>

                    <div style="background-color: #FFFFFF; padding: 25px; border-radius: 8px;">
                        <h2 style="color: #282330; font-size: 18px; margin-top: 0;">Bienvenue chez HosBank !</h2>
                        <p style="color: #555; line-height: 1.5;">
                            Merci pour votre inscription. Pour finaliser l'ouverture de votre compte bancaire, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :
                        </p>

                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${verifyUrl}" style="background-color: #746B92; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Activer mon compte
                            </a>
                        </div>

                        <p style="font-size: 12px; color: #888; margin-bottom: 0;">
                            Ce lien de sécurité est valable pendant <strong>24 heures</strong> et à <strong>usage unique</strong>.
                        </p>
                    </div>
                </div>
            `
        };

        // 4. Envoyer l'email via Nodemailer si les identifiants SMTP existent
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const info = await transporter.sendMail(mailOptions);
                console.log("✅ Email envoyé avec succès vers Mailtrap ! ID:", info.messageId);
            } catch (err) {
                console.error("❌ Erreur lors de l'envoi de l'email :", err.message);
            }
        }

        return verifyUrl;
    }
};

module.exports = emailService;

