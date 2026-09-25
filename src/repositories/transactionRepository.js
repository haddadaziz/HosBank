const db = require("../config/db");

const transactionRepository = {
    async findAll(limit = 100) {
        return this.findWithFilters({ limit });
    },

    // Recherche avec filtres par montant, date et comptes impliqués (Critère 1 & 2)
    async findWithFilters(filters = {}) {
        const { searchQuery, minAmount, maxAmount, dateStart, dateEnd, limit = 200 } = filters;

        let query = `
            SELECT 
                v.id,
                v.reference_sepa AS "reference",
                TO_CHAR(v.date_execution, 'YYYY-MM-DD HH24:MI:SS') AS "date",
                (u.prenom || ' ' || u.nom) AS "sender",
                c.iban AS "senderIban",
                c.numero_compte AS "senderAccountNum",
                COALESCE(b.intitule, 'Bénéficiaire Externe') AS "recipient",
                COALESCE(b.iban, '-') AS "recipientIban",
                'Virement SEPA' AS "type",
                v.montant::float AS "amount",
                v.motif,
                CASE 
                    WHEN v.statut = 'VALIDE' THEN 'Validé'
                    WHEN v.statut = 'EN_ATTENTE' THEN 'En attente'
                    ELSE 'Bloqué'
                END AS "status",
                CASE 
                    WHEN v.montant >= 5000.00 THEN TRUE 
                    ELSE FALSE 
                END AS "flagged",
                CASE 
                    WHEN v.montant >= 5000.00 THEN 'Seuil réglementaire dépassé (>= 5 000 €)'
                    ELSE ''
                END AS "flagReason"
            FROM virements v
            JOIN comptes_bancaires c ON v.compte_emetteur_id = c.id
            JOIN utilisateurs u ON c.utilisateur_id = u.id
            LEFT JOIN beneficiaires b ON v.beneficiaire_id = b.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        // Filtre par comptes impliqués ou recherche textuelle
        if (searchQuery && searchQuery.trim() !== '') {
            query += ` AND (
                v.reference_sepa ILIKE $${paramIndex} OR
                (u.prenom || ' ' || u.nom) ILIKE $${paramIndex} OR
                c.iban ILIKE $${paramIndex} OR
                b.intitule ILIKE $${paramIndex} OR
                b.iban ILIKE $${paramIndex} OR
                v.motif ILIKE $${paramIndex}
            )`;
            params.push(`%${searchQuery.trim()}%`);
            paramIndex++;
        }

        // Filtre par montant minimum
        if (minAmount && !isNaN(minAmount)) {
            query += ` AND v.montant >= $${paramIndex}`;
            params.push(parseFloat(minAmount));
            paramIndex++;
        }

        // Filtre par montant maximum
        if (maxAmount && !isNaN(maxAmount)) {
            query += ` AND v.montant <= $${paramIndex}`;
            params.push(parseFloat(maxAmount));
            paramIndex++;
        }

        // Filtre par date de début
        if (dateStart) {
            query += ` AND v.date_execution >= $${paramIndex}::timestamp`;
            params.push(dateStart);
            paramIndex++;
        }

        // Filtre par date de fin
        if (dateEnd) {
            query += ` AND v.date_execution <= ($${paramIndex}::date + INTERVAL '1 day')`;
            params.push(dateEnd);
            paramIndex++;
        }

        query += ` ORDER BY v.date_execution DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    },

    async updateStatus(id, status) {
        const dbStatus = status === 'Validé' ? 'VALIDE' : (status === 'Rejeté' ? 'REJETE' : status);
        const query = `
            UPDATE virements 
            SET statut = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [dbStatus, id]);
        return result.rows[0] || null;
    },

    async getMetrics() {
        const clientsQuery = `SELECT COUNT(*)::int as count FROM utilisateurs WHERE role = 'CLIENT'`;
        const accountsQuery = `SELECT COUNT(*)::int as count FROM comptes_bancaires WHERE statut = 'ACTIF'`;
        const depositsQuery = `SELECT COALESCE(SUM(solde), 0)::float as total FROM comptes_bancaires`;
        const todayVolumeQuery = `
            SELECT COALESCE(SUM(montant), 0)::float as volume 
            FROM virements 
            WHERE date_execution >= CURRENT_DATE
        `;
        const flaggedQuery = `SELECT COUNT(*)::int as count FROM virements WHERE montant >= 5000.00`;

        const [clients, accounts, deposits, todayVolume, flagged] = await Promise.all([
            db.query(clientsQuery),
            db.query(accountsQuery),
            db.query(depositsQuery),
            db.query(todayVolumeQuery),
            db.query(flaggedQuery)
        ]);

        return {
            totalClients: clients.rows[0].count,
            activeAccounts: accounts.rows[0].count,
            totalDeposits: deposits.rows[0].total,
            todayTransactionsVolume: todayVolume.rows[0].volume,
            pendingKycCount: 0,
            flaggedTransactionsCount: flagged.rows[0].count
        };
    }
};

module.exports = transactionRepository;
