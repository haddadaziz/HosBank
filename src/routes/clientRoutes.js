const express = require("express");
const router = express.Router();
const { isAuthenticated, hasRole } = require("../middlewares/authMiddleware");

// Tableau de bord client (protégé par authentification)
router.get("/dashboard", isAuthenticated, hasRole("CLIENT"), (req, res) => {
    const user = req.session.user;
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Espace Client | HosBank</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#F6EFE0] min-h-screen flex items-center justify-center p-6 text-[#282330]">
            <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-[#D8CEBB]">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-xl bg-[#746B92] text-white flex items-center justify-center font-bold text-xl">
                        HB
                    </div>
                    <div>
                        <h1 class="text-xl font-bold">HosBank - Espace Client</h1>
                        <p class="text-xs text-gray-500">Session active & vérifiée</p>
                    </div>
                </div>
                
                <div class="bg-[#F9F6F0] p-4 rounded-xl border border-[#E8DFC8] space-y-2 mb-6">
                    <p class="text-sm"><strong>Client :</strong> ${user.civilite || ''} ${user.name}</p>
                    <p class="text-sm"><strong>Email :</strong> ${user.email}</p>
                    <p class="text-sm"><strong>Rôle :</strong> <span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-semibold">${user.role}</span></p>
                </div>

                <div class="flex items-center justify-between">
                    <a href="/" class="text-sm text-[#746B92] hover:underline font-medium">← Accueil</a>
                    <a href="/logout" class="bg-[#746B92] hover:bg-[#635B7E] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                        Se déconnecter
                    </a>
                </div>
            </div>
        </body>
        </html>
    `);
});

module.exports = router;
