const db = require("../config/db");
const crypto = require("crypto");

class ClientService {

    /**
     * Récupère la liste des comptes actifs d'un utilisateur avec solde et IBAN
     */
    async getUserAccounts(userId) {
        const query = `
            SELECT 
                id, numero_compte AS "accountNumber", iban, bic,
                type_compte AS "type", solde::float AS "balance", 
                decouvert_autorise::float AS "overdraft",
                devise AS "currency"
            FROM comptes_bancaires
            WHERE utilisateur_id = $1 AND statut = 'ACTIF'
            ORDER BY type_compte ASC
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    }

    /**
     * Récupère la liste des bénéficiaires enregistrés pour les virements (HOS-24)
     */
    async getBeneficiaries(userId) {
        const query = `
            SELECT 
                id, intitule, iban, bic, 
                TO_CHAR(date_ajout, 'DD/MM/YYYY') AS "dateAdded"
            FROM beneficiaires
            WHERE utilisateur_id = $1
            ORDER BY date_ajout DESC
        `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    }

    /**
     * Ajout d'un nouveau bénéficiaire (HOS-24)
     */
    async addBeneficiary(userId, { intitule, iban, bic }) {
        if (!intitule || !iban) {
            throw new Error("Le nom du bénéficiaire et l'IBAN sont obligatoires.");
        }

        const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
        if (cleanIban.length < 15 || cleanIban.length > 34) {
            throw new Error("Le format de l'IBAN est invalide.");
        }

        const query = `
            INSERT INTO beneficiaires (utilisateur_id, intitule, iban, bic)
            VALUES ($1, $2, $3, $4)
            RETURNING id, intitule, iban, bic
        `;
        const { rows } = await db.query(query, [
            userId, 
            intitule.trim(), 
            cleanIban, 
            (bic || 'HOSBFR2P').trim().toUpperCase()
        ]);
        return rows[0];
    }

    /**
     * Traitement transactionnel ACID d'un virement bancaire (HOS-25)
     */
    async executeTransfer(userId, { sourceAccountId, beneficiaryId, amount, motif }) {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new Error("Le montant du virement doit être un nombre positif supérieur à zéro.");
        }

        if (parsedAmount > 5000) {
            throw new Error("Plafond instantané dépassé (maximum 5 000,00 € par virement).");
        }

        // Connexion dédiée au pool pour transaction ACID
        const client = await db.pool.connect();

        try {
            await client.query("BEGIN");

            // 1. Verrouiller et vérifier le compte émetteur (FOR UPDATE)
            const sourceRes = await client.query(`
                SELECT id, numero_compte AS "accountNumber", solde::float AS "balance",
                       decouvert_autorise::float AS "overdraft", statut AS "status"
                FROM comptes_bancaires
                WHERE id = $1 AND utilisateur_id = $2
                FOR UPDATE
            `, [sourceAccountId, userId]);

            if (sourceRes.rows.length === 0) {
                throw new Error("Compte émetteur introuvable ou non rattaché à votre profil.");
            }

            const sourceAcc = sourceRes.rows[0];
            if (sourceAcc.status !== 'ACTIF') {
                throw new Error("Le compte émetteur est inactif ou verrouillé.");
            }

            const maxAvailable = sourceAcc.balance + (sourceAcc.overdraft || 0);
            if (parsedAmount > maxAvailable) {
                throw new Error(`Solde insuffisant pour ce virement. Solde disponible : ${maxAvailable.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €.`);
            }

            // 2. Vérifier le bénéficiaire destinataire
            const benRes = await client.query(`
                SELECT id, intitule, iban, bic
                FROM beneficiaires
                WHERE id = $1 AND utilisateur_id = $2
            `, [beneficiaryId, userId]);

            if (benRes.rows.length === 0) {
                throw new Error("Bénéficiaire destinataire introuvable.");
            }
            const beneficiary = benRes.rows[0];

            // 3. Débiter le compte émetteur
            const newSourceBalance = sourceAcc.balance - parsedAmount;
            await client.query(
                "UPDATE comptes_bancaires SET solde = $1 WHERE id = $2",
                [newSourceBalance, sourceAccountId]
            );

            // 4. Générer la référence SEPA et insérer dans la table virements
            const sepaRef = `VIR-SEPA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            const label = (motif || `Virement vers ${beneficiary.intitule}`).trim();

            await client.query(`
                INSERT INTO virements (compte_emetteur_id, beneficiaire_id, reference_sepa, montant, motif, statut)
                VALUES ($1, $2, $3, $4, $5, 'VALIDE')
            `, [sourceAccountId, beneficiaryId, sepaRef, parsedAmount, label]);

            // 5. Enregistrer le débit dans la table operations
            await client.query(`
                INSERT INTO operations (compte_id, sens, montant, solde_apres_operation, motif_libelle, categorie)
                VALUES ($1, 'DEBIT', $2, $3, $4, 'Virement émis')
            `, [sourceAccountId, parsedAmount, newSourceBalance, `Virement SEPA à ${beneficiary.intitule} : ${label}`]);

            // 6. Si l'IBAN du destinataire est un compte HosBank interne, le créditer instantanément !
            const destAccRes = await client.query(`
                SELECT id, solde::float AS "balance", numero_compte AS "accountNumber"
                FROM comptes_bancaires
                WHERE REPLACE(REPLACE(iban, ' ', ''), '-', '') = REPLACE(REPLACE($1, ' ', ''), '-', '') AND statut = 'ACTIF'
                FOR UPDATE
            `, [beneficiary.iban]);

            if (destAccRes.rows.length > 0) {
                const destAcc = destAccRes.rows[0];
                const newDestBalance = destAcc.balance + parsedAmount;
                await client.query(
                    "UPDATE comptes_bancaires SET solde = $1 WHERE id = $2",
                    [newDestBalance, destAcc.id]
                );
                await client.query(`
                    INSERT INTO operations (compte_id, sens, montant, solde_apres_operation, motif_libelle, categorie)
                    VALUES ($1, 'CREDIT', $2, $3, $4, 'Virement reçu')
                `, [destAcc.id, parsedAmount, newDestBalance, `Virement reçu de ${sourceAcc.accountNumber} : ${label}`]);
            }

            await client.query("COMMIT");
            return {
                reference: sepaRef,
                amount: parsedAmount,
                beneficiaryName: beneficiary.intitule,
                newBalance: newSourceBalance
            };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Récupère toutes les cartes bancaires d'un utilisateur
     */
    async getCards(userId) {
        const cardsQuery = `
            SELECT 
                c.id, 
                c.compte_id AS "accountId", 
                c.pan_masque AS "maskedPan",
                c.type_carte AS "type", 
                c.statut AS "status",
                TO_CHAR(c.date_expiration, 'MM/YY') AS "expiry",
                c.plafond_paiement_mensuel::float AS "monthlyLimit",
                c.plafond_retrait_hebdo::float AS "weeklyLimit",
                cb.numero_compte AS "accountNumber",
                cb.type_compte AS "accountType"
            FROM cartes_bancaires c
            JOIN comptes_bancaires cb ON c.compte_id = cb.id
            WHERE cb.utilisateur_id = $1
            ORDER BY c.date_creation DESC
        `;
        const { rows } = await db.query(cardsQuery, [userId]);
        return rows;
    }

    /**
     * Mise en opposition d'une carte (HOS-31)
     */
    async opposeCard(userId, cardId, motif = "NON_PRECISE") {
        const checkQuery = `
            SELECT c.id, c.pan_masque, c.statut
            FROM cartes_bancaires c
            JOIN comptes_bancaires cb ON c.compte_id = cb.id
            WHERE c.id = $1 AND cb.utilisateur_id = $2
        `;
        const checkRes = await db.query(checkQuery, [cardId, userId]);
        if (checkRes.rows.length === 0) {
            throw new Error("Carte bancaire introuvable ou non rattachée à vos comptes.");
        }

        const card = checkRes.rows[0];
        if (card.statut === 'OPPOSEE') {
            throw new Error("Cette carte est déjà mise en opposition.");
        }

        await db.query(
            "UPDATE cartes_bancaires SET statut = 'OPPOSEE' WHERE id = $1",
            [cardId]
        );

        const reference = "DEM-OPP-" + Date.now().toString().slice(-6);
        const payload = JSON.stringify({
            carte_id: cardId,
            pan_masque: card.pan_masque,
            motif,
            date_opposition: new Date().toISOString()
        });

        await db.query(`
            INSERT INTO demandes (utilisateur_id, reference, type_demande, statut, payload_json, reponse_conseiller, date_traitement)
            VALUES ($1, $2, 'OPPOSITION_CARTE', 'APPROUVEE', $3, 'Opposition enregistrée avec succès. Carte verrouillée.', CURRENT_TIMESTAMP)
        `, [userId, reference, payload]);

        return { cardId, reference };
    }

    /**
     * Création instantanée d'une carte virtuelle (HOS-30)
     */
    async createVirtualCard(userId, accountId, monthlyLimit = 1000) {
        const accountRes = await db.query(
            "SELECT id FROM comptes_bancaires WHERE id = $1 AND utilisateur_id = $2 AND statut = 'ACTIF'",
            [accountId, userId]
        );
        if (accountRes.rows.length === 0) {
            throw new Error("Compte bancaire sélectionné invalide ou inactif.");
        }

        const last4 = Math.floor(1000 + Math.random() * 9000);
        const panMasque = `•••• •••• •••• ${last4}`;
        const panHash = crypto.createHash('sha256').update(`VIRTUAL-${Date.now()}-${last4}`).digest('hex');
        const pinHash = crypto.createHash('sha256').update("0000").digest('hex');
        
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 3);

        const limit = Math.max(50, Math.min(3000, parseFloat(monthlyLimit) || 1000.00));

        const insertQuery = `
            INSERT INTO cartes_bancaires 
                (compte_id, pan_masque, pan_hash, date_expiration, code_pin_hash, type_carte, statut, plafond_paiement_mensuel, plafond_retrait_hebdo)
            VALUES 
                ($1, $2, $3, $4, $5, 'VIRTUELLE', 'ACTIVE', $6, 0.00)
            RETURNING id, pan_masque, TO_CHAR(date_expiration, 'MM/YY') AS expiry
        `;
        const newCardRes = await db.query(insertQuery, [
            accountId,
            panMasque,
            panHash,
            expiryDate.toISOString().split('T')[0],
            pinHash,
            limit
        ]);

        const reference = "DEM-VIR-" + Date.now().toString().slice(-6);
        const payload = JSON.stringify({
            carte_id: newCardRes.rows[0].id,
            compte_id: accountId,
            plafond: limit
        });

        await db.query(`
            INSERT INTO demandes (utilisateur_id, reference, type_demande, statut, payload_json, reponse_conseiller, date_traitement)
            VALUES ($1, $2, 'CARTE_VIRTUELLE', 'APPROUVEE', $3, 'Carte virtuelle générée avec succès.', CURRENT_TIMESTAMP)
        `, [userId, reference, payload]);

        return newCardRes.rows[0];
    }

    /**
     * Demande de recalcul de code PIN (HOS-32)
     */
    async requestPin(userId, cardId) {
        const checkQuery = `
            SELECT c.id, c.pan_masque, c.statut
            FROM cartes_bancaires c
            JOIN comptes_bancaires cb ON c.compte_id = cb.id
            WHERE c.id = $1 AND cb.utilisateur_id = $2
        `;
        const checkRes = await db.query(checkQuery, [cardId, userId]);
        if (checkRes.rows.length === 0) {
            throw new Error("Carte bancaire introuvable.");
        }

        if (checkRes.rows[0].statut === 'OPPOSEE') {
            throw new Error("Impossible de demander un recalcul de code PIN pour une carte en opposition.");
        }

        const reference = "DEM-PIN-" + Date.now().toString().slice(-6);
        const payload = JSON.stringify({
            carte_id: cardId,
            pan_masque: checkRes.rows[0].pan_masque,
            date_demande: new Date().toISOString()
        });

        await db.query(`
            INSERT INTO demandes (utilisateur_id, reference, type_demande, statut, payload_json)
            VALUES ($1, $2, 'RECALCUL_PIN', 'EN_ATTENTE', $3)
        `, [userId, reference, payload]);

        return { reference };
    }

    /**
     * Dashboard Data
     */
    async getDashboardData(userId = 3) {
        const accountsQuery = `
            SELECT 
                id, numero_compte AS "accountNumber", iban, bic, devise AS "currency",
                type_compte AS "type", solde::float AS "balance", 
                decouvert_autorise::float AS "overdraft", 
                taux_interet::float AS "interestRate", statut AS "status"
            FROM comptes_bancaires
            WHERE utilisateur_id = $1
            ORDER BY type_compte ASC
        `;
        const { rows: accounts } = await db.query(accountsQuery, [userId]);

        let cards = [];
        let transactions = [];

        if (accounts.length > 0) {
            const accountIds = accounts.map(a => a.id);

            const cardsQuery = `
                SELECT 
                    id, compte_id AS "accountId", pan_masque AS "maskedPan",
                    type_carte AS "type", statut AS "status",
                    TO_CHAR(date_expiration, 'MM/YY') AS "expiry",
                    plafond_paiement_mensuel::float AS "monthlyLimit",
                    plafond_retrait_hebdo::float AS "weeklyLimit"
                FROM cartes_bancaires
                WHERE compte_id = ANY($1::int[])
                ORDER BY type_carte ASC
            `;
            const cardsRes = await db.query(cardsQuery, [accountIds]);
            cards = cardsRes.rows;

            const txQuery = `
                SELECT 
                    id, reference_unique AS "reference", sens AS "direction",
                    montant::float AS "amount", solde_apres_operation::float AS "balanceAfter",
                    motif_libelle AS "label", categorie AS "category",
                    TO_CHAR(date_operation, 'DD/MM/YYYY HH24:MI') AS "dateFormatted"
                FROM operations
                WHERE compte_id = ANY($1::int[])
                ORDER BY date_operation DESC
                LIMIT 5
            `;
            const txRes = await db.query(txQuery, [accountIds]);
            transactions = txRes.rows;
        }

        const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

        return { accounts, cards, transactions, totalBalance };
    }
}

module.exports = new ClientService();