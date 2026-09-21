const authService = require("../services/authService");

exports.getLogin = (req, res) => {
    res.render("auth/auth", {
        title: "Connexion | HosBank",
        initialMode: "login",
        error: req.query.error || null,
        message: req.query.message || null,
        email: req.query.email || ""
    });
};

exports.getRegister = (req, res) => {
    res.render("auth/auth", {
        title: "Inscription | HosBank",
        initialMode: "register",
        error: req.query.error || null,
        message: req.query.message || null,
        email: req.query.email || ""
    });
};

exports.postLogin = async (req, res) => {
    try {
        const email = req.body.email || req.body.name;
        const password = req.body.password;

        const user = await authService.login(email, password);

        if (user.role === "ADMINISTRATEUR") {
            req.session.admin = {
                id: user.id,
                name: `${user.prenom} ${user.nom}`,
                email: user.email,
                role: "Administrateur"
            };
            return res.redirect("/admin/dashboard");
        }

        if (user.role === "CHARGE_CLIENT") {
            req.session.advisor = {
                id: user.id,
                name: `${user.prenom} ${user.nom}`,
                email: user.email,
                role: "Chargé Client"
            };
            return res.redirect("/advisor/dashboard");
        }

        req.session.user = {
            id: user.id,
            name: `${user.prenom} ${user.nom}`,
            email: user.email,
            role: "Client"
        };
        return res.redirect("/client/dashboard");
    } catch (err) {
        return res.redirect("/login?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(req.body.email || ""));
    }
};

exports.postRegister = async (req, res) => {
    try {
        await authService.register(req.body, req);
        res.redirect("/login?message=" + encodeURIComponent("Inscription réussie ! Un lien de vérification a été envoyé à votre adresse e-mail."));
    } catch (err) {
        res.redirect("/register?error=" + encodeURIComponent(err.message) + "&email=" + encodeURIComponent(req.body.email || ""));
    }
};

exports.getVerifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        await authService.verifyEmail(token);
        res.redirect("/login?message=" + encodeURIComponent("Votre adresse e-mail a été vérifiée avec succès ! Vous pouvez maintenant vous connecter."));
    } catch (err) {
        res.redirect("/login?error=" + encodeURIComponent(err.message));
    }
};

exports.logout = (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie("hosbank_session");
            return res.redirect("/login?message=" + encodeURIComponent("Vous avez été déconnecté avec succès."));
        });
    } else {
        res.redirect("/login");
    }
};
