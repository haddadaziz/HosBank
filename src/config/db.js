const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "hosbank",
    max: 20, // Pool élargi à 20 connexions pour supporter les montées en charge
    idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
    connectionTimeoutMillis: 3000 // Timeout rapide à 3s pour éviter les blocages
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};