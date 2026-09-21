const db = require("../config/db");

class ClientService {
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
