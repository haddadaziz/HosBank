const db = require("../config/db");

class KycRepository {
    async findAll() {
        const query = `
            SELECT 
                k.id, k.client_id AS "clientId", k.document_type AS "documentType",
                k.document_number AS "documentNumber", k.file_url AS "fileUrl",
                k.status, k.notes,
                TO_CHAR(k.submitted_at, 'YYYY-MM-DD HH24:MI') AS "submissionDate",
                (c.first_name || ' ' || c.last_name) AS "clientName"
            FROM kyc_documents k
            JOIN clients c ON k.client_id = c.id
            ORDER BY k.submitted_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    async updateStatus(id, status) {
        const query = `
            UPDATE kyc_documents 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await db.query(query, [status, id]);
        return result.rows[0] || null;
    }
}

module.exports = new KycRepository();
