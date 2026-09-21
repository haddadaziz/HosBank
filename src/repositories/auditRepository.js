const db = require("../config/db");

const auditRepository = {
    async findAll(limit = 50) {
        const query = `
            SELECT 
                ja.id,
                COALESCE((u.prenom || ' ' || u.nom), 'Administrateur HosBank') AS "adminUser",
                ja.action,
                COALESCE(ja.adresse_ip, '127.0.0.1') AS "ip",
                CASE 
                    WHEN ja.action ILIKE '%rejet%' OR ja.action ILIKE '%opposition%' OR ja.action ILIKE '%alerte%' THEN 'Alerte'
                    WHEN ja.action ILIKE '%bloqu%' OR ja.action ILIKE '%avertissement%' THEN 'Avertissement'
                    ELSE 'Info'
                END AS "severity",
                TO_CHAR(ja.date_action, 'YYYY-MM-DD HH24:MI:SS') AS "timestamp"
            FROM journal_audit ja
            LEFT JOIN utilisateurs u ON ja.utilisateur_id = u.id
            ORDER BY ja.date_action DESC
            LIMIT $1
        `;
        const result = await db.query(query, [limit]);
        return result.rows;
    },

    async log({ adminUser, action, ip = '127.0.0.1', severity = 'Info' }) {
        const query = `
            INSERT INTO journal_audit (action, adresse_ip, nouvelle_valeur)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(query, [action, ip, `Gravité: ${severity} | Opérateur: ${adminUser}`]);
        return result.rows[0];
    }
};

module.exports = auditRepository;
