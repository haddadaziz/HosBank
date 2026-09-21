const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isGuest } = require("../middlewares/authMiddleware");

// Pages de connexion et inscription (redirige si déjà connecté)
router.get("/login", isGuest, authController.getLogin);
router.get("/register", isGuest, authController.getRegister);

// Traitements des formulaires
router.post("/login", authController.postLogin);
router.post("/register", authController.postRegister);

// Vérification de l'adresse email par lien
router.get("/verify-email", authController.getVerifyEmail);

// Déconnexion
router.get("/logout", authController.getLogout);

module.exports = router;
