const authService = require("../services/authService");

const authController = {
    // Afficher la page de connexion
    getLogin: (req, res) => {
        res.render("auth/auth", {
            title: "Connexion | HosBank",
            initialMode: "login",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || ""
        });
    },

    // Afficher la page d'inscription
    getRegister: (req, res) => {
        res.render("auth/auth", {
            title: "Inscription | HosBank",
            initialMode: "register",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || ""
        });
    },

    // Traitement de l'inscription
    postRegister: async (req, res) => {
        try {
            await authService.register(req.body, req);
            res.redirect("/login?message=" + encodeURIComponent("Compte créé avec succès ! Un e-mail d'activation vous a été envoyé."));
        } catch (err) {
            res.redirect("/register?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(req.body.email || ""));
    // 1. Détection Profil Administrateur
    if (identifier.includes("admin")) {
        if (req.session) {
            req.session.admin = {
                id: "ADM-001",
                name: "Administrateur HosBank",
                email: identifier,
                role: "ADMINISTRATEUR",
                avatar: "HB"
            };
        }
    },

    // Traitement de la connexion
    postLogin: async (req, res) => {
        try {
            const identifier = req.body.name || req.body.email;
            const password = req.body.password;

            const user = await authService.login(identifier, password);

            // Enregistrer la session utilisateur
            req.session.user = {
                id: user.id,
                name: `${user.prenom} ${user.nom}`,
                email: user.email,
                role: user.role,
                civilite: user.civilite
    // 2. Détection Profil Conseiller
    if (identifier.includes("advisor") || identifier.includes("conseil") || identifier.includes("bennani")) {
        if (req.session) {
            req.session.advisor = {
                id: "ADV-104",
                name: "Karim Bennani",
                role: "CHARGE_CLIENT",
                agency: "Agence Casablanca Finance City",
                avatar: "KB"
            };

            // Rétrocompatibilité avec les espaces Admin et Conseiller existants
            if (user.role === "ADMINISTRATEUR") {
                req.session.admin = {
                    id: user.id,
                    name: `${user.prenom} ${user.nom}`,
                    email: user.email,
                    role: "Super Admin"
                };
                return res.redirect("/admin/dashboard");
            }

            if (user.role === "CHARGE_CLIENT") {
                req.session.advisor = {
                    id: user.id,
                    name: `${user.prenom} ${user.nom}`,
                    email: user.email,
                    role: "Chargé de Clientèle"
                };
                return res.redirect("/advisor/dashboard");
            }

            // Client par défaut
            return res.redirect("/client/dashboard");

        } catch (err) {
            const emailInput = req.body.name || req.body.email || "";
            res.redirect("/login?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(emailInput));
        }
    },

    // Validation de l'adresse email par le lien reçu
    getVerifyEmail: async (req, res) => {
        try {
            const token = req.query.token;
            await authService.verifyEmail(token);
            res.redirect("/login?message=" + encodeURIComponent("Votre adresse e-mail a été vérifiée avec succès ! Vous pouvez vous connecter."));
        } catch (err) {
            res.redirect("/login?error=" + encodeURIComponent(err.message));
        }
    },

    // Déconnexion
    getLogout: (req, res) => {
        if (req.session) {
            req.session.destroy(() => {
                res.redirect("/login");
            });
        } else {
            res.redirect("/login");
        }
    // 3. Espace Client par défaut
    if (req.session) {
        req.session.user = {
            id: 3,
            name: req.body.name || "Alexandre Moreau",
            email: identifier || "alexandre.moreau@email.fr",
            role: "CLIENT",
            avatar: "AM"
        };
    }
};

module.exports = authController;
