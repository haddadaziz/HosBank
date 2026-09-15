const db = require("../config/db");

class AuditRepository {
    async findAll(limit = 50) {
        const query = `
            SELECT 
                id, admin_user AS "adminUser", action, ip_address AS "ip",
                severity, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS "timestamp"
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT $1
        `;
        const result = await db.query(query, [limit]);
        return result.rows;
    }

    async log({ adminUser, action, ip = '127.0.0.1', severity = 'Info' }) {
        const query = `
            INSERT INTO audit_logs (admin_user, action, ip_address, severity)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(query, [adminUser, action, ip, severity]);
        return result.rows[0];
    }
}

module.exports = new AuditRepository();
