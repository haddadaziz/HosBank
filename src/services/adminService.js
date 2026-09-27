const userRepo = require("../repositories/userRepository");
const bcrypt = require("bcrypt");
const transactionRepo = require("../repositories/transactionRepository");
const auditRepo = require("../repositories/auditRepository");
const accountRepo = require("../repositories/accountRepository");
const cardRepo = require("../repositories/cardRepository");
const requestRepo = require("../repositories/requestRepository");
const db = require("../config/db");

class AdminDataService {
    constructor() {}

    // Récupérer les statistiques globales et les données du tableau de bord (style développeur junior)
    async getDashboardStats() {
        try {
            // Étape 1 : Récupérer les indicateurs clés de performance (KPIs)
            const metrics = await transactionRepo.getMetrics();

            // Étape 2 : Récupérer les 5 dernières transactions bancaires
            const recentTransactions = await transactionRepo.findAll(5);

            // Étape 3 : Récupérer les derniers clients inscrits
            const clients = await userRepo.findAll("", "CLIENT");
            const recentClients = [];
            const nbClients = Math.min(clients.length, 4);

            for (let i = 0; i < nbClients; i++) {
                const c = clients[i];
                recentClients.push({
                    id: "CLI-" + c.id,
                    firstName: c.prenom,
                    lastName: c.nom,
                    email: c.email,
                    city: c.adressePostale || "Maroc",
                    status: c.compteVerrouille ? "Bloqué" : "Actif",
                    totalBalance: c.totalSolde || 0
                });
            }

            // Étape 4 : Renvoyer l'ensemble des données prêtes pour l'affichage
            return {
                metrics: metrics,
                recentTransactions: recentTransactions,
                recentClients: recentClients,
                isRealDb: true
            };
        } catch (err) {
            console.error("Erreur getDashboardStats :", err.message);
            return {
                metrics: {
                    totalClients: 0,
                    activeAccounts: 0,
                    totalAccounts: 0,
                    depositsCourant: 0,
                    depositsEpargne: 0,
                    totalDeposits: 0,
                    monthTransactionsVolume: 0,
                    monthTransactionsCount: 0,
                    accountActivationRate: 100,
                    clientSatisfactionRate: 98.4
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

    // 1. Créer un nouvel utilisateur avec hachage automatique du mot de passe
    async addClient(data) {
        // Déterminer le mot de passe (saisi ou valeur par défaut)
        var motDePasse = data.password;
        if (!motDePasse) {
            motDePasse = "Password123!";
        }

        // Hacher le mot de passe avec bcrypt (10 tours de salage)
        var motDePasseHash = await bcrypt.hash(motDePasse, 10);

        // Préparer les informations de l'utilisateur
        var nouvelUtilisateur = {
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            motDePasseHash: motDePasseHash,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        };

        // Insérer l'utilisateur dans la base de données
        var user = await userRepo.createUser(nouvelUtilisateur);

        // Si l'utilisateur est un client, lui créer automatiquement un compte courant
        if (user && user.role === "CLIENT") {
            try {
                await userRepo.createDefaultAccount(user.id);
            } catch (err) {
                console.warn("Compte bancaire par défaut non créé :", err.message);
            }
        }

        return user;
    }

    // 2. Mettre à jour l'état civil et le contact d'un utilisateur
    async updateClient(id, data) {
        // Préparer les nouvelles données
        var donneesModifiees = {
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        };

        // Sauvegarder les modifications dans la base de données
        var utilisateurMisAJour = await userRepo.updateUser(id, donneesModifiees);
        return utilisateurMisAJour;
    }

    // Modifier le rôle système d'un utilisateur (CLIENT, CHARGE_CLIENT, ADMINISTRATEUR)
    async updateUserRole(id, role) {
        // Enregistrer le nouveau rôle en base de données
        var resultat = await userRepo.updateRole(id, role);
        return resultat;
    }

    // Récupérer la liste des conseillers pour le sélecteur d'affectation
    async getAdvisors() {
        try {
            var listeConseillers = await userRepo.getAdvisors();
            return listeConseillers;
        } catch (err) {
            console.error("Erreur lors de la récupération des conseillers :", err.message);
            return [];
        }
    }

    // Affecter ou réaffecter un client à un conseiller bancaire
    async assignClientAdvisor(clientId, advisorId) {
        var clientMisAJour = await userRepo.assignAdvisor(clientId, advisorId);
        return clientMisAJour;
    }

    // 3. Activer ou désactiver immédiatement un compte utilisateur
    async toggleClientStatus(id) {
        // Inverser l'état du verrouillage en base de données
        var resultat = await userRepo.toggleLock(id);
        return resultat;
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
            // Étape 1 : Récupérer les données brutes
            const advisorsRaw = await userRepo.getAdvisorsWorkloadMetrics();
            const overdueRequests = await userRepo.getOverdueRequests(filterAdvisorId);

            // Étape 2 : Préparer les conseillers avec une boucle for simple (Style Junior)
            const advisors = [];
            for (let i = 0; i < advisorsRaw.length; i++) {
                const adv = advisorsRaw[i];

                const totalDossiers = adv.totalDemandes + adv.totalReclamations;
                const totalTraites = adv.demandesTraitees + adv.reclamationsTraitees;
                const totalEnAttente = adv.demandesEnAttente + adv.reclamationsEnAttente;
                const totalRelance = adv.demandesRelance + adv.reclamationsRelance;

                let tauxTraitement = 100;
                if (totalDossiers > 0) {
                    tauxTraitement = Math.round((totalTraites / totalDossiers) * 100);
                }

                let tauxDemandes = 100;
                if (adv.totalDemandes > 0) {
                    tauxDemandes = Math.round((adv.demandesTraitees / adv.totalDemandes) * 100);
                }

                let tauxReclamations = 100;
                if (adv.totalReclamations > 0) {
                    tauxReclamations = Math.round((adv.reclamationsTraitees / adv.totalReclamations) * 100);
                }

                // Formatage des délais
                let delaiDemandesStr = "< 1 h";
                if (adv.delaiMoyenDemandesHeures >= 24) {
                    delaiDemandesStr = (adv.delaiMoyenDemandesHeures / 24).toFixed(1) + " j";
                } else if (adv.delaiMoyenDemandesHeures > 0) {
                    delaiDemandesStr = adv.delaiMoyenDemandesHeures + " h";
                }

                let delaiReclamationsStr = "< 1 h";
                if (adv.delaiMoyenReclamationsHeures >= 24) {
                    delaiReclamationsStr = (adv.delaiMoyenReclamationsHeures / 24).toFixed(1) + " j";
                } else if (adv.delaiMoyenReclamationsHeures > 0) {
                    delaiReclamationsStr = adv.delaiMoyenReclamationsHeures + " h";
                }

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

                advisors.push({
                    ...adv,
                    totalDossiers: totalDossiers,
                    totalTraites: totalTraites,
                    totalEnAttente: totalEnAttente,
                    totalRelance: totalRelance,
                    tauxTraitement: tauxTraitement,
                    tauxDemandes: tauxDemandes,
                    tauxReclamations: tauxReclamations,
                    delaiMoyenDemandesStr: delaiDemandesStr,
                    delaiMoyenReclamationsStr: delaiReclamationsStr,
                    chargeBadge: chargeBadge,
                    reactiviteBadge: reactiviteBadge
                });
            }

            // Étape 3 : Calculer les totaux de synthèse avec une boucle for simple
            let totalAssignedClients = 0;
            let totalDossiersAll = 0;
            let totalTraitesAll = 0;
            let totalRelanceAll = 0;

            for (let i = 0; i < advisors.length; i++) {
                totalAssignedClients += advisors[i].assignedClientsCount;
                totalDossiersAll += advisors[i].totalDossiers;
                totalTraitesAll += advisors[i].totalTraites;
                totalRelanceAll += advisors[i].totalRelance;
            }

            const totalAdvisors = advisors.length;
            let avgClientsPerAdvisor = 0;
            if (totalAdvisors > 0) {
                avgClientsPerAdvisor = Math.round(totalAssignedClients / totalAdvisors);
            }

            let globalTreatmentRate = 100;
            if (totalDossiersAll > 0) {
                globalTreatmentRate = Math.round((totalTraitesAll / totalDossiersAll) * 100);
            }

            return {
                advisors: advisors,
                overdueRequests: overdueRequests,
                summary: {
                    totalAdvisors: totalAdvisors,
                    totalAssignedClients: totalAssignedClients,
                    avgClientsPerAdvisor: avgClientsPerAdvisor,
                    globalTreatmentRate: globalTreatmentRate,
                    totalRelanceAll: totalRelanceAll,
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

    // Enregistrer une relance pour un conseiller et l'inscrire au journal d'audit (style développeur junior)
    async sendAdvisorReminder(advisorId, { requestId, requestType, reference, message }, adminUser, ip) {
        // Étape 1 : Formater le texte explicatif de l'action
        const motif = message || "Délai de traitement dépassé";
        const actionDesc = `Relance envoyée au conseiller ID #${advisorId} pour le dossier ${requestType} [${reference}] : ${motif}`;

        // Étape 2 : Écrire l'action dans le journal d'audit
        await auditRepo.log({
            adminUser: adminUser,
            action: "RELANCE_CONSEILLER",
            ip: ip,
            severity: "Warning",
            entiteCible: requestType ? requestType.toUpperCase().trim() : null,
            idEntiteCible: requestId ? parseInt(requestId, 10) : null,
            detail: actionDesc
        });

        // Étape 3 : Renvoyer un message de succès
        return { 
            success: true, 
            message: "Relance enregistrée avec succès pour le conseiller." 
        };
    }

    // =========================================================================
    // SUPERVISION DES COMPTES BANCAIRES - STYLE DÉVELOPPEUR JUNIOR
    // =========================================================================
    async getAccounts(typeFilter = "ALL") {
        // Etape 1 : Recuperer la liste de tous les comptes bancaires
        const tousLesComptes = await accountRepo.findAll();

        // Etape 2 : Calculer les statistiques globales (compteurs et soldes)
        let nombreCourants = 0;
        let nombreEpargne = 0;
        let nombreDecouverts = 0;
        let soldeTotalBanque = 0;

        for (let i = 0; i < tousLesComptes.length; i++) {
            const compte = tousLesComptes[i];
            soldeTotalBanque = soldeTotalBanque + compte.balance;

            // Compter par type de compte
            if (compte.rawType === "COURANT") {
                nombreCourants++;
            } else if (compte.rawType === "EPARGNE") {
                nombreEpargne++;
            }

            // Un compte est en situation de decouvert si son solde est strictement negatif
            if (compte.isOverdrawn) {
                nombreDecouverts++;
            }
        }

        // Etape 3 : Filtrer selon le choix (Courant, Epargne, Decouvert ou Tous)
        let comptesFiltres = [];
        if (typeFilter === "COURANT") {
            for (let i = 0; i < tousLesComptes.length; i++) {
                if (tousLesComptes[i].rawType === "COURANT") {
                    comptesFiltres.push(tousLesComptes[i]);
                }
            }
        } else if (typeFilter === "EPARGNE") {
            for (let i = 0; i < tousLesComptes.length; i++) {
                if (tousLesComptes[i].rawType === "EPARGNE") {
                    comptesFiltres.push(tousLesComptes[i]);
                }
            }
        } else if (typeFilter === "OVERDRAWN") {
            for (let i = 0; i < tousLesComptes.length; i++) {
                if (tousLesComptes[i].isOverdrawn) {
                    comptesFiltres.push(tousLesComptes[i]);
                }
            }
        } else {
            comptesFiltres = tousLesComptes;
        }

        // Etape 4 : Renvoyer les donnees pour la vue EJS
        return {
            accounts: comptesFiltres,
            filter: typeFilter,
            summary: {
                totalAccounts: tousLesComptes.length,
                currentAccountsCount: nombreCourants,
                savingsAccountsCount: nombreEpargne,
                overdrawnCount: nombreDecouverts,
                totalBalance: soldeTotalBanque
            }
        };
    }

    // =========================================================================
    // =========================================================================
    // AUDIT ET EXPORT DES VIREMENTS - STYLE DÉVELOPPEUR JUNIOR
    // =========================================================================

    // 1. Recuperer la liste des virements avec calcul des metriques
    async getTransactionsAudit(filters = {}) {
        // Etape 1 : Recuperer les transactions filtrees
        const listeTransactions = await transactionRepo.findWithFilters(filters);

        // Etape 2 : Calculer le volume total et le nombre d'alertes
        let volumeTotal = 0;
        let nombreAlertes = 0;

        for (let i = 0; i < listeTransactions.length; i++) {
            const virement = listeTransactions[i];
            volumeTotal = volumeTotal + parseFloat(virement.amount || 0);

            // Verifier si le virement depasse le seuil reglementaire (>= 5 000 €)
            if (virement.flagged) {
                nombreAlertes++;
            }
        }

        // Etape 3 : Renvoyer l'objet pret pour la vue
        return {
            transactions: listeTransactions,
            filters: filters,
            summary: {
                totalCount: listeTransactions.length,
                totalVolume: volumeTotal,
                flaggedCount: nombreAlertes
            }
        };
    }

    // 2. Exporter les virements au format CSV (Critere 3)
    async exportTransactionsCsv(filters = {}) {
        // Etape 1 : Recuperer les virements selon les filtres
        const listeVirements = await transactionRepo.findWithFilters(filters);

        // Etape 2 : Definir les colonnes du fichier CSV
        const colonnes = [
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

        const lignesCsv = [colonnes.join(";")];

        // Etape 3 : Transformer chaque virement en une ligne CSV securisee
        for (let i = 0; i < listeVirements.length; i++) {
            const v = listeVirements[i];
            const montantTexte = parseFloat(v.amount || 0).toFixed(2);
            const alerteTexte = v.flagReason ? v.flagReason : "Conforme";

            const ligne = [
                `"${(v.reference || "").replace(/"/g, '""')}"`,
                `"${(v.date || "").replace(/"/g, '""')}"`,
                `"${(v.sender || "").replace(/"/g, '""')}"`,
                `"${(v.senderIban || "").replace(/"/g, '""')}"`,
                `"${(v.recipient || "").replace(/"/g, '""')}"`,
                `"${(v.recipientIban || "").replace(/"/g, '""')}"`,
                `"${(v.type || "").replace(/"/g, '""')}"`,
                montantTexte,
                `"${(v.motif || "").replace(/"/g, '""')}"`,
                `"${(v.status || "").replace(/"/g, '""')}"`,
                `"${alerteTexte.replace(/"/g, '""')}"`
            ];

            lignesCsv.push(ligne.join(";"));
        }

        // Etape 4 : Ajouter l'en-tete UTF-8 BOM pour Excel et joindre les lignes
        return "\uFEFF" + lignesCsv.join("\r\n");
    }

    // =========================================================================
    // SUPERVISION DES CARTES BANCAIRES (CRITÈRES 1, 2 ET 3 DU CAHIER DES CHARGES)
    // =========================================================================
    // SUPERVISION DES CARTES BANCAIRES - STYLE DÉVELOPPEUR JUNIOR
    // =========================================================================
    async getCardsSupervision(filters = {}) {
        // Etape 1 : Recuperer les cartes correspondant aux filtres demandes
        const cartesFiltrees = await cardRepo.findAll(filters);

        // Etape 2 : Recuperer la totalite des cartes pour les compteurs globaux (KPIs)
        const toutesLesCartes = await cardRepo.findAll({});

        let nombreActives = 0;
        let nombreBloquees = 0;
        let nombreOpposees = 0;
        let nombrePhysiques = 0;
        let nombreVirtuelles = 0;

        // Etape 3 : Compter les cartes par statut et par type
        for (let i = 0; i < toutesLesCartes.length; i++) {
            const carte = toutesLesCartes[i];

            // Critere 1 : Statuts (Active, Bloquee, En opposition)
            if (carte.rawStatus === "ACTIVE") {
                nombreActives++;
            } else if (carte.rawStatus === "BLOQUEE_TEMPORAIREMENT") {
                nombreBloquees++;
            } else if (carte.rawStatus === "OPPOSEE") {
                nombreOpposees++;
            }

            // Critere 2 : Types (Physique, Virtuelle)
            if (carte.rawType === "PHYSIQUE") {
                nombrePhysiques++;
            } else if (carte.rawType === "VIRTUELLE") {
                nombreVirtuelles++;
            }
        }

        // Etape 4 : Renvoyer les donnees pretes pour le controleur et la vue
        return {
            cards: cartesFiltrees,
            filters: filters,
            summary: {
                totalCards: toutesLesCartes.length,
                activeCount: nombreActives,
                blockedCount: nombreBloquees,
                opposedCount: nombreOpposees,
                physicalCount: nombrePhysiques,
                virtualCount: nombreVirtuelles
            }
        };
    }

    // =========================================================================
    // =========================================================================
    // REGISTRE CENTRAL DES DEMANDES ET RÉCLAMATIONS - STYLE DÉVELOPPEUR JUNIOR
    // =========================================================================
    async getRequestsSupervision(filters = {}) {
        // Etape 1 : Recuperer toutes les démarches bancaires selon les filtres
        const listeDemandes = await requestRepo.findAllDemandes(filters);

        // Etape 2 : Recuperer toutes les réclamations selon les filtres
        const listeReclamations = await requestRepo.findAllReclamations(filters);

        // Etape 3 : Recuperer les métriques globales et les blocages (> 24h)
        const statistiquesGlobales = await requestRepo.getGlobalMetrics();

        // Etape 4 : Renvoyer l'objet final complet
        return {
            demandes: listeDemandes,
            reclamations: listeReclamations,
            metrics: statistiquesGlobales,
            filters: filters
        };
    }
}

module.exports = new AdminDataService();
