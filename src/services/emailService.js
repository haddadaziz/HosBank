const nodemailer = require("nodemailer");

// Configuration du transporteur d'emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || ""
    }
});

const emailService = {
    // Envoyer l'email d'activation
    async sendVerificationEmail(email, token, req) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const verifyLink = `${baseUrl}/verify-email?token=${token}`;

        console.log("--------------------------------------------------");
        console.log("📧 LIEN DE VÉRIFICATION EMAIL POUR :", email);
        console.log("👉 Cliquez ici pour valider :", verifyLink);
        console.log("--------------------------------------------------");

        // Si des identifiants SMTP existent, on envoie le vrai email
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                await transporter.sendMail({
                    from: '"HosBank Sécurité" <no-reply@hosbank.fr>',
                    to: email,
                    subject: "HosBank - Vérification de votre adresse e-mail",
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #F6EFE0; color: #282330;">
                            <h2 style="color: #746B92;">Bienvenue chez HosBank !</h2>
                            <p>Merci pour votre inscription. Veuillez cliquer sur le bouton ci-dessous pour activer votre compte bancaire :</p>
                            <p style="margin: 25px 0;">
                                <a href="${verifyLink}" style="background-color: #746B92; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                    Activer mon compte
                                </a>
                            </p>
                            <p>Ou copiez ce lien dans votre navigateur :</p>
                            <p><a href="${verifyLink}">${verifyLink}</a></p>
                        </div>
                    `
                });
            } catch (err) {
                console.error("Erreur lors de l'envoi de l'email :", err.message);
            }
        }
        return verifyLink;
    }
};

module.exports = emailService;
