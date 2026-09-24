const db = require("../config/db");

const cardRepository = {
    async findAll() {
        const query = `
            SELECT 
                cb.id,
                cb.compte_id AS "compteId",
                cb.pan_masque AS "panMasque",
                cb.type_carte AS "typeCarte",
                cb.statut,
                TO_CHAR(cb.date_expiration, 'MM/YY') AS "dateExpiration",
                cb.plafond_paiement_mensuel::float AS "plafondPaiement",
                cb.plafond_retrait_hebdo::float AS "plafondRetrait",
                cb.tentatives_pin_echec AS "tentativesPin",
                TO_CHAR(cb.date_creation, 'YYYY-MM-DD') AS "dateCreation",
                acc.numero_compte AS "numeroCompte",
                acc.iban,
                (u.prenom || ' ' || u.nom) AS "clientName",
                ('CLI-' || u.id) AS "clientId"
            FROM cartes_bancaires cb
            JOIN comptes_bancaires acc ON cb.compte_id = acc.id
            JOIN utilisateurs u ON acc.utilisateur_id = u.id
            ORDER BY cb.date_creation DESC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    async findById(id) {
        const query = `SELECT * FROM cartes_bancaires WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    async toggleStatus(cardId) {
        const query = `
            UPDATE cartes_bancaires
            SET statut = CASE 
                WHEN statut = 'ACTIVE' THEN 'BLOQUEE_TEMPORAIREMENT'::statut_carte 
                ELSE 'ACTIVE'::statut_carte 
            END
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [cardId]);
        return result.rows[0] || null;
    },

    async opposeCard(cardId) {
        const query = `
            UPDATE cartes_bancaires
            SET statut = 'OPPOSEE'::statut_carte
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [cardId]);
        return result.rows[0] || null;
    },

    async updateLimits(cardId, plafondPaiement, plafondRetrait) {
        const query = `
            UPDATE cartes_bancaires
            SET plafond_paiement_mensuel = $1, plafond_retrait_hebdo = $2
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(query, [plafondPaiement, plafondRetrait, cardId]);
        return result.rows[0] || null;
    }
};

module.exports = cardRepository;
