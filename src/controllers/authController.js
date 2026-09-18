exports.getLogin = (req, res) => {
    res.render("auth/auth", {
        title: "Connexion | HosBank",
        initialMode: "login",
        error: req.query.error === "invalid_credentials" ? "Identifiants incorrects." : null,
        message: null,
        email: req.query.email || ""
    });
};

exports.getRegister = (req, res) => {
    res.render("auth/auth", {
        title: "Inscription | HosBank",
        initialMode: "register",
        error: null,
        message: null,
        email: req.query.email || ""
    });
};

exports.postLogin = (req, res) => {
    const identifier = (req.body.name || req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    // 1. Détection Profil Administrateur
    if (identifier.includes("admin")) {
        if (req.session) {
            req.session.admin = {
                id: "ADM-001",
                name: "Administrateur HosBank",
                email: identifier,
                role: "Super Admin",
                avatar: "HB"
            };
        }
        return res.redirect("/admin/dashboard");
    }

    // 2. Détection Profil Conseiller
    if (identifier.includes("advisor") || identifier.includes("conseil") || identifier.includes("bennani")) {
        if (req.session) {
            req.session.advisor = {
                id: "ADV-104",
                name: "Karim Bennani",
                role: "Chargé de Clientèle",
                agency: "Agence Casablanca Finance City",
                avatar: "KB"
            };
        }
        return res.redirect("/advisor/dashboard");
    }

    // 3. Espace Client par défaut
    if (req.session) {
        req.session.user = {
            id: 3,
            name: req.body.name || "Alexandre Moreau",
            email: identifier || "alexandre.moreau@email.fr",
            role: "Client Particulier",
            avatar: "AM"
        };
    }
    return res.redirect("/client/dashboard");
};

exports.postRegister = (req, res) => {
    // Redirection vers la connexion après inscription
    res.redirect("/login?registered=true");
};
