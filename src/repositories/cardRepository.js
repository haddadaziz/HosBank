const db = require("../config/db");

// =========================================================================
// REPOSITORY : GESTION DES CARTES BANCAIRES (STYLE DÉVELOPPEUR JUNIOR)
// =========================================================================
const cardRepository = {

    // 1. Récupérer la liste des cartes avec filtres simples (Type, Statut, Recherche)
    async findAll(filters = {}) {
        const typeFilter = filters.typeFilter;
        const statusFilter = filters.statusFilter;
        const searchQuery = filters.searchQuery;

        // Requête SQL claire : Jointure simple entre cartes, comptes et utilisateurs
        let sql = `
            SELECT 
                cb.id,
                cb.compte_id AS "compteId",
                cb.pan_masque AS "panMasque",
                cb.type_carte AS "rawType",
                cb.statut AS "rawStatus",
                TO_CHAR(cb.date_expiration, 'MM/YY') AS "dateExpiration",
                cb.plafond_paiement_mensuel AS "plafondPaiement",
                cb.plafond_retrait_hebdo AS "plafondRetrait",
                acc.numero_compte AS "numeroCompte",
                acc.iban AS "iban",
                (u.prenom || ' ' || u.nom) AS "clientName",
                u.email AS "clientEmail",
                ('CLI-' || u.id) AS "clientId"
            FROM cartes_bancaires cb
            JOIN comptes_bancaires acc ON cb.compte_id = acc.id
            JOIN utilisateurs u ON acc.utilisateur_id = u.id
            WHERE 1=1
        `;

        const parametres = [];

        // Filtre par type de carte (Critère 2 : PHYSIQUE ou VIRTUELLE)
        if (typeFilter && typeFilter !== "ALL") {
            parametres.push(typeFilter);
            sql += ` AND cb.type_carte = $${parametres.length}`;
        }

        // Filtre par statut (Critère 1 : ACTIVE, BLOQUEE_TEMPORAIREMENT, OPPOSEE)
        if (statusFilter && statusFilter !== "ALL") {
            parametres.push(statusFilter);
            sql += ` AND cb.statut = $${parametres.length}`;
        }

        // Filtre de recherche par mot-clé (Nom titulaire, email, IBAN ou masque de carte)
        if (searchQuery && searchQuery.trim() !== "") {
            parametres.push(`%${searchQuery.trim()}%`);
            sql += ` AND (
                (u.prenom || ' ' || u.nom) ILIKE $${parametres.length} OR
                u.email ILIKE $${parametres.length} OR
                acc.iban ILIKE $${parametres.length} OR
                cb.pan_masque ILIKE $${parametres.length}
            )`;
        }

        sql += ` ORDER BY cb.id ASC`;

        const result = await db.query(sql, parametres);
        return result.rows;
    },

    // 2. Récupérer une carte spécifique par son identifiant
    async findById(id) {
        const sql = `SELECT * FROM cartes_bancaires WHERE id = $1`;
        const result = await db.query(sql, [id]);
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
