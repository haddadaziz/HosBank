const db = require("../config/db");

const accountRepository = {
    async findAll() {
        const query = `
            SELECT 
                cb.id,
                cb.numero_compte AS "numeroCompte",
                cb.iban,
                cb.bic,
                CASE 
                    WHEN cb.type_compte = 'COURANT' THEN 'Compte Courant'
                    WHEN cb.type_compte = 'EPARGNE' THEN 'Compte Épargne'
                    ELSE cb.type_compte::text
                END AS "type",
                cb.solde::float AS "balance",
                cb.devise AS "currency",
                CASE 
                    WHEN cb.statut = 'ACTIF' THEN 'Actif'
                    WHEN cb.statut = 'BLOQUE' THEN 'Bloqué'
                    WHEN cb.statut = 'CLOTURE' THEN 'Clôturé'
                    ELSE cb.statut::text
                END AS "status",
                ('CLI-' || cb.utilisateur_id) AS "clientId",
                (u.prenom || ' ' || u.nom) AS "clientName",
                u.email AS "clientEmail",
                COALESCE((
                    SELECT card.type_carte || ' (' || card.pan_masque || ')'
                    FROM cartes_bancaires card 
                    WHERE card.compte_id = cb.id 
                    ORDER BY card.id DESC LIMIT 1
                ), '-') AS "cardType",
                COALESCE((
                    SELECT CASE 
                        WHEN card.statut = 'ACTIVE' THEN 'Active'
                        ELSE 'Bloquée'
                    END
                    FROM cartes_bancaires card 
                    WHERE card.compte_id = cb.id 
                    ORDER BY card.id DESC LIMIT 1
                ), '-') AS "cardStatus",
                (SELECT COUNT(*)::int FROM cartes_bancaires card WHERE card.compte_id = cb.id) AS "cardsCount"
            FROM comptes_bancaires cb
            JOIN utilisateurs u ON cb.utilisateur_id = u.id
            ORDER BY cb.id ASC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    async findById(id) {
        const query = `SELECT * FROM comptes_bancaires WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    async toggleAccountStatus(accountId) {
        const query = `
            UPDATE comptes_bancaires
            SET statut = CASE WHEN statut = 'ACTIF' THEN 'BLOQUE'::statut_compte ELSE 'ACTIF'::statut_compte END
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [accountId]);
        return result.rows[0] || null;
    },

    async toggleCardStatus(accountId) {
        const query = `
            UPDATE cartes_bancaires
            SET statut = CASE WHEN statut = 'ACTIVE' THEN 'BLOQUEE_TEMPORAIREMENT'::statut_carte ELSE 'ACTIVE'::statut_carte END
            WHERE compte_id = $1
            RETURNING *
        `;
        const result = await db.query(query, [accountId]);
        return result.rows[0] || null;
    }
};

module.exports = accountRepository;
