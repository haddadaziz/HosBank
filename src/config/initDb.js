const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function initializeDatabase() {
    const config = {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres"
    };

    const targetDb = process.env.DB_NAME || "hosbank";

    console.log("🏦 HosBank - Initialisation de la Base de Données Réelle (PostgreSQL)");
    console.log(`🔌 Connexion au serveur PostgreSQL sur ${config.host}:${config.port}...`);

    // 1. Connexion au serveur Postgres par défaut pour créer la base si inexistante
    const rootClient = new Client({ ...config, database: "postgres" });

    try {
        await rootClient.connect();
        const checkDb = await rootClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [targetDb]
        );

        if (checkDb.rows.length === 0) {
            console.log(`📦 Création de la base de données "${targetDb}"...`);
            await rootClient.query(`CREATE DATABASE "${targetDb}"`);
            console.log(`✅ Base "${targetDb}" créée avec succès.`);
        } else {
            console.log(`ℹ️ La base de données "${targetDb}" existe déjà.`);
        }
    } catch (err) {
        console.warn(`⚠️ Note lors de la vérification de la base: ${err.message}`);
    } finally {
        await rootClient.end();
    }

    // 2. Connexion à la base cible et exécution de schema.sql
    const appClient = new Client({ ...config, database: targetDb });

    try {
        await appClient.connect();
        console.log(`🚀 Exécution du script schema.sql sur "${targetDb}"...`);

        const sqlFilePath = path.join(__dirname, "..", "..", "schema.sql");
        const sql = fs.readFileSync(sqlFilePath, "utf-8");

        await appClient.query(sql);

        const clientsCount = await appClient.query("SELECT COUNT(*) FROM clients");
        const accountsCount = await appClient.query("SELECT COUNT(*) FROM accounts");
        const txCount = await appClient.query("SELECT COUNT(*) FROM transactions");

        console.log("\n=======================================================");
        console.log("🎉 BASE DE DONNÉES INITIALISÉE AVEC SUCCÈS !");
        console.log(`👥 Clients enregistrés    : ${clientsCount.rows[0].count}`);
        console.log(`💳 Comptes bancaires      : ${accountsCount.rows[0].count}`);
        console.log(`💸 Flux et transactions   : ${txCount.rows[0].count}`);
        console.log("=======================================================\n");
    } catch (err) {
        console.error("❌ Erreur lors de l'exécution du schéma :", err.message);
        console.error("Assurez-vous que PostgreSQL est démarré et que les identifiants dans .env sont corrects.");
    } finally {
        await appClient.end();
    }
}

initializeDatabase();
