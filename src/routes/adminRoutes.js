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
router.post("/clients/:id/role", requireAdminAuth, adminController.postUpdateUserRole);
router.post("/clients/:id/assign", requireAdminAuth, adminController.postAssignAdvisor);
router.post(
    "/clients/:id/toggle-status",
    requireAdminAuth,
    adminController.postToggleClientStatus
);

router.get("/accounts", requireAdminAuth, adminController.getAccounts);
router.get("/cards", requireAdminAuth, adminController.getCards);

router.get("/transactions", requireAdminAuth, adminController.getTransactions);
router.get("/transactions/export", requireAdminAuth, adminController.exportTransactionsCsv);

router.get("/advisors-workload", requireAdminAuth, adminController.getAdvisorsWorkload);
router.post("/advisors/:id/remind", requireAdminAuth, adminController.postSendReminder);

module.exports = router;