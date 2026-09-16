const db = require("../config/db");

class AccountRepository {
    async findAll() {
        const query = `
            SELECT 
                a.id, a.iban, a.account_type AS "type", a.client_id AS "clientId",
                a.balance::float, a.currency, a.status,
                (c.first_name || ' ' || c.last_name) AS "clientName",
                COALESCE((SELECT card_type FROM cards WHERE account_id = a.id LIMIT 1), '-') AS "cardType",
                COALESCE((SELECT status FROM cards WHERE account_id = a.id LIMIT 1), '-') AS "cardStatus",
                (SELECT COUNT(*)::int FROM cards WHERE account_id = a.id) AS "cardsCount"
            FROM accounts a
            JOIN clients c ON a.client_id = c.id
            ORDER BY a.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async createAccount({ id, iban, accountType, clientId, balance = 0.00, currency = 'EUR' }) {
        const query = `
            INSERT INTO accounts (id, iban, account_type, client_id, balance, currency, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Actif')
            RETURNING *
        `;
        const result = await db.query(query, [id, iban, accountType, clientId, balance, currency]);
        return result.rows[0];
    }

    async toggleCardStatus(accountId) {
        const query = `
            UPDATE cards 
            SET status = CASE WHEN status = 'Active' THEN 'Bloquée' ELSE 'Active' END
            WHERE account_id = $1
            RETURNING *
        `;
        const result = await db.query(query, [accountId]);
        return result.rows[0] || null;
    }
}

module.exports = new AccountRepository();
