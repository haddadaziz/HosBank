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
                res.clearCookie("hosbank_session");
                res.redirect("/login?message=" + encodeURIComponent("Vous avez été déconnecté avec succès."));
            });
        } else {
            req.session.admin = null;
            req.session.user = null;
            req.session.advisor = null;
            req.session.destroy(() => {
                res.clearCookie("hosbank_session", { path: "/" });
                res.redirect("/login?message=" + encodeURIComponent("Vous avez été déconnecté avec succès."));
            });
        } else {
            res.clearCookie("hosbank_session", { path: "/" });
            res.redirect("/login");
        }
    },

    getDashboard: async (req, res) => {
        const stats = await adminService.getDashboardStats();
        res.render("admin/dashboard", {
            currentPath: "/admin/dashboard",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            stats: stats,
            title: "Tableau de Bord - Administration HosBank"
        });
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

    // 1. Créer un nouvel utilisateur
    postAddClient: async (req, res) => {
        try {
            const { gender, firstName, lastName, email, phone, city, role, password } = req.body;

            // Vérification basique des champs requis
            if (!firstName || !lastName || !email) {
                return res.redirect("/admin/clients");
            }

            await adminService.addClient({
                gender,
                firstName,
                lastName,
                email,
                phone,
                city,
                role,
                password
            });

            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Création de l'utilisateur ${firstName} ${lastName} (${email})`,
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de la création de l'utilisateur :", error.message);
        }

        res.redirect("/admin/clients");
    },

    // 2. Modifier un utilisateur existant
    postEditClient: async (req, res) => {
        try {
            const { id } = req.params;
            const { gender, firstName, lastName, email, phone, city, role } = req.body;

            // Vérification basique des champs requis
            if (!firstName || !lastName || !email) {
                return res.redirect("/admin/clients");
            }

            await adminService.updateClient(id, {
                gender,
                firstName,
                lastName,
                email,
                phone,
                city,
                role
            });

            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Mise à jour de l'utilisateur #${id} (${firstName} ${lastName})`,
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de la modification de l'utilisateur :", error.message);
        }

        res.redirect("/admin/clients");
    },

    // 3. Modifier le rôle d'un utilisateur
    postUpdateUserRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            // Liste des 3 rôles autorisés par le cahier des charges
            const rolesAutorises = ["CLIENT", "CHARGE_CLIENT", "ADMINISTRATEUR"];

            if (role && rolesAutorises.includes(role)) {
                await adminService.updateUserRole(id, role);

                await adminService.logAction(
                    req.session?.admin?.email || "Admin",
                    `Attribution du rôle ${role} à l'utilisateur #${id}`,
                    req.ip || "127.0.0.1",
                    "Avertissement"
                );
            }
        } catch (error) {
            console.error("Erreur mise à jour rôle :", error.message);
        }

        res.redirect("/admin/clients");
    },

    // 4. Affecter ou réaffecter un client à un conseiller
    postAssignAdvisor: async (req, res) => {
        try {
            const clientId = req.params.id;
            const advisorIdInput = req.body.advisorId;

            // Si un conseiller est sélectionné, on convertit son ID en nombre, sinon null (Non affecté)
            let advisorId = null;
            if (advisorIdInput && !isNaN(advisorIdInput)) {
                advisorId = parseInt(advisorIdInput, 10);
            }

            // 1. Mise à jour de l'affectation en base de données
            await adminService.assignClientAdvisor(clientId, advisorId);

            // 2. Journaliser l'opération
            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Affectation du client #${clientId} au conseiller #${advisorId || 'aucun'}`,
                req.ip || "127.0.0.1",
                "Info"
            );
        } catch (error) {
            console.error("Erreur lors de l'affectation du conseiller :", error.message);
        }

        res.redirect("/admin/clients");
    },

    // 5. Activer ou désactiver immédiatement un utilisateur
    postToggleClientStatus: async (req, res) => {
        try {
            const { id } = req.params;
            await adminService.toggleClientStatus(id);

            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Changement de statut (activation/désactivation) de l'utilisateur #${id}`,
                req.ip || "127.0.0.1",
                "Avertissement"
            );
        } catch (error) {
            console.error("Erreur activation/désactivation utilisateur :", error.message);
        }

        res.redirect("/admin/clients");
    },

    getAdvisorsWorkload: async (req, res) => {
        try {
            const advisorId = req.query.advisorId ? parseInt(req.query.advisorId, 10) : null;
            const supervisionData = await adminService.getAdvisorsSupervision(advisorId);

            res.render("admin/advisors_workload", {
                currentPath: "/admin/advisors-workload",
                admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
                advisors: supervisionData.advisors,
                overdueRequests: supervisionData.overdueRequests,
                summary: supervisionData.summary,
                selectedAdvisorId: advisorId,
                successMessage: req.query.success ? decodeURIComponent(req.query.success) : null,
                errorMessage: req.query.error ? decodeURIComponent(req.query.error) : null,
                title: "Supervision de la Charge et Réactivité des Conseillers - HosBank"
            });
        } catch (error) {
            console.error("Erreur getAdvisorsWorkload :", error);
            res.status(500).send("Erreur lors du chargement de la supervision des conseillers.");
        }
    },

    postSendReminder: async (req, res) => {
        try {
            const { id } = req.params; // advisorId
            const { requestId, requestType, reference, message } = req.body;
            const adminUser = req.session?.admin?.email || "Admin";
            const ip = req.ip || "127.0.0.1";

            const result = await adminService.sendAdvisorReminder(id, { requestId, requestType, reference, message }, adminUser, ip);

            if (req.xhr || req.headers.accept?.includes("json")) {
                return res.json({ success: true, message: result.message });
            }

            res.redirect(`/admin/advisors-workload?success=${encodeURIComponent(result.message)}`);
        } catch (error) {
            console.error("Erreur postSendReminder :", error);
            res.redirect(`/admin/advisors-workload?error=${encodeURIComponent(error.message)}`);
        }
    },

    // 6. Supervision et gestion de l'ensemble des comptes bancaires
    getAccounts: async (req, res) => {
        try {
            // Étape 1 : Récupérer le filtre choisi dans l'URL (ALL, COURANT, EPARGNE ou OVERDRAWN)
            const typeFilter = req.query.type || "ALL";

            // Étape 2 : Récupérer la liste des comptes et les statistiques
            const data = await adminService.getAccounts(typeFilter);

            // Étape 3 : Rendre la page avec toutes les données nécessaires
            res.render("admin/accounts", {
                currentPath: "/admin/accounts",
                admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
                accounts: data.accounts,
                summary: data.summary,
                currentFilter: typeFilter,
                title: "Supervision des Comptes Bancaires - Administration HosBank"
            });
        } catch (error) {
            console.error("Erreur getAccounts :", error);
            res.status(500).send("Erreur lors de la récupération des comptes bancaires.");
        }
    },

    // 7. Audit centralisé de l'ensemble des virements et flux financiers
    getTransactions: async (req, res) => {
        try {
            // Étape 1 : Récupérer les filtres de recherche saisis par l'administrateur
            const filters = {
                searchQuery: req.query.q || "",
                minAmount: req.query.minAmount || "",
                maxAmount: req.query.maxAmount || "",
                dateStart: req.query.dateStart || "",
                dateEnd: req.query.dateEnd || ""
            };

            // Étape 2 : Récupérer les transactions et les statistiques via le service
            const data = await adminService.getTransactionsAudit(filters);

            // Étape 3 : Rendre la page EJS avec les données
            res.render("admin/transactions", {
                currentPath: "/admin/transactions",
                admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
                transactions: data.transactions,
                summary: data.summary,
                filters: filters,
                title: "Audit des Virements & Flux Financiers - Administration HosBank"
            });
        } catch (error) {
            console.error("Erreur getTransactions :", error);
            res.status(500).send("Erreur lors du chargement de l'audit des virements.");
        }
    },

    // 8. Exportation des flux financiers au format CSV (Critère 3)
    exportTransactionsCsv: async (req, res) => {
        try {
            // Étape 1 : Récupérer les mêmes filtres que l'écran actuel
            const filters = {
                searchQuery: req.query.q || "",
                minAmount: req.query.minAmount || "",
                maxAmount: req.query.maxAmount || "",
                dateStart: req.query.dateStart || "",
                dateEnd: req.query.dateEnd || ""
            };

            // Étape 2 : Générer le contenu du fichier CSV
            const csvContent = await adminService.exportTransactionsCsv(filters);
            const dateStr = new Date().toISOString().slice(0, 10);

            // Étape 3 : Configurer les en-têtes HTTP pour déclencher le téléchargement
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="audit_virements_hosbank_${dateStr}.csv"`);

            // Étape 4 : Envoyer le fichier au navigateur
            res.send(csvContent);
        } catch (error) {
            console.error("Erreur exportTransactionsCsv :", error);
            res.status(500).send("Erreur lors de l'exportation des flux financiers.");
        }
    },

    // 9. Supervision de l'ensemble des cartes bancaires (Critères 1, 2 et 3)
    getCards: async (req, res) => {
        try {
            // Étape 1 : Récupérer les filtres de type, statut et recherche
            const filters = {
                typeFilter: req.query.type || "ALL",
                statusFilter: req.query.status || "ALL",
                searchQuery: req.query.q || ""
            };

            // Étape 2 : Récupérer les cartes et les statistiques
            const data = await adminService.getCardsSupervision(filters);

            // Étape 3 : Rendre la page EJS
            res.render("admin/cards", {
                currentPath: "/admin/cards",
                admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
                cards: data.cards,
                summary: data.summary,
                filters: filters,
                title: "Supervision des Cartes Bancaires - Administration HosBank"
            });
        } catch (error) {
            console.error("Erreur getCards :", error);
            res.status(500).send("Erreur lors du chargement des cartes bancaires.");
        }
    }
};

module.exports = adminController;
