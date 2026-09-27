const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.session) {
            return res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
        }

        const currentUser = req.session.user || req.session.advisor || req.session.admin;
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

// 1. Vérifier que l'utilisateur est un Client connecté
const requireClientAuth = (req, res, next) => {
    if (!req.session) {
        return res.redirect("/login");
    }

    // Si c'est un Administrateur, on le redirige vers l'espace administration
    if (req.session.admin || (req.session.user && req.session.user.role === "ADMINISTRATEUR")) {
        return res.redirect("/admin/dashboard");
    }

    // Si c'est un Conseiller, on le redirige vers l'espace conseiller
    if (req.session.advisor || (req.session.user && req.session.user.role === "CHARGE_CLIENT")) {
        return res.redirect("/advisor/dashboard");
    }

    if (!req.session.user) {
        return res.redirect("/login");
    }

    req.user = req.session.user;
    next();
};

// 2. Vérifier que l'utilisateur a le rôle Conseiller (CHARGE_CLIENT)
const requireAdvisorAuth = (req, res, next) => {
    if (!req.session) {
        return res.redirect("/login");
    }

    var estConseiller = false;
    if (req.session.advisor) {
        estConseiller = true;
    } else if (req.session.user && req.session.user.role === "CHARGE_CLIENT") {
        estConseiller = true;
    }

    if (!estConseiller) {
        return res.redirect("/login");
    }

    req.user = req.session.advisor || req.session.user;
    next();
};

// 3. Vérifier que l'utilisateur a le rôle Administrateur (ADMINISTRATEUR)
const requireAdminAuth = (req, res, next) => {
    if (!req.session) {
        return res.redirect("/login");
    }

    var estAdmin = false;
    if (req.session.admin) {
        estAdmin = true;
    } else if (req.session.user && req.session.user.role === "ADMINISTRATEUR") {
        estAdmin = true;
    }

    if (!estAdmin) {
        return res.redirect("/login");
    }

    req.user = req.session.admin || req.session.user;
    next();
};

// 4. Verifier si l'utilisateur est connecte (quel que soit son role)
const isAuthenticated = (req, res, next) => {
    if (!req.session) {
        return res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
    }

    const utilisateurConnecte = req.session.user || req.session.advisor || req.session.admin;
    if (utilisateurConnecte) {
        req.user = utilisateurConnecte;
        return next();
    }

    return res.redirect("/login?error=" + encodeURIComponent("Veuillez vous connecter pour accéder à cette page."));
};

// 5. Verifier si l'utilisateur a un role precis
const hasRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            req.user = req.session.user;
            return next();
        }
        return res.status(403).send("Accès refusé : vous n'avez pas les permissions nécessaires.");
    };
};

// 6. Verifier si l'utilisateur est un visiteur non connecte (pour afficher la page de login)
const isGuest = (req, res, next) => {
    if (!req.session) {
        return next();
    }

    // Si admin connecte, redirection vers le tableau de bord admin
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }

    // Si conseiller connecte, redirection vers le tableau de bord conseiller
    if (req.session.advisor) {
        return res.redirect("/advisor/dashboard");
    }

    // Si utilisateur connecte
    if (req.session.user) {
        if (req.session.user.role === "ADMINISTRATEUR") {
            return res.redirect("/admin/dashboard");
        }
        if (req.session.user.role === "CHARGE_CLIENT") {
            return res.redirect("/advisor/dashboard");
        }
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
