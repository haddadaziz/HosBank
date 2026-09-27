const authService = require("../services/authService");

const authController = {
    getLogin(req, res) {
        res.render("auth/auth", {
            title: "Connexion | HosBank",
            initialMode: "login",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || "",
            devToken: req.query.devToken || null
        });
    },

    getRegister(req, res) {
        res.render("auth/auth", {
            title: "Inscription | HosBank",
            initialMode: "register",
            error: req.query.error || null,
            message: req.query.message || null,
            email: req.query.email || "",
            devToken: null
        });
    },

    // Traitement du formulaire d'inscription
    async postRegister(req, res) {
        try {
            const donneesFormulaire = req.body;
            const nouveauClient = await authService.register(donneesFormulaire, req);

            let urlRedirection = "/login?message=" + encodeURIComponent("Compte créé avec succès ! Un e-mail d'activation vous a été envoyé.");
            if (nouveauClient && nouveauClient.token) {
                urlRedirection = urlRedirection + "&devToken=" + encodeURIComponent(nouveauClient.token);
            }
            return res.redirect(urlRedirection);
        } catch (erreur) {
            const messageErreur = erreur.message;
            const emailSaisi = req.body.email || "";
            return res.redirect("/register?error=" + encodeURIComponent(messageErreur) + "&email=" + encodeURIComponent(emailSaisi));
        }
    },

    async postLogin(req, res) {
        try {
            const identifier = (req.body.email || req.body.name || "").trim();
            const password = req.body.password;

            const user = await authService.login(identifier, password);

            const userInitials = ((user.prenom ? user.prenom.trim().charAt(0) : "") + (user.nom ? user.nom.trim().charAt(0) : "")).toUpperCase() || "AM";

            req.session.user = {
                id: user.id,
                name: `${user.prenom} ${user.nom}`,
                prenom: user.prenom,
                nom: user.nom,
                email: user.email,
                role: user.role,
                civilite: user.civilite,
                avatar: userInitials
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
                    avatar: userInitials
                };
                return res.redirect("/advisor/dashboard");
            }

            return res.redirect("/client/dashboard");
        } catch (err) {
            const emailInput = (req.body && (req.body.email || req.body.name)) || "";
            res.redirect("/login?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(emailInput));
        }
    },

    // Traitement du lien de confirmation d'email
    async getVerifyEmail(req, res) {
        try {
            const token = req.query.token;
            await authService.verifyEmail(token);

            const messageSucces = "Votre adresse e-mail a été vérifiée avec succès ! Vous pouvez maintenant vous connecter.";
            return res.redirect("/login?message=" + encodeURIComponent(messageSucces));
        } catch (erreur) {
            const messageErreur = erreur.message;
            return res.redirect("/login?error=" + encodeURIComponent(messageErreur));
        }
    },

    // Deconnexion immediate en 1 clic (destruction session et purge cookie)
    logout(req, res) {
        // 1. Supprimer le cookie de session sur le navigateur du client
        res.clearCookie("hosbank_session", { path: "/" });

        // 2. Detruire la session cote serveur si elle existe
        if (req.session) {
            req.session.user = null;
            req.session.advisor = null;
            req.session.admin = null;

            req.session.destroy(() => {
                const message = "Vous avez été déconnecté avec succès.";
                return res.redirect("/login?message=" + encodeURIComponent(message));
            });
        } else {
            return res.redirect("/login");
        }
    }
};

module.exports = authController;
