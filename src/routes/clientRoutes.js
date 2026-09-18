const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { requireClientAuth } = require("../middlewares/authMiddleware");

// Redirection par défaut vers le tableau de bord
router.get("/", (req, res) => res.redirect("/client/dashboard"));

// Routes GET de consultation (Vues de l'espace Client)
router.get("/dashboard", requireClientAuth, clientController.getDashboard);
router.get("/transfers", requireClientAuth, clientController.getTransfers);
router.get("/cards", requireClientAuth, clientController.getCards);
router.get("/documents", requireClientAuth, clientController.getDocuments);
router.get("/transactions", requireClientAuth, clientController.getTransactions);

module.exports = router;
