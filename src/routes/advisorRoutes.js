const express = require("express");
const router = express.Router();
const advisorController = require("../controllers/advisorController");

router.get("/dashboard", advisorController.getDashboard);

router.post("/demand/update", advisorController.postUpdateDemand);

router.post("/claim/resolve", advisorController.postResolveClaim);

module.exports = router;
