require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function init() {
  console.log('🔄 Initialisation de la base de données HosBank...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const seedsSql = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf8');

    console.log('⚙️  Exécution de schema.sql...');
    await pool.query(schemaSql);
    console.log('✅ Schéma créé avec succès.');

    console.log('🌱 Exécution de seeds.sql...');
    await pool.query(seedsSql);
    console.log('✅ Données de test insérées avec succès.');

    console.log('🎉 Base de données HosBank prête et initialisée avec succès !');
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base :", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
