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

    // Trouver un utilisateur par son jeton de verification (actif et non expire)
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

    // Récupérer la liste des chargés de clientèle actifs
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

    // Affecter ou réaffecter un conseiller à un client (advisorId peut être null)
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

    // Modifier le rôle d'un utilisateur (CLIENT, CHARGE_CLIENT, ADMINISTRATEUR)
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

    // Creation d'un nouveau client (mot de passe hache uniquement)
    async create(donnees) {
        const civilite = donnees.civilite || 'M.';
        const nom = donnees.nom;
        const prenom = donnees.prenom;
        const email = donnees.email.trim().toLowerCase();
        const motDePasseHash = donnees.motDePasseHash;
        const token = donnees.token;

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
        const params = [civilite, nom, prenom, email, motDePasseHash, token];
        const result = await db.query(query, params);
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
        const numCompte = String(Math.floor(10000000 + Math.random() * 90000000));
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

        // Création automatique de la carte bancaire physique attitrée au nouveau compte
        try {
            const cardRepository = require("./cardRepository");
            await cardRepository.createPhysicalCard(account.id);
        } catch (cardErr) {
            console.warn("Carte bancaire initiale non créée :", cardErr.message);
        }

        return account;
    },

    // Activer le compte client et annuler le jeton (usage unique)
    async verifyEmail(utilisateurId) {
        const query = `
            UPDATE utilisateurs 
            SET email_verifie = TRUE, 
                token_verification = NULL, 
                expiration_token = NULL 
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [utilisateurId]);
        return result.rows[0] || null;
    },

    /**
     * Récupère les métriques complètes de charge et de réactivité de chaque conseiller bancaire
     */
    async getAdvisorsWorkloadMetrics() {
        const query = `
            SELECT 
                u.id,
                u.civilite,
                u.nom,
                u.prenom,
                u.email,
                u.telephone,
                TO_CHAR(u.date_creation, 'DD/MM/YYYY') AS "dateCreation",
                
                -- Nombre de clients affectés
                COUNT(DISTINCT c.id)::int AS "assignedClientsCount",
                
                -- Métriques Demandes
                COUNT(DISTINCT d.id)::int AS "totalDemandes",
                COUNT(DISTINCT CASE WHEN d.statut IN ('APPROUVEE', 'REJETEE') THEN d.id END)::int AS "demandesTraitees",
                COUNT(DISTINCT CASE WHEN d.statut IN ('EN_ATTENTE', 'EN_INSTRUCTION') THEN d.id END)::int AS "demandesEnAttente",
                COUNT(DISTINCT CASE WHEN d.statut IN ('EN_ATTENTE', 'EN_INSTRUCTION') AND d.date_demande < NOW() - INTERVAL '24 hours' THEN d.id END)::int AS "demandesRelance",
                COALESCE(ROUND(AVG(CASE WHEN d.statut IN ('APPROUVEE', 'REJETEE') AND d.date_traitement IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (d.date_traitement - d.date_demande)) / 3600.0 END)::numeric, 1), 0)::float AS "delaiMoyenDemandesHeures",

                -- Métriques Réclamations
                COUNT(DISTINCT r.id)::int AS "totalReclamations",
                COUNT(DISTINCT CASE WHEN r.statut IN ('RESOLUE', 'REJETEE') THEN r.id END)::int AS "reclamationsTraitees",
                COUNT(DISTINCT CASE WHEN r.statut IN ('OUVERTE', 'EN_COURS') THEN r.id END)::int AS "reclamationsEnAttente",
                COUNT(DISTINCT CASE WHEN r.statut IN ('OUVERTE', 'EN_COURS') AND (r.date_depot < NOW() - INTERVAL '24 hours' OR r.priorite IN ('URGENTE', 'HAUTE')) THEN r.id END)::int AS "reclamationsRelance",
                COALESCE(ROUND(AVG(CASE WHEN r.statut IN ('RESOLUE', 'REJETEE') AND r.date_cloture IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (r.date_cloture - r.date_depot)) / 3600.0 END)::numeric, 1), 0)::float AS "delaiMoyenReclamationsHeures"

            FROM utilisateurs u
            LEFT JOIN utilisateurs c ON c.conseiller_id = u.id AND c.role = 'CLIENT'
            LEFT JOIN demandes d ON d.utilisateur_id = c.id
            LEFT JOIN reclamations r ON r.utilisateur_id = c.id
            WHERE u.role = 'CHARGE_CLIENT'
            GROUP BY u.id
            ORDER BY u.nom ASC
        `;
        const result = await db.query(query);
        return result.rows;
    },

    /**
     * Récupère la liste des dossiers (demandes & réclamations) en attente nécessitant une relance
     */
    async getOverdueRequests(advisorId = null) {
        let params = [];
        let advisorFilterDemandes = "";
        let advisorFilterReclamations = "";

        if (advisorId) {
            params.push(advisorId);
            advisorFilterDemandes = `AND c.conseiller_id = $1`;
            advisorFilterReclamations = `AND c.conseiller_id = $1`;
        }

        const query = `
            SELECT 
                'DEMANDE' AS "typeDossier",
                d.id,
                d.reference,
                CASE 
                    WHEN d.type_demande = 'OUVERTURE_EPARGNE' THEN 'Ouverture Livret Épargne'
                    WHEN d.type_demande = 'DEMANDE_RIB' THEN 'Demande RIB'
                    WHEN d.type_demande = 'CARTE_VIRTUELLE' THEN 'Carte Virtuelle'
                    WHEN d.type_demande = 'OPPOSITION_CARTE' THEN 'Opposition Carte'
                    WHEN d.type_demande = 'RECALCUL_PIN' THEN 'Renouvellement PIN'
                    ELSE d.type_demande::text
                END AS "sujet",
                d.statut::text AS "statut",
                'MOYENNE' AS "priorite",
                d.date_demande AS "dateCreation",
                TO_CHAR(d.date_demande, 'DD/MM/YYYY HH24:MI') AS "dateFormatted",
                ROUND(EXTRACT(EPOCH FROM (NOW() - d.date_demande)) / 3600.0, 1)::float AS "heuresEnAttente",
                (c.prenom || ' ' || c.nom) AS "clientName",
                c.email AS "clientEmail",
                c.telephone AS "clientPhone",
                adv.id AS "advisorId",
                (adv.prenom || ' ' || adv.nom) AS "advisorName",
                CASE WHEN rel.id IS NOT NULL THEN true ELSE false END AS "isRelanced",
                TO_CHAR(rel.date_action, 'DD/MM/YYYY à HH24:MI') AS "dateRelance"
            FROM demandes d
            JOIN utilisateurs c ON d.utilisateur_id = c.id
            LEFT JOIN utilisateurs adv ON c.conseiller_id = adv.id
            LEFT JOIN LATERAL (
                SELECT id, date_action 
                FROM journal_audit 
                WHERE action LIKE 'RELANCE_CONSEILLER%' 
                  AND entite_cible = 'DEMANDE' 
                  AND id_entite_cible = d.id 
                ORDER BY date_action DESC 
                LIMIT 1
            ) rel ON true
            WHERE d.statut IN ('EN_ATTENTE', 'EN_INSTRUCTION')
              ${advisorFilterDemandes}

            UNION ALL

            SELECT 
                'RECLAMATION' AS "typeDossier",
                r.id,
                r.reference,
                r.sujet AS "sujet",
                r.statut::text AS "statut",
                r.priorite::text AS "priorite",
                r.date_depot AS "dateCreation",
                TO_CHAR(r.date_depot, 'DD/MM/YYYY HH24:MI') AS "dateFormatted",
                ROUND(EXTRACT(EPOCH FROM (NOW() - r.date_depot)) / 3600.0, 1)::float AS "heuresEnAttente",
                (c.prenom || ' ' || c.nom) AS "clientName",
                c.email AS "clientEmail",
                c.telephone AS "clientPhone",
                adv.id AS "advisorId",
                (adv.prenom || ' ' || adv.nom) AS "advisorName",
                CASE WHEN rel.id IS NOT NULL THEN true ELSE false END AS "isRelanced",
                TO_CHAR(rel.date_action, 'DD/MM/YYYY à HH24:MI') AS "dateRelance"
            FROM reclamations r
            JOIN utilisateurs c ON r.utilisateur_id = c.id
            LEFT JOIN utilisateurs adv ON c.conseiller_id = adv.id
            LEFT JOIN LATERAL (
                SELECT id, date_action 
                FROM journal_audit 
                WHERE action LIKE 'RELANCE_CONSEILLER%' 
                  AND entite_cible = 'RECLAMATION' 
                  AND id_entite_cible = r.id 
                ORDER BY date_action DESC 
                LIMIT 1
            ) rel ON true
            WHERE r.statut IN ('OUVERTE', 'EN_COURS')
              ${advisorFilterReclamations}

            ORDER BY "heuresEnAttente" DESC, "dateCreation" ASC
        `;

        const result = await db.query(query, params);
        return result.rows;
    }
};

module.exports = userRepository;
