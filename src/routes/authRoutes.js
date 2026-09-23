const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isGuest } = require("../middlewares/authMiddleware");

router.get("/login", isGuest, authController.getLogin);
router.get("/register", isGuest, authController.getRegister);

router.post("/login", authController.postLogin);
router.post("/register", authController.postRegister);

router.get("/verify-email", authController.getVerifyEmail);

router.get("/logout", authController.logout);
router.post("/logout", authController.logout);

module.exports = router;
