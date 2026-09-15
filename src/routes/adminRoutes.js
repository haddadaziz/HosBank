const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

// Middleware de vérification de session admin
const requireAdminAuth = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.redirect("/admin/login");
    }

    next();
};

// Authentification Admin
router.get("/login", adminController.getLogin);
router.post("/login", adminController.postLogin);
router.get("/logout", adminController.logout);

// Tableau de bord
router.get("/", (req, res) => res.redirect("/admin/dashboard"));
router.get("/dashboard", requireAdminAuth, adminController.getDashboard);

// Gestion des Clients
router.get("/clients", requireAdminAuth, adminController.getClients);
router.post("/clients/new", requireAdminAuth, adminController.postAddClient);
router.post(
    "/clients/:id/toggle-status",
    requireAdminAuth,
    adminController.postToggleClientStatus
);

// Comptes & Cartes
router.get("/accounts", requireAdminAuth, adminController.getAccounts);
router.post(
    "/accounts/:id/toggle-card",
    requireAdminAuth,
    adminController.postToggleCardStatus
);

// Transactions & Virements
router.get("/transactions", requireAdminAuth, adminController.getTransactions);
router.post(
    "/transactions/:id/approve",
    requireAdminAuth,
    adminController.postApproveTransaction
);
router.post(
    "/transactions/:id/reject",
    requireAdminAuth,
    adminController.postRejectTransaction
);

// Validation KYC & Conformité
router.get("/kyc", requireAdminAuth, adminController.getKyc);
router.post(
    "/kyc/:id/status",
    requireAdminAuth,
    adminController.postUpdateKyc
);

// Paramètres & Journal d'Audit
router.get("/settings", requireAdminAuth, adminController.getSettings);

module.exports = router;