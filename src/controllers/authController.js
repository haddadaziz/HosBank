exports.getLogin = (req, res) => {
    res.render("auth/auth", {
        title: "Connexion | HosBank",
        initialMode: "login",
        error: null,
        message: null
    });
};

exports.getRegister = (req, res) => {
    res.render("auth/auth", {
        title: "Inscription | HosBank",
        initialMode: "register",
        error: null,
        message: null
    });
};

exports.postLogin = (req, res) => {
    res.redirect("/login");
};

exports.postRegister = (req, res) => {
    res.redirect("/login");
};
