const db = require("../config/db");

const accountRepository = {
    // Récupérer tous les comptes bancaires avec les informations du client
    async findAll() {
        const query = `
            SELECT 
                cb.id,
                cb.numero_compte,
                cb.iban,
                cb.bic,
                cb.type_compte,
                cb.solde,
                cb.decouvert_autorise,
                cb.devise,
                cb.statut,
                cb.utilisateur_id,
                u.nom,
                u.prenom,
                u.email
            FROM comptes_bancaires cb
            JOIN utilisateurs u ON cb.utilisateur_id = u.id
            ORDER BY cb.id ASC
        `;
        const result = await db.query(query);

        // Transformation simple et lisible en JavaScript
        return result.rows.map(row => {
            const balance = parseFloat(row.solde);
            const overdraftLimit = parseFloat(row.decouvert_autorise || 0);

            return {
                id: row.id,
                numeroCompte: row.numero_compte,
                iban: row.iban,
                bic: row.bic,
                rawType: row.type_compte, // 'COURANT' ou 'EPARGNE'
                type: row.type_compte === "COURANT" ? "Compte Courant" : "Compte Épargne",
                balance: balance,
                overdraftLimit: overdraftLimit,
                isOverdrawn: balance < 0, // Indicateur de situation de découvert
                currency: row.devise,
                status: row.statut === "ACTIF" ? "Actif" : "Bloqué",
                clientId: "CLI-" + row.utilisateur_id,
                clientName: `${row.prenom} ${row.nom}`,
                clientEmail: row.email
            };
        });
    },

    // Trouver un compte par son ID
    async findById(id) {
        const query = "SELECT * FROM comptes_bancaires WHERE id = $1";
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    },

    // Activer ou bloquer un compte bancaire
    async toggleAccountStatus(accountId) {
        // Étape 1 : Récupérer le compte
        const account = await this.findById(accountId);
        if (!account) {
            return null;
        }

        // Étape 2 : Inverser le statut (si ACTIF on bloque, sinon on active)
        let newStatus = "ACTIF";
        if (account.statut === "ACTIF") {
            newStatus = "BLOQUE";
        } else {
            newStatus = "ACTIF";
        }

        // Étape 3 : Mettre à jour dans la base de données
        const query = `
            UPDATE comptes_bancaires
            SET statut = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [newStatus, accountId]);
        return result.rows[0];
    },

    // Activer ou bloquer la carte bancaire
    async toggleCardStatus(accountId) {
        // Étape 1 : Récupérer la carte du compte
        const cardQuery = "SELECT * FROM cartes_bancaires WHERE compte_id = $1 LIMIT 1";
        const cardResult = await db.query(cardQuery, [accountId]);
        const card = cardResult.rows[0];

        if (!card) {
            return null;
        }

        // Étape 2 : Inverser le statut de la carte
        let newStatus = "ACTIVE";
        if (card.statut === "ACTIVE") {
            newStatus = "BLOQUEE_TEMPORAIREMENT";
        } else {
            newStatus = "ACTIVE";
        }

        // Étape 3 : Sauvegarder le nouveau statut
        const updateQuery = `
            UPDATE cartes_bancaires
            SET statut = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(updateQuery, [newStatus, card.id]);
        return result.rows[0];
    }
};

module.exports = accountRepository;
