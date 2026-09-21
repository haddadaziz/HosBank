require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const advisorRoutes = require("./src/routes/advisorRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    name: "hosbank_session",
    secret: process.env.SESSION_SECRET || "hosbank-dev-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    res.locals.user = req.session ? req.session.user : null;
    res.locals.admin = req.session ? req.session.admin : null;
    res.locals.advisor = req.session ? req.session.advisor : null;
    res.locals.currentPath = req.path;
// Rendre l'utilisateur connecté accessible dans toutes les vues EJS
app.use((req, res, next) => {
    res.locals.user = req.session ? req.session.user : null;
    next();
});

app.get("/", (req, res) => {
    res.render("home", { title: "HosBank | Une banque radicalement différente" });
});

app.use("/", authRoutes);
app.use("/client", clientRoutes);
app.use("/advisor", advisorRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
    res.status(404).send("Page non trouvée");
});

app.listen(PORT, () => {
    console.log(`HosBank démarré avec succès sur http://localhost:${PORT}`);
    console.log(`Page de Connexion Unique : http://localhost:${PORT}/login`);
});