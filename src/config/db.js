const { Pool } = require("pg");

// Configuration du pool de connexions PostgreSQL (style développeur junior)
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "hosbank",
    max: 20,                         // Nombre maximum de connexions simultanées
    idleTimeoutMillis: 30000,        // Déconnecter après 30 secondes d'inactivité
    connectionTimeoutMillis: 3000    // Temps limite d'attente d'une connexion (3 secondes)
});

// Écouter les erreurs inattendues sur les clients inactifs
pool.on("error", function (err) {
    console.error("Erreur inattendue sur le client PostgreSQL :", err.message);
});

// Fonction simple pour exécuter une requête SQL
function query(text, params) {
    return pool.query(text, params);
}

module.exports = {
    query: query,
    pool: pool
};