const adminService = require("../services/adminService");

const adminController = {
    getLogin: (req, res) => {
        if (req.session && req.session.admin) {
            return res.redirect("/admin/dashboard");
        }
        res.redirect("/login");
    },

    postLogin: async (req, res) => {
        const { email, password } = req.body;
        if (email && password) {
            req.session.admin = {
                id: "ADM-001",
                name: "Administrateur HosBank",
                email: email,
                role: "Super Admin",
                avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
            };
            await adminService.logAction(
                email,
                "Connexion réussie à l'espace administration",
                req.ip || "127.0.0.1",
                "Info"
            );
            return res.redirect("/admin/dashboard");
        }
        res.redirect("/login?error=invalid_credentials");
    },

    logout(req, res) {
        if (req.session) {
            req.session.destroy(() => {
                res.clearCookie("hosbank_session", { path: "/" });
                res.redirect("/login?message=" + encodeURIComponent("Vous avez été déconnecté avec succès."));
            });
        } else {
            res.clearCookie("hosbank_session", { path: "/" });
            res.redirect("/login");
        }
    },

    // Afficher le tableau de bord des statistiques globales (style développeur junior)
    getDashboard: async (req, res) => {
        try {
            // Étape 1 : Récupérer toutes les statistiques globales (KPIs, transactions récentes, clients récents)
            const stats = await adminService.getDashboardStats();

            // Étape 2 : Récupérer la session de l'administrateur
            const admin = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            // Étape 3 : Rendre la vue du tableau de bord
            res.render("admin/dashboard", {
                currentPath: "/admin/dashboard",
                admin: admin,
                stats: stats,
                title: "Tableau de Bord - Administration HosBank"
            });
        } catch (error) {
            console.error("Erreur getDashboard :", error.message);
            res.status(500).send("Erreur lors du chargement du tableau de bord.");
        }
    },

    getClients: async (req, res) => {
        const search = req.query.q || "";
        const role = req.query.role || "";
        const clients = await adminService.getClients(search, role);
        const advisors = await adminService.getAdvisors();
        res.render("admin/clients", {
            currentPath: "/admin/clients",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            clients: clients,
            advisors: advisors,
            searchQuery: search,
            currentRole: role,
            title: "Gestion des Utilisateurs - Administration HosBank"
        });
    },

    // 1. Créer un nouvel utilisateur avec hachage automatique du mot de passe
    postAddClient: async (req, res) => {
        try {
            const gender = req.body.gender || "M.";
            const firstName = req.body.firstName;
            const lastName = req.body.lastName;
            const email = req.body.email;
            const phone = req.body.phone || null;
            const city = req.body.city || null;
            const role = req.body.role || "CLIENT";
            const password = req.body.password;

            // Vérifier que les informations obligatoires sont bien remplies
            if (!firstName || !lastName || !email) {
                return res.redirect("/admin/clients");
            }

            // Créer l'utilisateur via le service
            await adminService.addClient({
                gender: gender,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                city: city,
                role: role,
                password: password
            });

            // Enregistrer l'opération dans le journal d'audit
            const adminEmail = (req.session && req.session.admin) ? req.session.admin.email : "Admin";
            await adminService.logAction(
                adminEmail,
                "Création de l'utilisateur " + firstName + " " + lastName + " (" + email + ")",
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de la création de l'utilisateur :", error.message);
        }

        return res.redirect("/admin/clients");
    },

    // 2. Modifier les informations d'état civil et de contact d'un utilisateur
    postEditClient: async (req, res) => {
        try {
            const id = req.params.id;
            const gender = req.body.gender || "M.";
            const firstName = req.body.firstName;
            const lastName = req.body.lastName;
            const email = req.body.email;
            const phone = req.body.phone || null;
            const city = req.body.city || null;
            const role = req.body.role || "CLIENT";

            // Vérifier que les informations obligatoires sont bien remplies
            if (!firstName || !lastName || !email) {
                return res.redirect("/admin/clients");
            }

            // Mettre à jour l'utilisateur en base de données
            await adminService.updateClient(id, {
                gender: gender,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                city: city,
                role: role
            });

            // Enregistrer l'opération dans le journal d'audit
            const adminEmail = (req.session && req.session.admin) ? req.session.admin.email : "Admin";
            await adminService.logAction(
                adminEmail,
                "Mise à jour de l'utilisateur #" + id + " (" + firstName + " " + lastName + ")",
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de la modification de l'utilisateur :", error.message);
        }

        return res.redirect("/admin/clients");
    },

    // 3. Modifier le rôle d'un utilisateur (CLIENT, CHARGE_CLIENT, ADMINISTRATEUR)
    postUpdateUserRole: async (req, res) => {
        try {
            const id = req.params.id;
            const role = req.body.role;

            // Liste des 3 rôles autorisés par le cahier des charges
            const rolesAutorises = ["CLIENT", "CHARGE_CLIENT", "ADMINISTRATEUR"];

            // Vérifier que le rôle envoyé fait partie des rôles autorisés
            if (role && rolesAutorises.includes(role)) {
                // Mettre à jour le rôle en base de données
                await adminService.updateUserRole(id, role);

                // Enregistrer l'opération dans le journal d'audit
                const adminEmail = (req.session && req.session.admin) ? req.session.admin.email : "Admin";
                await adminService.logAction(
                    adminEmail,
                    "Attribution du rôle " + role + " à l'utilisateur #" + id,
                    req.ip || "127.0.0.1",
                    "Avertissement"
                );
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour du rôle :", error.message);
        }

        return res.redirect("/admin/clients");
    },

    // 4. Affecter ou réaffecter un client à un conseiller bancaire
    postAssignAdvisor: async (req, res) => {
        try {
            const clientId = req.params.id;
            const advisorIdInput = req.body.advisorId;

            // Déterminer l'identifiant du conseiller (ou null si "Non affecté")
            var advisorId = null;
            if (advisorIdInput && !isNaN(advisorIdInput)) {
                advisorId = parseInt(advisorIdInput, 10);
            }

            // Étape 1 : Mettre à jour l'affectation en base de données
            await adminService.assignClientAdvisor(clientId, advisorId);

            // Étape 2 : Enregistrer l'opération dans le journal d'audit
            const adminEmail = (req.session && req.session.admin) ? req.session.admin.email : "Admin";
            var nomConseiller = advisorId ? ("#" + advisorId) : "aucun";
            await adminService.logAction(
                adminEmail,
                "Affectation du client #" + clientId + " au conseiller " + nomConseiller,
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de l'affectation du conseiller :", error.message);
        }

        return res.redirect("/admin/clients");
    },

    // 5. Désactiver ou activer immédiatement un compte utilisateur
    postToggleClientStatus: async (req, res) => {
        try {
            const id = req.params.id;

            // Inverser le statut du compte en base de données (verrouillé / actif)
            await adminService.toggleClientStatus(id);

            // Enregistrer l'opération dans le journal d'audit
            const adminEmail = (req.session && req.session.admin) ? req.session.admin.email : "Admin";
            await adminService.logAction(
                adminEmail,
                "Changement de statut (activation/désactivation) de l'utilisateur #" + id,
                req.ip || "127.0.0.1",
                "Avertissement"
            );
        } catch (error) {
            console.error("Erreur activation/désactivation utilisateur :", error.message);
        }

        return res.redirect("/admin/clients");
    },

    // 5. Supervision de la charge et réactivité des conseillers (style développeur junior)
    getAdvisorsWorkload: async (req, res) => {
        try {
            // Étape 1 : Récupérer l'identifiant du conseiller filtré si sélectionné
            let advisorId = null;
            if (req.query.advisorId) {
                advisorId = parseInt(req.query.advisorId, 10);
            }

            // Étape 2 : Récupérer les métriques de supervision via le service
            const supervisionData = await adminService.getAdvisorsSupervision(advisorId);

            // Étape 3 : Récupérer l'administrateur connecté
            const admin = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            // Étape 4 : Gérer les messages de succès ou d'erreur
            let successMessage = null;
            if (req.query.success) {
                successMessage = decodeURIComponent(req.query.success);
            }

            let errorMessage = null;
            if (req.query.error) {
                errorMessage = decodeURIComponent(req.query.error);
            }

            // Étape 5 : Afficher la vue de supervision
            res.render("admin/advisors_workload", {
                currentPath: "/admin/advisors-workload",
                admin: admin,
                advisors: supervisionData.advisors,
                overdueRequests: supervisionData.overdueRequests,
                summary: supervisionData.summary,
                selectedAdvisorId: advisorId,
                successMessage: successMessage,
                errorMessage: errorMessage,
                title: "Supervision de la Charge et Réactivité des Conseillers - HosBank"
            });
        } catch (error) {
            console.error("Erreur getAdvisorsWorkload :", error.message);
            res.status(500).send("Erreur lors du chargement de la supervision des conseillers.");
        }
    },

    // Envoyer une relance à un conseiller pour un dossier en retard (style développeur junior)
    postSendReminder: async (req, res) => {
        try {
            // Étape 1 : Récupérer les données de la relance
            const advisorId = req.params.id;
            const requestId = req.body.requestId;
            const requestType = req.body.requestType;
            const reference = req.body.reference;
            const message = req.body.message;

            const adminUser = req.session && req.session.admin ? req.session.admin.email : "Admin";
            const ip = req.ip || "127.0.0.1";

            // Étape 2 : Enregistrer la relance et tracer dans le journal d'audit
            const result = await adminService.sendAdvisorReminder(
                advisorId, 
                { requestId, requestType, reference, message }, 
                adminUser, 
                ip
            );

            // Étape 3 : Répondre en JSON si la requête est faite en AJAX
            const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes("json"));
            if (isAjax) {
                return res.json({ success: true, message: result.message });
            }

            // Sinon rediriger avec confirmation
            res.redirect("/admin/advisors-workload?success=" + encodeURIComponent(result.message));
        } catch (error) {
            console.error("Erreur postSendReminder :", error.message);
            res.redirect("/admin/advisors-workload?error=" + encodeURIComponent(error.message));
        }
    },

    // 6. Supervision et gestion de l'ensemble des comptes bancaires
    getAccounts: async (req, res) => {
        try {
            // Etape 1 : Recuperer le type de filtre dans l'URL (ALL, COURANT, EPARGNE ou OVERDRAWN)
            const filtreType = req.query.type || "ALL";

            // Etape 2 : Recuperer la liste des comptes filtres et les statistiques
            const resultat = await adminService.getAccounts(filtreType);

            // Etape 3 : Afficher la page EJS avec les comptes
            const adminConnecte = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            return res.render("admin/accounts", {
                currentPath: "/admin/accounts",
                admin: adminConnecte,
                accounts: resultat.accounts,
                summary: resultat.summary,
                currentFilter: filtreType,
                title: "Supervision des Comptes Bancaires - Administration HosBank"
            });
        } catch (erreur) {
            console.error("Erreur getAccounts :", erreur.message);
            return res.status(500).send("Erreur lors de la récupération des comptes bancaires.");
        }
    },

    // 7. Audit centralise de l'ensemble des virements et flux financiers
    getTransactions: async (req, res) => {
        try {
            // Etape 1 : Recuperer les filtres saisis par l'administrateur
            const filtres = {
                searchQuery: req.query.q || "",
                minAmount: req.query.minAmount || "",
                maxAmount: req.query.maxAmount || "",
                dateStart: req.query.dateStart || "",
                dateEnd: req.query.dateEnd || ""
            };

            // Etape 2 : Recuperer les transactions et les KPI via le service
            const resultat = await adminService.getTransactionsAudit(filtres);

            // Etape 3 : Afficher la page EJS avec les donnees
            const adminConnecte = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            return res.render("admin/transactions", {
                currentPath: "/admin/transactions",
                admin: adminConnecte,
                transactions: resultat.transactions,
                summary: resultat.summary,
                filters: filtres,
                title: "Audit des Virements & Flux Financiers - Administration HosBank"
            });
        } catch (erreur) {
            console.error("Erreur getTransactions :", erreur.message);
            return res.status(500).send("Erreur lors du chargement de l'audit des virements.");
        }
    },

    // 8. Exportation des flux financiers au format CSV (Critere 3)
    exportTransactionsCsv: async (req, res) => {
        try {
            // Etape 1 : Recuperer les filtres actifs
            const filtres = {
                searchQuery: req.query.q || "",
                minAmount: req.query.minAmount || "",
                maxAmount: req.query.maxAmount || "",
                dateStart: req.query.dateStart || "",
                dateEnd: req.query.dateEnd || ""
            };

            // Etape 2 : Generer le contenu texte du fichier CSV
            const contenuCsv = await adminService.exportTransactionsCsv(filtres);
            const dateAujourdhui = new Date().toISOString().slice(0, 10);
            const nomFichier = `audit_virements_hosbank_${dateAujourdhui}.csv`;

            // Etape 3 : Configurer les en-tetes HTTP pour forcer le telechargement
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${nomFichier}"`);

            // Etape 4 : Envoyer le fichier au navigateur
            return res.send(contenuCsv);
        } catch (erreur) {
            console.error("Erreur exportTransactionsCsv :", erreur.message);
            return res.status(500).send("Erreur lors de l'exportation des flux financiers.");
        }
    },

    // 9. Supervision de l'ensemble des cartes bancaires (Critères 1, 2 et 3)
    getCards: async (req, res) => {
        try {
            // Etape 1 : Recuperer les filtres de type, statut et texte de recherche
            const filtres = {
                typeFilter: req.query.type || "ALL",
                statusFilter: req.query.status || "ALL",
                searchQuery: req.query.q || ""
            };

            // Etape 2 : Recuperer la liste des cartes filtrees et le resume des KPI
            const resultat = await adminService.getCardsSupervision(filtres);

            // Etape 3 : Afficher la page EJS avec les donnees
            const adminConnecte = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            return res.render("admin/cards", {
                currentPath: "/admin/cards",
                admin: adminConnecte,
                cards: resultat.cards,
                summary: resultat.summary,
                filters: filtres,
                title: "Supervision des Cartes Bancaires - Administration HosBank"
            });
        } catch (erreur) {
            console.error("Erreur getCards :", erreur.message);
            return res.status(500).send("Erreur lors du chargement des cartes bancaires.");
        }
    },

    // 10. Registre central de toutes les demandes et réclamations (Critères 1, 2 et 3)
    getRequests: async (req, res) => {
        try {
            // Etape 1 : Determiner l'onglet actif (demandes bancaires ou reclamations)
            let ongletActif = "demandes";
            if (req.query.tab === "reclamations") {
                ongletActif = "reclamations";
            }

            // Etape 2 : Recuperer les filtres choisis par l'administrateur
            const filtres = {
                category: req.query.category || "ALL",
                status: req.query.status || "ALL",
                searchQuery: req.query.q || ""
            };

            // Etape 3 : Recuperer les dossiers et les statistiques depuis le service
            const resultat = await adminService.getRequestsSupervision(filtres);

            // Etape 4 : Afficher la page EJS avec les donnees
            const adminConnecte = req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" };

            return res.render("admin/requests", {
                currentPath: "/admin/requests",
                admin: adminConnecte,
                demandes: resultat.demandes,
                reclamations: resultat.reclamations,
                metrics: resultat.metrics,
                activeTab: ongletActif,
                filters: filtres,
                title: "Registre des Demandes & Réclamations - Administration HosBank"
            });
        } catch (erreur) {
            console.error("Erreur getRequests :", erreur.message);
            return res.status(500).send("Erreur lors du chargement des demandes et réclamations.");
        }
    }
};

module.exports = adminController;
