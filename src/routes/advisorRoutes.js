const express = require("express");
const router = express.Router();
const advisorController = require("../controllers/advisorController");
const { requireAdvisorAuth} = require("../middlewares/authMiddleware");

router.get("/dashboard", requireAdvisorAuth, advisorController.getDashboard);
router.get("/clients/:id", requireAdvisorAuth, advisorController.getClient360);

router.post("/demand/update", requireAdvisorAuth, advisorController.postUpdateDemand);

router.post("/claim/resolve", requireAdvisorAuth, advisorController.postResolveClaim);

module.exports = router;
