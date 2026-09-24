const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        const currentUser = req.session?.user || req.session?.advisor || req.session?.admin;

        if (!currentUser) {
            return res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
        }

        if (!allowedRoles.includes(currentUser.role)) {
            return res.status(403).send("Accès refusé : vous n'avez pas les autorisations requises pour accéder à cette page.");
        }
        req.user = currentUser;
        next();
    };
};

const requireClientAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    req.user = req.session.user;
    next();
};

const requireAdvisorAuth = (req, res, next) => {
    if (!req.session || (!req.session.advisor && req.session.user?.role !== "CHARGE_CLIENT")) {
        return res.redirect("/login");
    }
    req.user = req.session.advisor || req.session.user;
    next();
};

const requireAdminAuth = (req, res, next) => {
    if (!req.session || (!req.session.admin && req.session.user?.role !== "ADMINISTRATEUR")) {
        return res.redirect("/login");
    }
    req.user = req.session.admin || req.session.user;
    next();
};

const isAuthenticated = (req, res, next) => {
    if (req.session && (req.session.user || req.session.admin || req.session.advisor)) {
        req.user = req.session.user || req.session.advisor || req.session.admin;
        return next();
    }
    res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
};

const hasRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            req.user = req.session.user;
            return next();
        }
        res.status(403).send("Accès refusé : vous n'avez pas les permissions nécessaires.");
    };
};

const isGuest = (req, res, next) => {
    if (req.session) {
        if (req.session.admin || req.session.user?.role === "ADMINISTRATEUR") return res.redirect("/admin/dashboard");
        if (req.session.advisor || req.session.user?.role === "CHARGE_CLIENT") return res.redirect("/advisor/dashboard");
        if (req.session.user) return res.redirect("/client/dashboard");
    }
    next();
};

module.exports = {
    requireRole,
    requireClientAuth,
    requireAdvisorAuth,
    requireAdminAuth,
    isAuthenticated,
    hasRole,
    isGuest
};
