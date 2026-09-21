// Middlewares de protection des routes et des rôles

// Vérifier que l'utilisateur est connecté
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
};

// Vérifier le rôle de l'utilisateur (CLIENT, CHARGE_CLIENT, ADMINISTRATEUR)
exports.hasRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            return next();
        }
        res.status(403).send("Accès refusé : vous n'avez pas les permissions nécessaires.");
    };
};

// Empêcher un utilisateur déjà connecté d'accéder à la page de login
exports.isGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === "ADMINISTRATEUR") return res.redirect("/admin/dashboard");
        if (req.session.user.role === "CHARGE_CLIENT") return res.redirect("/advisor/dashboard");
        return res.redirect("/client/dashboard");
    }
    next();
};

exports.isGuest = (req, res, next) => {
    if (req.session) {
        if (req.session.admin) return res.redirect("/admin/dashboard");
        if (req.session.advisor) return res.redirect("/advisor/dashboard");
        if (req.session.user) return res.redirect("/client/dashboard");
    }
    next();
};

