exports.requireClientAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
};

exports.requireAdvisorAuth = (req, res, next) => {
    if (!req.session || (!req.session.advisor && req.session.user?.role !== "CHARGE_CLIENT")) {
        return res.redirect("/login");
    }
    next();
};

exports.requireAdminAuth = (req, res, next) => {
    if (!req.session || (!req.session.admin && req.session.user?.role !== "ADMINISTRATEUR")) {
        return res.redirect("/login");
    }
    next();
};

exports.isAuthenticated = (req, res, next) => {
    if (req.session && (req.session.user || req.session.admin || req.session.advisor)) {
        return next();
    }
    res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
};

exports.hasRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            return next();
        }
        res.status(403).send("Accès refusé : vous n'avez pas les permissions nécessaires.");
    };
};

exports.isGuest = (req, res, next) => {
    if (req.session) {
        if (req.session.admin || req.session.user?.role === "ADMINISTRATEUR") return res.redirect("/admin/dashboard");
        if (req.session.advisor || req.session.user?.role === "CHARGE_CLIENT") return res.redirect("/advisor/dashboard");
        if (req.session.user) return res.redirect("/client/dashboard");
    }
    next();
};
