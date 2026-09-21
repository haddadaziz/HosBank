const db = require("../config/db");

const userRepository = {
    async findByEmail(email) {
        const query = `SELECT * FROM utilisateurs WHERE LOWER(email) = LOWER($1)`;
        const result = await db.query(query, [email.trim()]);
        return result.rows[0] || null;
    },

    async findById(id) {
        const query = `SELECT * FROM utilisateurs WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    async findByToken(token) {
        const query = `
            SELECT * FROM utilisateurs 
            WHERE token_verification = $1 
            AND expiration_token > CURRENT_TIMESTAMP
        `;
        const result = await db.query(query, [token]);
        return result.rows[0] || null;
    },

    async create({ civilite, nom, prenom, email, motDePasseHash, token }) {
        const query = `
            INSERT INTO utilisateurs (
                civilite, nom, prenom, email, mot_de_passe_hash, 
                role, email_verifie, token_verification, expiration_token
            )
            VALUES (
                $1, $2, $3, $4, $5, 
                'CLIENT', FALSE, $6, CURRENT_TIMESTAMP + INTERVAL '24 HOURS'
            )
            RETURNING *
        `;
        const values = [
            civilite || 'M.',
            nom,
            prenom,
            email.trim().toLowerCase(),
            motDePasseHash,
            token
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async createDefaultAccount(userId) {
        const numCompte = 'CPT-' + Math.floor(10000000 + Math.random() * 90000000);
        const iban = 'FR76 3000 4012 ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000) + ' 123';
        
        const query = `
            INSERT INTO comptes_bancaires (utilisateur_id, numero_compte, iban, bic, solde, type_compte, statut)
            VALUES ($1, $2, $3, 'HOSBFR2P', 50.00, 'COURANT', 'ACTIF')
            RETURNING *
        `;
        const result = await db.query(query, [userId, numCompte, iban]);
        return result.rows[0];
    },

    async verifyEmail(id) {
        const query = `
            UPDATE utilisateurs 
            SET email_verifie = TRUE, token_verification = NULL, expiration_token = NULL 
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }
};

module.exports = userRepository;
