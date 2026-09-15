const db = require("../config/db");

class TransactionRepository {
    async findAll(limit = 100) {
        const query = `
            SELECT 
                id, reference, sender_account_id AS "senderAccountId",
                sender_name AS "sender", sender_iban AS "senderIban",
                recipient_name AS "recipient", recipient_iban AS "recipientIban",
                transaction_type AS "type", amount::float, currency,
                status, flagged, flag_reason AS "flagReason",
                TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS "date"
            FROM transactions
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await db.query(query, [limit]);
        return result.rows;
    }

    async updateStatus(id, status) {
        const query = `
            UPDATE transactions 
            SET status = $1, flagged = FALSE
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [status, id]);
        return result.rows[0] || null;
    }

    async getMetrics() {
        const clientsCountQuery = `SELECT COUNT(*)::int as count FROM clients`;
        const accountsCountQuery = `SELECT COUNT(*)::int as count FROM accounts WHERE status = 'Actif'`;
        const totalDepositsQuery = `SELECT COALESCE(SUM(balance), 0)::float as total FROM accounts`;
        const todayVolumeQuery = `
            SELECT COALESCE(SUM(ABS(amount)), 0)::float as volume 
            FROM transactions 
            WHERE created_at >= CURRENT_DATE
        `;
        const pendingKycQuery = `SELECT COUNT(*)::int as count FROM kyc_documents WHERE status = 'En attente'`;
        const flaggedTxQuery = `SELECT COUNT(*)::int as count FROM transactions WHERE flagged = TRUE`;

        const [clients, accounts, deposits, todayVolume, kyc, flagged] = await Promise.all([
            db.query(clientsCountQuery),
            db.query(accountsCountQuery),
            db.query(totalDepositsQuery),
            db.query(todayVolumeQuery),
            db.query(pendingKycQuery),
            db.query(flaggedTxQuery),
        ]);

        return {
            totalClients: clients.rows[0].count,
            activeAccounts: accounts.rows[0].count,
            totalDeposits: deposits.rows[0].total,
            todayTransactionsVolume: todayVolume.rows[0].volume,
            pendingKycCount: kyc.rows[0].count,
            flaggedTransactionsCount: flagged.rows[0].count
        };
    }
}

module.exports = new TransactionRepository();
