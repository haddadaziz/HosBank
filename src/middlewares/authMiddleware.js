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
