const authService = require("../services/authService");

const authController = {
    getLogin: (req, res) => {
        res.render("auth/auth", {
            title: "Connexion | HosBank",
            initialMode: "login",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || "",
            devToken: req.query.devToken || null
        });
    },

    getRegister: (req, res) => {
        res.render("auth/auth", {
            title: "Inscription | HosBank",
            initialMode: "register",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || "",
            devToken: null
        });
    },

    postRegister: async (req, res) => {
        try {
            const user = await authService.register(req.body, req);
            let redirectUrl = "/login?message=" + encodeURIComponent("Compte créé avec succès ! Un e-mail d'activation vous a été envoyé.");
            if (user && user.token) {
                redirectUrl += "&devToken=" + encodeURIComponent(user.token);
            }
            res.redirect(redirectUrl);
        } catch (err) {
            res.redirect("/register?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(req.body.email || ""));
        }
    },

    postLogin: async (req, res) => {
        try {
            const identifier = req.body.name || req.body.email;
            const password = req.body.password;

            const user = await authService.login(identifier, password);

            req.session.user = {
                id: user.id,
                name: `${user.prenom} ${user.nom}`,
                email: user.email,
                role: user.role,
                civilite: user.civilite
            };

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
            return res.redirect("/client/dashboard");

        } catch (err) {
            const emailInput = req.body.name || req.body.email || "";
            res.redirect("/login?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(emailInput));
        }
    },

    getVerifyEmail: async (req, res) => {
        try {
            const token = req.query.token;
            await authService.verifyEmail(token);
            res.redirect("/login?message=" + encodeURIComponent("Votre adresse e-mail a été vérifiée avec succès ! Vous pouvez vous connecter."));
        } catch (err) {
            res.redirect("/login?error=" + encodeURIComponent(err.message));
        }
    },
    getLogout: (req, res) => {
        if (req.session) {
            req.session.destroy(() => {
                res.redirect("/login");
            });
        } else {
            res.redirect("/login");
        }
    }
};

module.exports = authController;
