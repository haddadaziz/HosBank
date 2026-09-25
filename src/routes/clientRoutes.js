const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { requireClientAuth } = require("../middlewares/authMiddleware");

router.get("/", (req, res) => res.redirect("/client/dashboard"));

router.get("/dashboard", requireClientAuth, clientController.getDashboard);
router.get(["/accounts", "/accounts/:id"], requireClientAuth, (req, res) => res.redirect("/client/dashboard"));
router.get("/transfers", requireClientAuth, clientController.getTransfers);

// Gestion des bénéficiaires
router.post("/beneficiaries", requireClientAuth, clientController.postAddBeneficiary);
router.post("/beneficiaries/:id/delete", requireClientAuth, clientController.postDeleteBeneficiary);

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

router.get("/profile", requireClientAuth, clientController.getProfile);
router.post("/profile", requireClientAuth, clientController.postUpdateCoordinates);
router.post("/profile/password", requireClientAuth, clientController.postChangePassword);

module.exports = router;
