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
    },

    async createPhysicalCard(accountId, monthlyLimit = 3000.00) {
        const crypto = require("crypto");
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const panMasque = `•••• •••• •••• ${last4}`;
        const panHash = crypto.createHash('sha256').update(`PHYSICAL-${accountId}-${Date.now()}-${last4}`).digest('hex');
        const pinHash = crypto.createHash('sha256').update("1234").digest('hex');
        
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 4);
        const expiryStr = `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, '0')}-28`;

        const query = `
            INSERT INTO cartes_bancaires 
                (compte_id, pan_masque, pan_hash, date_expiration, code_pin_hash, type_carte, statut, plafond_paiement_mensuel, plafond_retrait_hebdo)
            VALUES 
                ($1, $2, $3, $4, $5, 'PHYSIQUE', 'ACTIVE', $6, 1000.00)
            RETURNING *
        `;
        const result = await db.query(query, [
            accountId,
            panMasque,
            panHash,
            expiryStr,
            pinHash,
            monthlyLimit
        ]);
        return result.rows[0];
    }
};

module.exports = cardRepository;
