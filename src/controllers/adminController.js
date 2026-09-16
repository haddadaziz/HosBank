const adminService = require("../services/adminService");

const adminController = {
    // Page de connexion admin (reproduction fidèle du design)
    getLogin: (req, res) => {
        if (req.session && req.session.admin) {
            return res.redirect("/admin/dashboard");
        }
        res.render("admin/login", { 
            error: null,
            title: "Connexion Espace Administration - HosBank"
        });
    },

    // Traitement de la connexion admin
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
        res.render("admin/login", {
            error: "Identifiants invalides. Veuillez renseigner votre e-mail et mot de passe administrateur.",
            title: "Connexion Espace Administration - HosBank"
        });
    },

    // Déconnexion
    logout: async (req, res) => {
        if (req.session) {
            req.session.destroy();
        }
        res.redirect("/admin/login");
    },

    // Tableau de bord principal
    getDashboard: async (req, res) => {
        const stats = await adminService.getDashboardStats();
        res.render("admin/dashboard", {
            currentPath: "/admin/dashboard",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            stats: stats,
            title: "Tableau de Bord - Administration HosBank"
        });
    },

    // Liste et gestion des clients
    getClients: async (req, res) => {
        const search = req.query.q || "";
        const clients = await adminService.getClients(search);
        res.render("admin/clients", {
            currentPath: "/admin/clients",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            clients: clients,
            searchQuery: search,
            title: "Gestion des Clients - Administration HosBank"
        });
    },

    // Création d'un client
    postAddClient: async (req, res) => {
        const { gender, firstName, lastName, email, phone, city } = req.body;
        if (firstName && lastName && email) {
            await adminService.addClient({ gender, firstName, lastName, email, phone, city });
            await adminService.logAction(
                req.session?.admin?.email || "Admin",
                `Création du client ${firstName} ${lastName} (${email})`,
                req.ip || "127.0.0.1",
                "Info"
            );
        }
        res.redirect("/admin/clients");
    },

    // Basculer l'état d'un client (Actif <-> Suspendu)
    postToggleClientStatus: async (req, res) => {
        const { id } = req.params;
        await adminService.toggleClientStatus(id);
        await adminService.logAction(
            req.session?.admin?.email || "Admin",
            `Modification du statut du client ${id}`,
            req.ip || "127.0.0.1",
            "Avertissement"
        );
        res.redirect("/admin/clients");
    },

    // Comptes et cartes bancaires
    getAccounts: async (req, res) => {
        const accounts = await adminService.getAccounts();
        res.render("admin/accounts", {
            currentPath: "/admin/accounts",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            accounts: accounts,
            title: "Comptes & Cartes - Administration HosBank"
        });
    },

    // Bloquer / Débloquer une carte
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

    // Surveillance des transactions et virements
    getTransactions: async (req, res) => {
        const transactions = await adminService.getTransactions();
        res.render("admin/transactions", {
            currentPath: "/admin/transactions",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            transactions: transactions,
            title: "Surveillance des Virements - Administration HosBank"
        });
    },

    // Approuver un virement signalé
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

    // Rejeter un virement signalé
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

    // Validation KYC et conformité
    getKyc: async (req, res) => {
        const kycRequests = await adminService.getKycRequests();
        res.render("admin/kyc", {
            currentPath: "/admin/kyc",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            kycRequests: kycRequests,
            title: "Conformité & Vérification KYC - Administration HosBank"
        });
    },

    // Mettre à jour l'état d'un dossier KYC
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

    // Paramètres et logs d'audit
    getSettings: async (req, res) => {
        const auditLogs = await adminService.getAuditLogs();
        res.render("admin/settings", {
            currentPath: "/admin/settings",
            admin: req.session.admin || { name: "Administrateur HosBank", role: "Super Admin" },
            auditLogs: auditLogs,
            title: "Paramètres & Audit - Administration HosBank"
        });
    }
};

module.exports = adminController;
