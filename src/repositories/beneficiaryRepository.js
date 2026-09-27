const db = require("../config/db");

const beneficiaryRepository = {
    // 1. Récupérer tous les bénéficiaires d'un client (style développeur junior)
    async findByUserId(userId) {
        // Requête SQL simple avec formatage de la date en JJ/MM/AAAA
        const query = `
            SELECT 
                id,
                utilisateur_id AS "userId",
                intitule,
                iban,
                bic,
                TO_CHAR(date_ajout, 'DD/MM/YYYY') AS "dateAjout"
            FROM beneficiaires
            WHERE utilisateur_id = $1
            ORDER BY date_ajout DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    },

    /**
     * Vérifie si un IBAN est déjà enregistré pour cet utilisateur
     */
    async findByIban(userId, iban) {
        const normalizedIban = iban.replace(/\s+/g, "").toUpperCase();
        const query = `
            SELECT id, intitule, iban 
            FROM beneficiaires 
            WHERE utilisateur_id = $1 
              AND REPLACE(UPPER(iban), ' ', '') = $2
            LIMIT 1
        `;
        const result = await db.query(query, [userId, normalizedIban]);
        return result.rows[0] || null;
    },

    /**
     * Crée un nouveau bénéficiaire
     */
    async create({ userId, intitule, iban, bic }) {
        const query = `
            INSERT INTO beneficiaires (utilisateur_id, intitule, iban, bic)
            VALUES ($1, $2, $3, $4)
            RETURNING 
                id,
                utilisateur_id AS "userId",
                intitule,
                iban,
                bic,
                TO_CHAR(date_ajout, 'DD/MM/YYYY') AS "dateAjout"
        `;
        const result = await db.query(query, [userId, intitule.trim(), iban.trim(), bic ? bic.trim().toUpperCase() : null]);
        return result.rows[0];
    },

    // 4. Supprimer un bénéficiaire du client (style développeur junior)
    async delete(id, userId) {
        // Suppression sécurisée : on filtre par ID ET par utilisateur_id
        const query = `
            DELETE FROM beneficiaires
            WHERE id = $1 AND utilisateur_id = $2
            RETURNING id
        `;
        const result = await db.query(query, [id, userId]);
        return result.rows[0] || null;
    }
};

module.exports = beneficiaryRepository;
