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

    logout: async (req, res) => {
        if (req.session) {
            req.session.destroy();
        }
        res.redirect("/login");
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

    postAddClient: async (req, res) => {
        const { gender, firstName, lastName, email, phone, city, role, password } = req.body;
        if (firstName && lastName && email) {
            await adminService.addClient({ gender, firstName, lastName, email, phone, city, role, password });
            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Création de l'utilisateur ${firstName} ${lastName} (${email})`,
                req.ip || "127.0.0.1",
                "Info"
            );
        }
        res.redirect("/admin/clients");
    },

    postEditClient: async (req, res) => {
        try {
            const { id } = req.params;
            const { gender, firstName, lastName, email, phone, city, role } = req.body;
            if (firstName && lastName && email) {
                await adminService.updateClient(id, { gender, firstName, lastName, email, phone, city, role });
                await adminService.logAction(
                    req.session?.admin?.email || "Admin",
                    `Mise à jour de l'utilisateur #${id} (${firstName} ${lastName})`,
                    req.ip || "127.0.0.1",
                    "Info"
                );
            }
        } catch (error) {
            console.error("Erreur mise à jour utilisateur:", error);
        }
        res.redirect("/admin/clients");
    },

    postUpdateUserRole: async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;
        if (role && ["CLIENT", "CHARGE_CLIENT", "ADMINISTRATEUR"].includes(role)) {
            await adminService.updateUserRole(id, role);
            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Attribution du rôle ${role} à l'utilisateur #${id}`,
                req.ip || "127.0.0.1",
                "Avertissement"
            );
        }
        res.redirect("/admin/clients");
    },

    postAssignAdvisor: async (req, res) => {
        const { id } = req.params;
        const { advisorId } = req.body;
        const assignedId = advisorId && !isNaN(advisorId) ? parseInt(advisorId, 10) : null;
        await adminService.assignClientAdvisor(id, assignedId);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Affectation du client #${id} au conseiller #${assignedId || 'aucun'}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/clients");
    },

    postToggleClientStatus: async (req, res) => {
        const { id } = req.params;
        await adminService.toggleClientStatus(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Changement de statut (verrouillage/activation) de l'utilisateur #${id}`,
            req.ip || "127.0.0.1",
            "Avertissement"
        );
        res.redirect("/admin/clients");
    },

    getAccounts: async (req, res) => {
        const accounts = await adminService.getAccounts();
        const cards = await adminService.getCards();
        res.render("admin/accounts", {
            currentPath: "/admin/accounts",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            accounts: accounts,
            cards: cards,
            title: "Comptes & Cartes - Administration HosBank"
        });
    },

    postToggleCardStatus: async (req, res) => {
        const { id } = req.params;
        await adminService.toggleCardStatus(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Changement d'état de la carte bancaire pour le compte ${id}`,
            req.ip || "127.0.0.1",
            "Avertissement"
        );
        res.redirect("/admin/accounts");
    },

    postToggleCardBlock: async (req, res) => {
        const { id } = req.params;
        await adminService.toggleCardBlock(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Changement d'état pour la carte bancaire ID ${id}`,
            req.ip || "127.0.0.1",
            "Avertissement"
        );
        res.redirect("/admin/accounts");
    },

    postOpposeCard: async (req, res) => {
        const { id } = req.params;
        await adminService.opposeCard(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Mise en opposition d'urgence de la carte bancaire ID ${id}`,
            req.ip || "127.0.0.1",
            "Alerte"
        );
        res.redirect("/admin/accounts");
    },

    postUpdateCardLimits: async (req, res) => {
        const { id } = req.params;
        const { plafondPaiement, plafondRetrait } = req.body;
        await adminService.updateCardLimits(id, parseFloat(plafondPaiement), parseFloat(plafondRetrait));
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Mise à jour des plafonds pour la carte ID ${id}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/accounts");
    },

    postToggleAccountStatus: async (req, res) => {
        const { id } = req.params;
        await adminService.toggleAccountStatus(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Changement de statut du compte bancaire N° ${id}`,
            req.ip || "127.0.0.1",
            "Avertissement"
        );
        res.redirect("/admin/accounts");
    },

    getTransactions: async (req, res) => {
        const transactions = await adminService.getTransactions();
        res.render("admin/transactions", {
            currentPath: "/admin/transactions",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            transactions: transactions,
            title: "Surveillance des Virements - Administration HosBank"
        });
    },

    postApproveTransaction: async (req, res) => {
        const { id } = req.params;
        await adminService.approveTransaction(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Approbation manuelle de la transaction ${id}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/transactions");
    },

    postRejectTransaction: async (req, res) => {
        const { id } = req.params;
        await adminService.rejectTransaction(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Rejet et blocage de la transaction ${id}`,
            req.ip || "127.0.0.1",
            "Alerte"
        );
        res.redirect("/admin/transactions");
    },

    getKyc: async (req, res) => {
        const kycRequests = await adminService.getKycRequests();
        res.render("admin/kyc", {
            currentPath: "/admin/kyc",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            kycRequests: kycRequests,
            title: "Conformité & Vérification KYC - Administration HosBank"
        });
    },

    postUpdateKyc: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        await adminService.updateKycStatus(id, status);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Mise à jour du dossier KYC ${id} -> ${status}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/kyc");
    },

    getSettings: async (req, res) => {
        const auditLogs = await adminService.getAuditLogs();
        res.render("admin/settings", {
            currentPath: "/admin/settings",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            auditLogs: auditLogs,
            title: "Paramètres & Audit - Administration HosBank"
        });
    },

    getRequests: async (req, res) => {
        const demandes = await adminService.getDemandes();
        const reclamations = await adminService.getReclamations();
        res.render("admin/requests", {
            currentPath: "/admin/requests",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            demandes: demandes,
            reclamations: reclamations,
            title: "Demandes & Réclamations - Administration HosBank"
        });
    },

    postUpdateDemandeStatus: async (req, res) => {
        const { id } = req.params;
        const { statut, reponse } = req.body;
        await adminService.updateDemandeStatus(id, statut, reponse);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Traitement de la demande N° ${id} -> ${statut}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/requests");
    },

    postUpdateReclamationStatus: async (req, res) => {
        const { id } = req.params;
        const { statut, reponse } = req.body;
        await adminService.updateReclamationStatus(id, statut, reponse);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Mise à jour de la réclamation N° ${id} -> ${statut}`,
            req.ip || "127.0.0.1",
            "Info"
        );
        res.redirect("/admin/requests");
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
    }
};

module.exports = adminController;
