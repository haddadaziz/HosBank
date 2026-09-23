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

const requireClientAuth = requireRole("CLIENT");
const requireAdvisorAuth = requireRole("CHARGE_CLIENT");
const requireAdminAuth = requireRole("ADMINISTRATEUR");

const isAuthenticated = (req, res, next) => {
    const currentUser = req.session?.user || req.session?.advisor || req.session?.admin;
    if (currentUser) {
        req.user = currentUser;
        return next();
    }
    res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
};

const hasRole = (role) => requireRole(role);

const isGuest = (req, res, next) => {
    const currentUser = req.session?.user || req.session?.advisor || req.session?.admin;
    if (currentUser) {
        if (currentUser.role === "ADMINISTRATEUR") return res.redirect("/admin/dashboard");
        if (currentUser.role === "CHARGE_CLIENT") return res.redirect("/advisor/dashboard");
        return res.redirect("/client/dashboard");
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
