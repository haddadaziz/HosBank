const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

const requireAdminAuth = (req, res, next) => {
    if (!req.session || !req.session.admin) {
        return res.redirect("/login");
    }

    next();
};

router.get("/login", (req, res) => res.redirect("/login"));
router.post("/login", (req, res) => res.redirect(307, "/login"));
router.get("/logout", adminController.logout);

router.get("/", (req, res) => res.redirect("/admin/dashboard"));
router.get("/dashboard", requireAdminAuth, adminController.getDashboard);

router.get("/clients", requireAdminAuth, adminController.getClients);
router.post("/clients/new", requireAdminAuth, adminController.postAddClient);
router.post("/clients/:id/edit", requireAdminAuth, adminController.postEditClient);
router.post(
    "/clients/:id/toggle-status",
    requireAdminAuth,
    adminController.postToggleClientStatus
);

router.get("/accounts", requireAdminAuth, adminController.getAccounts);
router.post(
    "/accounts/:id/toggle-card",
    requireAdminAuth,
    adminController.postToggleCardStatus
);
router.post(
    "/accounts/:id/toggle-status",
    requireAdminAuth,
    adminController.postToggleAccountStatus
);

router.post(
    "/cards/:id/toggle-block",
    requireAdminAuth,
    adminController.postToggleCardBlock
);
router.post(
    "/cards/:id/oppose",
    requireAdminAuth,
    adminController.postOpposeCard
);
router.post(
    "/cards/:id/limits",
    requireAdminAuth,
    adminController.postUpdateCardLimits
);

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

router.get("/kyc", requireAdminAuth, adminController.getKyc);
router.post(
    "/kyc/:id/status",
    requireAdminAuth,
    adminController.postUpdateKyc
);

router.get("/settings", requireAdminAuth, adminController.getSettings);

router.get("/requests", requireAdminAuth, adminController.getRequests);
router.post(
    "/demandes/:id/status",
    requireAdminAuth,
    adminController.postUpdateDemandeStatus
);
router.post(
    "/reclamations/:id/status",
    requireAdminAuth,
    adminController.postUpdateReclamationStatus
);

module.exports = router;