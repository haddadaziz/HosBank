const db = require('./src/config/db');

async function clean() {
    try {
        const res = await db.query("DELETE FROM demandes WHERE type_demande = 'OPPOSITION_CARTE'");
        console.log('Deleted rows:', res.rowCount);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

clean();
