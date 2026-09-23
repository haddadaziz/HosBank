const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { requireClientAuth } = require("../middlewares/authMiddleware");

router.get("/", (req, res) => res.redirect("/client/dashboard"));

router.get("/dashboard", requireClientAuth, clientController.getDashboard);
router.get("/transfers", requireClientAuth, clientController.getTransfers);

// Gestion des bénéficiaires
router.post("/beneficiaries", requireClientAuth, clientController.postAddBeneficiary);
router.post("/beneficiaries/:id/delete", requireClientAuth, clientController.postDeleteBeneficiary);

router.get("/cards", requireClientAuth, clientController.getCards);
router.get("/documents", requireClientAuth, clientController.getDocuments);
router.get("/transactions", requireClientAuth, clientController.getTransactions);

module.exports = router;
