const userRepo = require("../repositories/userRepository");
const bcrypt = require("bcrypt");
const transactionRepo = require("../repositories/transactionRepository");
const auditRepo = require("../repositories/auditRepository");
const db = require("../config/db");

class AdminDataService {
    constructor() {}

    async getDashboardStats() {
        try {
            const metrics = await transactionRepo.getMetrics();
            const recentTransactions = await transactionRepo.findAll(5);
            const clients = await userRepo.findAll("", "CLIENT");
            const recentClients = clients.slice(0, 4).map(c => ({
                id: `CLI-${c.id}`,
                firstName: c.prenom,
                lastName: c.nom,
                email: c.email,
                city: c.adressePostale || "Maroc",
                status: c.compteVerrouille ? "Bloqué" : "Actif",
                totalBalance: c.totalSolde || 0
            }));

            return {
                metrics,
                recentTransactions,
                recentClients,
                isRealDb: true
            };
        } catch (err) {
            console.error("Erreur getDashboardStats :", err);
            return {
                metrics: {
                    totalClients: 0,
                    activeAccounts: 0,
                    totalDeposits: 0,
                    todayTransactionsVolume: 0,
                    flaggedTransactionsCount: 0
                },
                recentTransactions: [],
                recentClients: [],
                isRealDb: false,
                dbError: err.message
            };
        }
    }

