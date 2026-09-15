const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const advisorRoutes = require("./src/routes/advisorRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du moteur de templates EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Middlewares pour parser les requêtes
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Session utilisateur
app.use(session({
    secret: "hosbank-secure-admin-session-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Route d'accueil
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Routes d'authentification
app.use("/", authRoutes);

// Routes Client
app.use("/client", clientRoutes);

// Routes Chargé Client
app.use("/advisor", advisorRoutes);

// Routes Administration
app.use("/admin", adminRoutes);

// Gestion des routes inexistantes
app.use((req, res) => {
    res.status(404).send("Page non trouvée");
});

app.listen(PORT, () => {
    console.log(`HosBank démarré avec succès sur http://localhost:${PORT}`);
    console.log(`Espace Administration : http://localhost:${PORT}/admin/login`);
});