const express = require("express");
const router = express.Router();
const advisorController = require("../controllers/advisorController");
const { requireAdvisorAuth} = require("../middlewares/authMiddleware");

router.get("/dashboard", requireAdvisorAuth, advisorController.getDashboard);
router.get("/clients", requireAdvisorAuth, advisorController.getClients);
router.get("/clients/:id", requireAdvisorAuth, advisorController.getClient360);
router.get("/demands", requireAdvisorAuth, advisorController.getDemands);
router.get("/claims", requireAdvisorAuth, advisorController.getClaims);
router.get("/interactions", requireAdvisorAuth, advisorController.getInteractions);

router.get("/profile", requireAdvisorAuth, advisorController.getProfile);
router.post("/profile", requireAdvisorAuth, advisorController.postUpdateProfile);
router.post("/profile/password", requireAdvisorAuth, advisorController.postChangePassword);

router.post("/demand/update", requireAdvisorAuth, advisorController.postUpdateDemand);
router.post("/claim/resolve", requireAdvisorAuth, advisorController.postResolveClaim);
router.get("/logout", (req, res) => res.redirect("/logout"));

module.exports = router;
