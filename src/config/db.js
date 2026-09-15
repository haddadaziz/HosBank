const { Pool } = require("pg");
require("dotenv").config();

// Pool de connexion PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "hosbank",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
});

let isConnected = false;

// Test de connexion initial
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.warn("\n⚠️  [PostgreSQL] Connexion à la base non établie (" + err.message + ").");
        console.warn("ℹ️  Pour connecter votre base PostgreSQL réelle :");
        console.warn("   1. Vérifiez vos identifiants dans le fichier .env");
        console.warn("   2. Lancez 'npm run db:init' pour créer les tables et insérer les données réelles.\n");
        isConnected = false;
    } else {
        console.log(`\n✅ [PostgreSQL] Connecté avec succès à la base "${process.env.DB_NAME || 'hosbank'}" sur ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}\n`);
        isConnected = true;
    }
});

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    isDbConnected: () => isConnected
};
