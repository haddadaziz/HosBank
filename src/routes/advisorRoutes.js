const express = require("express");
const router = express.Router();

router.get("/dashboard", (req, res) => {
    res.send("Tableau de bord chargé de clientèle - en cours de développement");
});

module.exports = router;
