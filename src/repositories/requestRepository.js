const db = require("../config/db");

const requestRepository = {
    async findAllDemandes() {
        const query = `
            SELECT 
                d.id,
                d.reference,
                d.type_demande AS "type",
                CASE 
                    WHEN d.type_demande = 'OUVERTURE_EPARGNE' THEN 'Ouverture Livret Épargne'
                    WHEN d.type_demande = 'DEMANDE_RIB' THEN 'Demande d''édition RIB'
                    WHEN d.type_demande = 'CARTE_VIRTUELLE' THEN 'Émission Carte Virtuelle'
                    WHEN d.type_demande = 'OPPOSITION_CARTE' THEN 'Opposition Carte Bancaire'
                    WHEN d.type_demande = 'RECALCUL_PIN' THEN 'Renouvellement Code PIN'
                    ELSE d.type_demande::text
                END AS "typeLibelle",
                d.statut,
                d.payload_json AS "payload",
                d.reponse_conseiller AS "reponse",
                d.motif_rejet AS "motifRejet",
                TO_CHAR(d.date_demande, 'YYYY-MM-DD HH24:MI') AS "dateDemande",
                (u.prenom || ' ' || u.nom) AS "clientName",
                u.email AS "clientEmail",
                ('CLI-' || u.id) AS "clientId"
            FROM demandes d
            JOIN utilisateurs u ON d.utilisateur_id = u.id
            ORDER BY d.date_demande DESC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    async findAllReclamations() {
        const query = `
            SELECT 
                r.id,
                r.reference,
                r.sujet,
                r.description,
                r.priorite,
                r.statut,
                r.reponse_conseiller AS "reponse",
                TO_CHAR(r.date_depot, 'YYYY-MM-DD HH24:MI') AS "dateDepot",
                (u.prenom || ' ' || u.nom) AS "clientName",
                u.email AS "clientEmail",
                ('CLI-' || u.id) AS "clientId"
            FROM reclamations r
            JOIN utilisateurs u ON r.utilisateur_id = u.id
            ORDER BY r.date_depot DESC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    async updateDemandeStatus(id, statut, reponseConseiller = null) {
        const query = `
            UPDATE demandes 
            SET statut = $1::statut_demande, 
                reponse_conseiller = COALESCE($2, reponse_conseiller),
                date_traitement = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(query, [statut, reponseConseiller, id]);
        return result.rows[0] || null;
    },

    async updateReclamationStatus(id, statut, reponseConseiller = null) {
        const query = `
            UPDATE reclamations 
            SET statut = $1::statut_reclamation, 
                reponse_conseiller = COALESCE($2, reponse_conseiller),
                date_cloture = CASE WHEN $1 IN ('RESOLUE', 'REJETEE') THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(query, [statut, reponseConseiller, id]);
        return result.rows[0] || null;
    }
};

module.exports = requestRepository;
