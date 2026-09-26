const db = require("../config/db");

// =========================================================================
// REPOSITORY : JOURNAL D'AUDIT (CODE DÉVELOPPEUR JUNIOR)
// =========================================================================
const auditRepository = {

    // 1. Récupérer les dernières actions du journal d'audit
    async findAll(limit = 50) {
        const query = `
            SELECT 
                ja.id,
                (u.prenom || ' ' || u.nom) AS admin_nom,
                ja.action,
                ja.adresse_ip,
                TO_CHAR(ja.date_action, 'YYYY-MM-DD HH24:MI:SS') AS date_action_fr
            FROM journal_audit ja
            LEFT JOIN utilisateurs u ON ja.utilisateur_id = u.id
            ORDER BY ja.date_action DESC
            LIMIT $1
        `;

        const result = await db.query(query, [limit]);

        // Transformation simple en JavaScript (Style Junior)
        const logs = [];
        for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows[i];
            const actionTexte = (row.action || '').toLowerCase();

            // Déterminer le niveau de sévérité simplement
            let gravite = 'Info';
            if (actionTexte.includes('rejet') || actionTexte.includes('opposition') || actionTexte.includes('alerte')) {
                gravite = 'Alerte';
            } else if (actionTexte.includes('bloqu') || actionTexte.includes('avertissement')) {
                gravite = 'Avertissement';
            }

            logs.push({
                id: row.id,
                adminUser: row.admin_nom || 'Administrateur HosBank',
                action: row.action,
                ip: row.adresse_ip || '127.0.0.1',
                severity: gravite,
                timestamp: row.date_action_fr
            });
        }

        return logs;
    },

    // 2. Enregistrer une nouvelle action dans le journal d'audit
    async log({ adminUser, action, ip = '127.0.0.1', severity = 'Info', entiteCible = null, idEntiteCible = null, detail = null }) {
        const query = `
            INSERT INTO journal_audit (action, adresse_ip, nouvelle_valeur, entite_cible, id_entite_cible)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const safeAction = (action || "ACTION").substring(0, 80);
        const description = detail ? `${detail} | Gravité: ${severity} | Opérateur: ${adminUser}` : `Gravité: ${severity} | Opérateur: ${adminUser}`;
        const result = await db.query(query, [safeAction, ip, description, entiteCible, idEntiteCible]);
        return result.rows[0];
    }
};

module.exports = auditRepository;

