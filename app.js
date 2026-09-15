const express = require("express");
const session = require("express-session");
const path = require("path");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du moteur de templates EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Middlewares pour parser les corps de requêtes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Session utilisateur / admin
app.use(session({
    secret: "hosbank-secure-admin-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Routes de l'administration
app.use("/admin", adminRoutes);

// Redirection d'accueil vers l'espace admin ou rendu de la page d'accueil
app.get("/", (req, res) => {
    res.redirect("/admin/login");
});

app.listen(PORT, () => {
    console.log(`🏦 HosBank démarré avec succès sur http://localhost:${PORT}`);
    console.log(`👉 Espace Administration : http://localhost:${PORT}/admin/login`);
});