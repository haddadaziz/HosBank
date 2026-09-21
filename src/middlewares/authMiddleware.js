exports.requireClientAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
};

exports.requireAdvisorAuth = (req, res, next) => {
    if (!req.session || !req.session.advisor) {
        return res.redirect("/login");
    }
    next();
};

exports.requireAdminAuth = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.redirect("/login");
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

