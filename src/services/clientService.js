const db = require("../config/db");
const beneficiaryRepo = require("../repositories/beneficiaryRepository");

class ClientService {
    /**
     * Valide la conformité d'un IBAN selon la norme internationale ISO 7064 (Modulo 97)
     */
    validateIban(iban) {
        if (!iban || typeof iban !== "string") return false;
        const clean = iban.replace(/\s+/g, "").toUpperCase();

        // Format général SEPA : 2 lettres pays, 2 chiffres de contrôle, 11 à 30 caractères alphanumériques
        const generalRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;
        if (!generalRegex.test(clean)) return false;

        // Contrôle spécifique France (27 caractères exactement)
        if (clean.startsWith("FR") && clean.length !== 27) return false;

        // Algorithme Modulo 97 :
        // 1. Déplacer les 4 premiers caractères à la fin
        const rearranged = clean.slice(4) + clean.slice(0, 4);

        // 2. Remplacer chaque lettre par sa valeur numérique (A=10 ... Z=35)
        let numericString = "";
        for (let i = 0; i < rearranged.length; i++) {
            const code = rearranged.charCodeAt(i);
            if (code >= 65 && code <= 90) {
                numericString += (code - 55).toString();
            } else {
                numericString += rearranged[i];
            }
        }

        // 3. Calculer Modulo 97 sur le grand entier
        try {
            return BigInt(numericString) % 97n === 1n;
        } catch {
            return false;
        }
    }

    /**
     * Valide l'intitulé du bénéficiaire
     */
    validateIntitule(intitule) {
        if (!intitule || typeof intitule !== "string") return false;
        const trimmed = intitule.trim();
        return trimmed.length >= 2 && trimmed.length <= 100;
    }

    /**
     * Valide le format du code BIC / SWIFT
     */
    validateBic(bic) {
        if (!bic || bic.trim() === "") return true; // Optionnel
        const clean = bic.replace(/\s+/g, "").toUpperCase();
        return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(clean);
    }

    /**
     * Formate un IBAN avec des espaces tous les 4 caractères pour affichage propre
     */
    formatIban(iban) {
        if (!iban) return "";
        return iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
    }

    /**
     * Récupère tous les bénéficiaires d'un utilisateur
     */
    async getBeneficiaries(userId) {
        return await beneficiaryRepo.findByUserId(userId);
    }

    /**
     * Ajoute un nouveau bénéficiaire avec validation stricte
     */
    async addBeneficiary(userId, { intitule, iban, bic }) {
        if (!userId) {
            throw new Error("Utilisateur non authentifié.");
        }

        if (!this.validateIntitule(intitule)) {
            throw new Error("L'intitulé du bénéficiaire est requis (entre 2 et 100 caractères).");
        }

        if (!this.validateIban(iban)) {
            throw new Error("Le numéro IBAN est invalide. Veuillez vérifier le pays, la longueur et la clé de contrôle.");
        }

        if (!this.validateBic(bic)) {
            throw new Error("Le code BIC/SWIFT est invalide (doit comporter 8 ou 11 caractères).");
        }

        const formattedIban = this.formatIban(iban);
        const existing = await beneficiaryRepo.findByIban(userId, iban);
        if (existing) {
            throw new Error("Cet IBAN est déjà enregistré dans votre liste de bénéficiaires.");
        }

        return await beneficiaryRepo.create({
            userId,
            intitule: intitule.trim(),
            iban: formattedIban,
            bic: bic ? bic.trim().toUpperCase() : null
        });
    }

    /**
     * Supprime un bénéficiaire
     */
    async deleteBeneficiary(id, userId) {
        return await beneficiaryRepo.delete(id, userId);
    }

    // 1. Récupérer les comptes bancaires actifs d'un client
    async getUserAccounts(userId) {
        const query = `
            SELECT 
                id, 
                numero_compte AS "accountNumber", 
                iban, 
                bic, 
                devise AS "currency",
                type_compte AS "type", 
                solde::float AS "balance", 
                decouvert_autorise::float AS "overdraft", 
                taux_interet::float AS "interestRate", 
                statut AS "status"
            FROM comptes_bancaires
            WHERE utilisateur_id = $1 AND statut = 'ACTIF'
            ORDER BY type_compte ASC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // 2. Récupérer les données du tableau de bord client (comptes, cartes, 5 dernières opérations)
    async getDashboardData(userId = 3) {
        // Étape 1 : Récupérer les comptes actifs
        const accounts = await this.getUserAccounts(userId);

        let cards = [];
        let transactions = [];

        // Étape 2 : Si le client a des comptes, charger ses cartes et ses opérations
        if (accounts.length > 0) {
            const accountIds = accounts.map(account => account.id);

            const cardsQuery = `
                SELECT 
                    id, 
                    compte_id AS "accountId", 
                    pan_masque AS "maskedPan",
                    type_carte AS "type", 
                    statut AS "status",
                    TO_CHAR(date_expiration, 'MM/YY') AS "expiry",
                    plafond_paiement_mensuel::float AS "monthlyLimit",
                    plafond_retrait_hebdo::float AS "weeklyLimit"
                FROM cartes_bancaires
                WHERE compte_id = ANY($1::int[])
                ORDER BY type_carte ASC
            `;

            const txQuery = `
                SELECT 
                    id, 
                    reference_unique AS "reference", 
                    sens AS "direction",
                    montant::float AS "amount", 
                    solde_apres_operation::float AS "balanceAfter",
                    motif_libelle AS "label", 
                    categorie AS "category",
                    TO_CHAR(date_operation, 'DD/MM/YYYY HH24:MI') AS "dateFormatted"
                FROM operations
                WHERE compte_id = ANY($1::int[])
                ORDER BY date_operation DESC
                LIMIT 5
            `;

            // Exécution parallèle rapide pour un temps de réponse instantané
            const [cardsResult, txResult] = await Promise.all([
                db.query(cardsQuery, [accountIds]),
                db.query(txQuery, [accountIds])
            ]);

            cards = cardsResult.rows;
            transactions = txResult.rows;
        }

        // Étape 3 : Calcul simple du solde total disponible
        let totalBalance = 0;
        for (const account of accounts) {
            totalBalance += account.balance;
        }

        return { 
            accounts, 
            cards, 
            transactions, 
            totalBalance 
        };
    }
}

module.exports = new ClientService();
