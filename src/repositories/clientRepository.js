const db = require("../config/db");

class ClientRepository {
    async findAll(search = "") {
        if (search) {
            const query = `
                SELECT 
                    c.id, c.gender, c.first_name AS "firstName", c.last_name AS "lastName",
                    c.email, c.phone, c.city, c.status, c.kyc_status AS "kycStatus",
                    c.risk_level AS "riskLevel", TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "joinedDate",
                    COUNT(a.id)::int AS "accountsCount",
                    COALESCE(SUM(a.balance), 0)::float AS "totalBalance"
                FROM clients c
                LEFT JOIN accounts a ON c.id = a.client_id
                WHERE 
                    LOWER(c.first_name) LIKE LOWER($1) OR
                    LOWER(c.last_name) LIKE LOWER($1) OR
                    LOWER(c.email) LIKE LOWER($1) OR
                    LOWER(c.id) LIKE LOWER($1)
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `;
            const result = await db.query(query, [`%${search}%`]);
            return result.rows;
        }

        const query = `
            SELECT 
                c.id, c.gender, c.first_name AS "firstName", c.last_name AS "lastName",
                c.email, c.phone, c.city, c.status, c.kyc_status AS "kycStatus",
                c.risk_level AS "riskLevel", TO_CHAR(c.created_at, 'YYYY-MM-DD') AS "joinedDate",
                COUNT(a.id)::int AS "accountsCount",
                COALESCE(SUM(a.balance), 0)::float AS "totalBalance"
            FROM clients c
            LEFT JOIN accounts a ON c.id = a.client_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async findById(id) {
        const query = `SELECT * FROM clients WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async create({ id, gender, firstName, lastName, email, phone, city }) {
        const query = `
            INSERT INTO clients (id, gender, first_name, last_name, email, phone, city, status, kyc_status, risk_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Actif', 'En cours', 'Faible')
            RETURNING *
        `;
        const result = await db.query(query, [id, gender, firstName, lastName, email, phone, city]);
        return result.rows[0];
    }

    async toggleStatus(id) {
        const query = `
            UPDATE clients 
            SET status = CASE WHEN status = 'Actif' THEN 'Suspendu' ELSE 'Actif' END
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async updateKycStatus(clientId, kycStatus) {
        const query = `UPDATE clients SET kyc_status = $1 WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [kycStatus, clientId]);
        return result.rows[0] || null;
    }
}

module.exports = new ClientRepository();