    async getClients(query = "", role = "") {
        try {
            return await userRepo.findAll(query, role);
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    // Créer un utilisateur avec mot de passe haché
    async addClient(data) {
        // 1. Définir le mot de passe (saisi ou valeur par défaut)
        const motDePasse = data.password || "Password123!";

        // 2. Hacher automatiquement le mot de passe avec bcrypt
        const motDePasseHash = await bcrypt.hash(motDePasse, 10);

        // 3. Enregistrer l'utilisateur en base de données
        const user = await userRepo.createUser({
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            motDePasseHash: motDePasseHash,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        });

        // 4. Si le compte créé est un client, lui ouvrir un compte courant initial
        if (user && user.role === "CLIENT") {
            try {
                await userRepo.createDefaultAccount(user.id);
            } catch (err) {
                console.warn("Compte bancaire par défaut non créé :", err.message);
            }
        }

        return user;
    }

    // Mettre à jour l'état civil et le contact d'un utilisateur
    async updateClient(id, data) {
        return await userRepo.updateUser(id, {
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        });
    }

    // Modifier le rôle système (Client, Chargé Client, Administrateur)
    async updateUserRole(id, role) {
        return await userRepo.updateRole(id, role);
    }

    // Récupérer la liste des conseillers pour les formulaires d'affectation
    async getAdvisors() {
        try {
            return await userRepo.getAdvisors();
        } catch (err) {
            console.error("Erreur récupération conseillers :", err.message);
            return [];
        }
    }

    // Affecter un conseiller à un client
    async assignClientAdvisor(clientId, advisorId) {
        return await userRepo.assignAdvisor(clientId, advisorId);
    }

    // Activer ou désactiver immédiatement un compte utilisateur
    async toggleClientStatus(id) {
        return await userRepo.toggleLock(id);
    }

    async logAction(adminUser, action, ip, severity) {
        try {
            return await auditRepo.log({ adminUser, action, ip, severity });
        } catch (err) {
            return null;
        }
    }

    /**
     * Récupère la supervision complète de la charge et réactivité des conseillers
     */
    async getAdvisorsSupervision(filterAdvisorId = null) {
        try {
            const [advisorsRaw, overdueRequests] = await Promise.all([
                userRepo.getAdvisorsWorkloadMetrics(),
                userRepo.getOverdueRequests(filterAdvisorId)
            ]);

            const advisors = advisorsRaw.map(adv => {
                const totalDossiers = adv.totalDemandes + adv.totalReclamations;
                const totalTraites = adv.demandesTraitees + adv.reclamationsTraitees;
                const totalEnAttente = adv.demandesEnAttente + adv.reclamationsEnAttente;
                const totalRelance = adv.demandesRelance + adv.reclamationsRelance;

                const tauxTraitement = totalDossiers > 0 ? Math.round((totalTraites / totalDossiers) * 100) : 100;
                const tauxDemandes = adv.totalDemandes > 0 ? Math.round((adv.demandesTraitees / adv.totalDemandes) * 100) : 100;
                const tauxReclamations = adv.totalReclamations > 0 ? Math.round((adv.reclamationsTraitees / adv.totalReclamations) * 100) : 100;

                // Formatage des délais en chaînes lisibles
                const formatDelai = (heures) => {
                    if (!heures || heures <= 0) return "< 1 h";
                    if (heures < 24) return `${heures} h`;
                    const jours = (heures / 24).toFixed(1);
                    return `${jours} j`;
                };

                // Niveau de charge
                let chargeBadge = { label: "Équilibrée", class: "success" };
                if (adv.assignedClientsCount >= 30) {
                    chargeBadge = { label: "Surcharge", class: "danger" };
                } else if (adv.assignedClientsCount >= 15) {
                    chargeBadge = { label: "Soutenue", class: "warning" };
                }

                // Statut de réactivité
                let reactiviteBadge = { label: "Excellente", class: "success" };
                if (totalRelance > 0) {
                    reactiviteBadge = { label: "Relance requise", class: "danger" };
                } else if (tauxTraitement < 75) {
                    reactiviteBadge = { label: "À surveiller", class: "warning" };
                }

                return {
                    ...adv,
                    totalDossiers,
                    totalTraites,
                    totalEnAttente,
                    totalRelance,
                    tauxTraitement,
                    tauxDemandes,
                    tauxReclamations,
                    delaiMoyenDemandesStr: formatDelai(adv.delaiMoyenDemandesHeures),
                    delaiMoyenReclamationsStr: formatDelai(adv.delaiMoyenReclamationsHeures),
                    chargeBadge,
                    reactiviteBadge
                };
            });

            // Synthèse globale
            const totalAdvisors = advisors.length;
            const totalAssignedClients = advisors.reduce((acc, a) => acc + a.assignedClientsCount, 0);
            const avgClientsPerAdvisor = totalAdvisors > 0 ? Math.round(totalAssignedClients / totalAdvisors) : 0;
            const totalDossiersAll = advisors.reduce((acc, a) => acc + a.totalDossiers, 0);
            const totalTraitesAll = advisors.reduce((acc, a) => acc + a.totalTraites, 0);
            const globalTreatmentRate = totalDossiersAll > 0 ? Math.round((totalTraitesAll / totalDossiersAll) * 100) : 100;
            const totalRelanceAll = advisors.reduce((acc, a) => acc + a.totalRelance, 0);

            return {
                advisors,
                overdueRequests,
                summary: {
                    totalAdvisors,
                    totalAssignedClients,
                    avgClientsPerAdvisor,
                    globalTreatmentRate,
                    totalRelanceAll,
                    totalOverdueDossiers: overdueRequests.length
                }
            };
        } catch (error) {
            console.error("Erreur getAdvisorsSupervision :", error);
            return {
                advisors: [],
                overdueRequests: [],
                summary: {
                    totalAdvisors: 0,
                    totalAssignedClients: 0,
                    avgClientsPerAdvisor: 0,
                    globalTreatmentRate: 100,
                    totalRelanceAll: 0,
                    totalOverdueDossiers: 0
                }
            };
        }
    }

    /**
     * Envoie une relance à un conseiller et journalise l'action
     */
    async sendAdvisorReminder(advisorId, { requestId, requestType, reference, message }, adminUser, ip) {
        const actionDesc = `Relance envoyée au conseiller ID #${advisorId} pour le dossier ${requestType} [${reference}] : ${message || 'Délai de traitement dépassé'}`;
        await auditRepo.log({
            adminUser,
            action: "RELANCE_CONSEILLER",
            ip,
            severity: "Warning",
            entiteCible: requestType ? requestType.toUpperCase().trim() : null,
            idEntiteCible: requestId ? parseInt(requestId, 10) : null,
            detail: actionDesc
        });
        return { success: true, message: `Relance enregistrée avec succès pour le conseiller.` };
    }

    // =========================================================================
    // SUPERVISION DES COMPTES BANCAIRES - CODE DÉVELOPPEUR JUNIOR CLAIR
    // =========================================================================
    async getAccounts(typeFilter = 'ALL') {
        const accountRepo = require("../repositories/accountRepository");

        // Étape 1 : Récupérer tous les comptes depuis la base de données
        const allAccounts = await accountRepo.findAll();

        // Étape 2 : Calculer les statistiques globales
        let currentCount = 0;
        let savingsCount = 0;
        let overdrawnCount = 0;
        let totalBalance = 0;

        for (let i = 0; i < allAccounts.length; i++) {
            const acc = allAccounts[i];
            totalBalance += acc.balance;

            // Compter par type
            if (acc.rawType === 'COURANT') {
                currentCount++;
            } else if (acc.rawType === 'EPARGNE') {
                savingsCount++;
            }

            // Vérifier si le compte est en découvert (solde négatif)
            if (acc.isOverdrawn) {
                overdrawnCount++;
            }
        }

        // Étape 3 : Filtrer la liste selon l'onglet cliqué
        let filteredAccounts = allAccounts;

        if (typeFilter === 'COURANT') {
            filteredAccounts = allAccounts.filter(acc => acc.rawType === 'COURANT');
        } else if (typeFilter === 'EPARGNE') {
            filteredAccounts = allAccounts.filter(acc => acc.rawType === 'EPARGNE');
        } else if (typeFilter === 'OVERDRAWN') {
            filteredAccounts = allAccounts.filter(acc => acc.isOverdrawn);
        }

        // Étape 4 : Renvoyer les données prêtes pour l'affichage EJS
        return {
            accounts: filteredAccounts,
            filter: typeFilter,
            summary: {
                totalAccounts: allAccounts.length,
                currentAccountsCount: currentCount,
                savingsAccountsCount: savingsCount,
                overdrawnCount: overdrawnCount,
                totalBalance: totalBalance
            }
        };
    }

    // =========================================================================
    // AUDIT ET EXPORT DES VIREMENTS (CRITÈRES 1, 2 ET 3 DU CAHIER DES CHARGES)
    // =========================================================================

    // 1. Récupérer l'historique complet avec filtres
    async getTransactionsAudit(filters = {}) {
        const transactions = await transactionRepo.findWithFilters(filters);

        // Calcul des métriques d'audit
        let totalVolume = 0;
        let flaggedCount = 0;

        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            totalVolume += parseFloat(tx.amount || 0);
            if (tx.flagged) {
                flaggedCount++;
            }
        }

        return {
            transactions,
            filters,
            summary: {
                totalCount: transactions.length,
                totalVolume: totalVolume,
                flaggedCount: flaggedCount
            }
        };
    }

    // 2. Exporter les flux au format CSV pour archivage réglementaire (Critère 3)
    async exportTransactionsCsv(filters = {}) {
        // Étape 1 : Récupérer les transactions avec les mêmes filtres que l'écran
        const transactions = await transactionRepo.findWithFilters(filters);

        // Étape 2 : Définir la ligne d'en-tête du fichier CSV
        const headers = [
            "Reference SEPA",
            "Date et Heure",
            "Emetteur",
            "IBAN Emetteur",
            "Destinataire",
            "IBAN Destinataire",
            "Type de Flux",
            "Montant (EUR)",
            "Motif",
            "Statut",
            "Alerte Reglementaire"
        ];

        const rows = [headers.join(";")];

        // Étape 3 : Fonction simple pour entourer de guillemets et éviter les erreurs de virgule
        function echapperTexte(texte) {
            if (texte === null || texte === undefined) {
                return '""';
            }
            const texteSecurise = String(texte).replace(/"/g, '""');
            return `"${texteSecurise}"`;
        }

        // Étape 4 : Transformer chaque transaction en une ligne CSV
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            const montantFormatte = parseFloat(tx.amount || 0).toFixed(2);
            const alerte = tx.flagReason ? tx.flagReason : "Conforme";

            const row = [
                echapperTexte(tx.reference),
                echapperTexte(tx.date),
                echapperTexte(tx.sender),
                echapperTexte(tx.senderIban),
                echapperTexte(tx.recipient),
                echapperTexte(tx.recipientIban),
                echapperTexte(tx.type),
                montantFormatte,
                echapperTexte(tx.motif),
                echapperTexte(tx.status),
                echapperTexte(alerte)
            ];

            rows.push(row.join(";"));
        }

        // Étape 5 : Ajouter le préfixe UTF-8 BOM pour un affichage parfait dans Excel
        return "\uFEFF" + rows.join("\r\n");
    }

    // =========================================================================
    // SUPERVISION DES CARTES BANCAIRES (CRITÈRES 1, 2 ET 3 DU CAHIER DES CHARGES)
    // =========================================================================
    async getCardsSupervision(filters = {}) {
        const cardRepo = require("../repositories/cardRepository");

        // Étape 1 : Récupérer les cartes filtrées pour le tableau
        const cards = await cardRepo.findAll(filters);

        // Étape 2 : Récupérer toutes les cartes pour calculer les totaux globaux
        const allCards = await cardRepo.findAll({});

        let activeCount = 0;
        let blockedCount = 0;
        let opposedCount = 0;
        let physicalCount = 0;
        let virtualCount = 0;

        // Étape 3 : Compter simplement les cartes par statut et par type
        for (let i = 0; i < allCards.length; i++) {
            const carte = allCards[i];

            // Compter par statut (Critère 1 : Active, Bloquée, En opposition)
            if (carte.rawStatus === "ACTIVE") {
                activeCount++;
            } else if (carte.rawStatus === "BLOQUEE_TEMPORAIREMENT") {
                blockedCount++;
            } else if (carte.rawStatus === "OPPOSEE") {
                opposedCount++;
            }

            // Compter par type (Critère 2 : Physique, Virtuelle)
            if (carte.rawType === "PHYSIQUE") {
                physicalCount++;
            } else if (carte.rawType === "VIRTUELLE") {
                virtualCount++;
            }
        }

        // Étape 4 : Renvoyer l'objet final pour le contrôleur
        return {
            cards: cards,
            filters: filters,
            summary: {
                totalCards: allCards.length,
                activeCount: activeCount,
                blockedCount: blockedCount,
                opposedCount: opposedCount,
                physicalCount: physicalCount,
                virtualCount: virtualCount
            }
        };
    }
}

module.exports = new AdminDataService();
