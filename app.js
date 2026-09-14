const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Importation des routeurs modulaires
const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const advisorRoutes = require("./src/routes/advisorRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

// Configuration du moteur de vues EJS
app.set("view engine", "ejs");
app.set("views", "./src/views");

// Middlewares
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Racine : redirection vers la connexion
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Montage des routes par domaine métier
app.use("/", authRoutes);           // /login, /register, /logout
app.use("/client", clientRoutes);   // Espace Client
app.use("/advisor", advisorRoutes); // Espace Chargé de Clientèle
app.use("/admin", adminRoutes);     // Espace Administrateur

// Gestion des routes 404 (Page non trouvée)
app.use((req, res) => {
    res.status(404).send("Page non trouvée");
});

app.listen(PORT, () => {
    console.log(`HosBank running on http://localhost:${PORT}`);
});