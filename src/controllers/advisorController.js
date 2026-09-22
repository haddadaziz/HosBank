const advisorService = require("../services/advisorService");

/**
 * Tableau de bord du Chargé Clientèle (HOS-40, HOS-41, HOS-43, HOS-47)
 */
exports.getDashboard = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;

        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/dashboard", {
            title: "Tableau de Bord Conseiller | HosBank",
            advisor: data.advisor,
            metrics: data.metrics,
            clients: data.clients,
            demands: data.demands,
            claims: data.claims,
            interactions: data.interactions,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/dashboard"
        });
    } catch (error) {
        console.error("Erreur Dashboard Conseiller :", error);
        res.status(500).send("Erreur lors du chargement du tableau de bord conseiller.");
    }
};

/**
 * Fiche 360° du client sélectionné (HOS-42)
 */
exports.getClient360 = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const clientId = parseInt(req.params.id, 10);

        if (isNaN(clientId)) {
            return res.redirect("/advisor/dashboard");
        }

        const [clientData, advisor] = await Promise.all([
            advisorService.getClient360(clientId),
            advisorService.getAdvisorProfile(advisorId)
        ]);

        res.render("advisor/client-360", {
            title: `${clientData.client.prenom} ${clientData.client.nom} - Fiche 360° Client | HosBank`,
            client: clientData.client,
            accounts: clientData.accounts,
            totalAssets: clientData.totalAssets,
            cards: clientData.cards,
            operations: clientData.operations,
            demands: clientData.demands,
            claims: clientData.claims,
            advisor,
            currentPath: "/advisor/dashboard"
        });
    } catch (error) {
        console.error("Erreur Fiche 360° Client :", error);
        res.redirect("/advisor/dashboard?error=" + encodeURIComponent(error.message));
    }
};

/**
 * Traitement et validation d'une demande bancaire (HOS-44, HOS-45, HOS-46)
 */
exports.postUpdateDemand = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const { demandId, newStatus, advisorComment } = req.body;

        if (!demandId || !newStatus) {
            return res.redirect("/advisor/dashboard?error=" + encodeURIComponent("Paramètres de demande manquants."));
        }

        await advisorService.updateDemandStatus(advisorId, { demandId, newStatus, advisorComment });

        const redirectUrl = req.headers.referer || "/advisor/dashboard";
        res.redirect(redirectUrl.includes("?") ? redirectUrl + "&success=demand_updated" : redirectUrl + "?success=demand_updated");
    } catch (error) {
        console.error("Erreur traitement demande :", error);
        res.redirect("/advisor/dashboard?error=" + encodeURIComponent(error.message));
    }
};

/**
 * Prise en charge et clôture d'une réclamation avec réponse officielle (HOS-48, HOS-49)
 */
exports.postResolveClaim = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const { claimId, newStatus, responseText } = req.body;

        if (!claimId || !newStatus) {
            return res.redirect("/advisor/dashboard?error=" + encodeURIComponent("Paramètres de réclamation manquants."));
        }

        await advisorService.resolveClaim(advisorId, { claimId, newStatus, responseText });

        const redirectUrl = req.headers.referer || "/advisor/dashboard";
        res.redirect(redirectUrl.includes("?") ? redirectUrl + "&success=claim_updated" : redirectUrl + "?success=claim_updated");
    } catch (error) {
        console.error("Erreur réponse réclamation :", error);
        res.redirect("/advisor/dashboard?error=" + encodeURIComponent(error.message));
    }
};
