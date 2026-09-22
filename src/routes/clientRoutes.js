const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { requireClientAuth } = require("../middlewares/authMiddleware");

// Redirection par défaut vers le tableau de bord
router.get("/", (req, res) => res.redirect("/client/dashboard"));

// Routes GET de consultation (Vues de l'espace Client)
router.get("/dashboard", requireClientAuth, clientController.getDashboard);
router.get("/accounts", requireClientAuth, (req, res) => res.redirect("/client/dashboard"));
router.get("/accounts/:id", requireClientAuth, clientController.getAccountDetail);
router.get("/transfers", requireClientAuth, clientController.getTransfers);
router.post("/transfers", requireClientAuth, clientController.postTransfer);
router.post("/beneficiaries", requireClientAuth, clientController.postAddBeneficiary);
router.get("/cards", requireClientAuth, clientController.getCards);
router.post("/cards/opposition", requireClientAuth, clientController.postOpposeCard);
router.post("/cards/virtual", requireClientAuth, clientController.postCreateVirtualCard);
router.post("/cards/pin", requireClientAuth, clientController.postRequestPin);
router.get("/documents", requireClientAuth, clientController.getDocuments);
router.get("/documents/rib/print", requireClientAuth, clientController.getPrintRib);
router.post("/documents/savings", requireClientAuth, clientController.postCreateSavingsDemand);
router.post("/documents/reclamations", requireClientAuth, clientController.postCreateReclamation);
router.get("/transactions", requireClientAuth, clientController.getTransactions);

// Routes Profil & Informations personnelles (HOS-38, HOS-39)
router.get("/profile", requireClientAuth, clientController.getProfile);
router.post("/profile", requireClientAuth, clientController.postUpdateCoordinates);
router.post("/profile/password", requireClientAuth, clientController.postChangePassword);

module.exports = router;
