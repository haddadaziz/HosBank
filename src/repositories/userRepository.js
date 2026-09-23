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
            AND (expiration_token IS NULL OR expiration_token > CURRENT_TIMESTAMP)
        `;
        const result = await db.query(query, [token]);
        return result.rows[0] || null;
    },

    async findAll(search = "", role = "") {
        let query = `
            SELECT 
                u.id,
                u.civilite,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                u.adresse_postale AS "adressePostale",
                u.role,
                u.email_verifie AS "emailVerifie",
                u.compte_verrouille AS "compteVerrouille",
                u.conseiller_id AS "conseillerId",
                (adv.prenom || ' ' || adv.nom) AS "conseillerName",
                TO_CHAR(u.date_creation, 'YYYY-MM-DD') AS "dateCreation",
                COUNT(cb.id)::int AS "comptesCount",
                COALESCE(SUM(cb.solde), 0)::float AS "totalSolde"
            FROM utilisateurs u
            LEFT JOIN utilisateurs adv ON u.conseiller_id = adv.id
            LEFT JOIN comptes_bancaires cb ON u.id = cb.utilisateur_id
        `;
        const params = [];
        const conditions = [];

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            conditions.push(`(
                LOWER(u.nom) LIKE LOWER($${params.length}) OR 
                LOWER(u.prenom) LIKE LOWER($${params.length}) OR 
                LOWER(u.email) LIKE LOWER($${params.length}) OR 
                u.id::text LIKE $${params.length}
            )`);
        }

        if (role && role.trim()) {
            params.push(role.trim());
            conditions.push(`u.role = $${params.length}::role_utilisateur`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(" AND ");
        }

        query += `
            GROUP BY u.id, adv.id
            ORDER BY u.id DESC
        `;

        const result = await db.query(query, params);
        return result.rows;
    },

    async getAdvisors() {
        const query = `
            SELECT id, civilite, nom, prenom, email, telephone
            FROM utilisateurs
            WHERE role = 'CHARGE_CLIENT' AND compte_verrouille = FALSE
            ORDER BY nom ASC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    async assignAdvisor(clientId, advisorId) {
        const query = `
            UPDATE utilisateurs
            SET conseiller_id = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [advisorId, clientId]);
        return result.rows[0] || null;
    },

    async updateRole(id, role) {
        const query = `
            UPDATE utilisateurs 
            SET role = $1::role_utilisateur 
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [role, id]);
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
        const values = [civilite || 'M.', nom, prenom, email.trim().toLowerCase(), motDePasseHash, token];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async createUser({ civilite, nom, prenom, email, motDePasseHash, role, telephone, adressePostale }) {
        const query = `
            INSERT INTO utilisateurs (
                civilite, nom, prenom, email, mot_de_passe_hash, 
                role, email_verifie, telephone, adresse_postale
            )
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
            RETURNING *
        `;
        const values = [
            civilite || 'M.',
            nom,
            prenom,
            email.trim().toLowerCase(),
            motDePasseHash,
            role || 'CLIENT',
            telephone || null,
            adressePostale || null
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async updateUser(id, { civilite, nom, prenom, email, role, telephone, adressePostale }) {
        const query = `
            UPDATE utilisateurs
            SET 
                civilite = COALESCE($1, civilite),
                nom = COALESCE($2, nom),
                prenom = COALESCE($3, prenom),
                email = COALESCE($4, email),
                role = COALESCE($5::role_utilisateur, role),
                telephone = COALESCE($6, telephone),
                adresse_postale = COALESCE($7, adresse_postale)
            WHERE id = $8
            RETURNING *
        `;
        const values = [civilite, nom, prenom, email, role, telephone, adressePostale, id];
        const result = await db.query(query, values);
        return result.rows[0] || null;
    },

    async toggleLock(id) {
        const query = `
            UPDATE utilisateurs 
            SET compte_verrouille = NOT compte_verrouille 
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    async createDefaultAccount(userId) {
        const numCompte = 'CPT-' + Math.floor(10000000 + Math.random() * 90000000);
        const iban = 'FR76 3000 4012 ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000) + ' 123';
        
        const query = `
            INSERT INTO comptes_bancaires (utilisateur_id, numero_compte, iban, bic, solde, type_compte, statut)
            VALUES ($1, $2, $3, 'HOSBFR2P', 100.00, 'COURANT', 'ACTIF')
            RETURNING *
        `;
        const result = await db.query(query, [userId, numCompte, iban]);
        const account = result.rows[0];

        try {
            await db.query(`
                INSERT INTO operations (compte_id, sens, montant, solde_apres_operation, motif_libelle, categorie, date_valeur, date_operation)
                VALUES ($1, 'CREDIT', 100.00, 100.00, 'Dépôt initial d''ouverture de compte', 'Revenus', CURRENT_DATE, CURRENT_TIMESTAMP)
            `, [account.id]);
        } catch (opErr) {
            console.warn("Opération initiale non créée :", opErr.message);
        }

        return account;
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
