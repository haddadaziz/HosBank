const db = require("../config/db");

const beneficiaryRepository = {
    /**
     * Récupère tous les bénéficiaires d'un utilisateur donné
     */
    async findByUserId(userId) {
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

    /**
     * Supprime un bénéficiaire appartenant à l'utilisateur
     */
    async delete(id, userId) {
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
