const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepository = require("../repositories/userRepository");
const emailService = require("./emailService");

const authService = {
    // Inscription d'un nouveau client
    async register(data, req) {
        const { civilite, name, email, password, confirmPassword } = data;

        // 1. Vérifier que tous les champs sont remplis
        if (!name || !email || !password || !confirmPassword) {
            throw new Error("Veuillez remplir tous les champs obligatoires.");
        }

        // 2. Vérifier que les deux mots de passe correspondent
        if (password !== confirmPassword) {
            throw new Error("Les mots de passe ne correspondent pas.");
        }

        // 3. Contrôle de complexité du mot de passe
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            throw new Error("Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
        }

        // 4. Vérifier si l'email existe déjà
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error("Un compte existe déjà avec cette adresse e-mail.");
        }

        // 5. Récupérer le prénom et le nom
        const parts = name.trim().split(" ");
        const prenom = parts[0];
        const nom = parts.slice(1).join(" ") || parts[0];

        // 6. Hacher le mot de passe avec bcrypt (salage coût = 10)
        const motDePasseHash = await bcrypt.hash(password, 10);

        // 7. Générer un token pour la confirmation d'email
        const token = crypto.randomBytes(24).toString("hex");

        // 8. Sauvegarder l'utilisateur en base de données
        const newUser = await userRepository.create({
            civilite: civilite || "M.",
            nom,
            prenom,
            email,
            motDePasseHash,
            token
        });

        // 9. Créer un compte bancaire initial pour le client
        try {
            await userRepository.createDefaultAccount(newUser.id);
        } catch (err) {
            console.warn("Compte bancaire non créé :", err.message);
        }

        // 10. Envoyer l'email de vérification
        await emailService.sendVerificationEmail(email, token, req);

        return newUser;
    },

    // Connexion
    async login(identifier, password) {
        if (!identifier || !password) {
            throw new Error("Veuillez saisir votre identifiant et votre mot de passe.");
        }

        const user = await userRepository.findByEmail(identifier);
        if (!user) {
            throw new Error("Identifiant ou mot de passe incorrect.");
        }

        const isMatch = await bcrypt.compare(password, user.mot_de_passe_hash);
        if (!isMatch) {
            throw new Error("Identifiant ou mot de passe incorrect.");
        }

        if (user.compte_verrouille) {
            throw new Error("Votre compte a été désactivé par l'administration. Veuillez contacter votre banque.");
        }

        if (user.role === "CLIENT" && !user.email_verifie) {
            throw new Error("Votre adresse e-mail n'est pas encore vérifiée. Veuillez cliquer sur le lien envoyé par email.");
        }

        return user;
    },

    // Vérification de l'email
    async verifyEmail(token) {
        if (!token) {
            throw new Error("Jeton de vérification manquant.");
        }

        const user = await userRepository.findByToken(token);
        if (!user) {
            throw new Error("Ce lien de vérification est invalide ou a expiré.");
        }

        await userRepository.verifyEmail(user.id);
        return user;
    }
};

module.exports = authService;
