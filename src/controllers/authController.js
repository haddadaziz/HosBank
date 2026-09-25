const authService = require("../services/authService");

const authController = {
    getLogin(req, res) {
        res.render("auth/auth", {
            title: "Connexion | HosBank",
            initialMode: "login",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || ""
        });
    },

    getRegister(req, res) {
        res.render("auth/auth", {
            title: "Inscription | HosBank",
            initialMode: "register",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || ""
        });
    },

    async postRegister(req, res) {
        try {
            await authService.register(req.body, req);
            res.redirect("/login?message=" + encodeURIComponent("Compte créé avec succès ! Un e-mail d'activation vous a été envoyé."));
        } catch (err) {
            res.redirect("/register?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(req.body.email || ""));
        }
    },

    async postLogin(req, res) {
        try {
            const identifier = (req.body.email || req.body.name || "").trim();
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
                    role: "Super Admin",
                    avatar: "HB"
                };
                return res.redirect("/admin/dashboard");
            }

            if (user.role === "CHARGE_CLIENT") {
                req.session.advisor = {
                    id: user.id,
                    name: `${user.prenom} ${user.nom}`,
                    email: user.email,
                    role: "Chargé de Clientèle",
                    avatar: "KB"
                };
                return res.redirect("/advisor/dashboard");
            }

            return res.redirect("/client/dashboard");
        } catch (err) {
            const emailInput = (req.body && (req.body.email || req.body.name)) || "";
            res.redirect("/login?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(emailInput));
        }
    },

    async getVerifyEmail(req, res) {
        try {
            const token = req.query.token;
            await authService.verifyEmail(token);
            res.redirect("/login?message=" + encodeURIComponent("Votre adresse e-mail a été vérifiée avec succès ! Vous pouvez maintenant vous connecter."));
        } catch (err) {
            res.redirect("/login?error=" + encodeURIComponent(err.message));
        }
    },

    logout(req, res) {
        if (req.session) {
            req.session.destroy(() => {
                res.clearCookie("hosbank_session");
                res.redirect("/login?message=" + encodeURIComponent("Vous avez été déconnecté avec succès."));
            });
        } else {
            res.redirect("/login");
        }
    }
};

module.exports = authController;
