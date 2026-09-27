const advisorService = require("../services/advisorService");

exports.getDashboard = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;

        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/dashboard", {
            title: "Vue d'ensemble | Conseiller HosBank",
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

exports.getClients = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/clients", {
            title: "Clients Affectés | Conseiller HosBank",
            advisor: data.advisor,
            metrics: data.metrics,
            clients: data.clients,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/clients"
        });
    } catch (error) {
        console.error("Erreur Clients Conseiller :", error);
        res.status(500).send("Erreur lors du chargement des clients.");
    }
};

exports.getDemands = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/demands", {
            title: "Demandes Bancaires | Conseiller HosBank",
            advisor: data.advisor,
            metrics: data.metrics,
            demands: data.demands,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/demands"
        });
    } catch (error) {
        console.error("Erreur Demandes Conseiller :", error);
        res.status(500).send("Erreur lors du chargement des demandes.");
    }
};

exports.getClaims = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/claims", {
            title: "Réclamations Clients | Conseiller HosBank",
            advisor: data.advisor,
            metrics: data.metrics,
            claims: data.claims,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/claims"
        });
    } catch (error) {
        console.error("Erreur Réclamations Conseiller :", error);
        res.status(500).send("Erreur lors du chargement des réclamations.");
    }
};

exports.getInteractions = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const data = await advisorService.getDashboardData(advisorId);

        res.render("advisor/interactions", {
            title: "Journal d'Interactions | Conseiller HosBank",
            advisor: data.advisor,
            metrics: data.metrics,
            interactions: data.interactions,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/interactions"
        });
    } catch (error) {
        console.error("Erreur Interactions Conseiller :", error);
        res.status(500).send("Erreur lors du chargement du journal d'interactions.");
    }
};

exports.getClient360 = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const clientId = parseInt(req.params.id, 10);

        if (isNaN(clientId)) {
            return res.redirect("/advisor/clients");
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
            currentPath: "/advisor/clients"
        });
    } catch (error) {
        console.error("Erreur Fiche 360° Client :", error);
        res.redirect("/advisor/clients?error=" + encodeURIComponent(error.message));
    }
};

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

exports.getProfile = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;

        const advisor = await advisorService.getAdvisorProfile(advisorId);

        res.render("advisor/profile", {
            title: "Mon Profil Conseiller | HosBank",
            advisor,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/advisor/profile"
        });
    } catch (error) {
        console.error("Erreur consultation profil conseiller :", error);
        res.redirect("/advisor/dashboard?error=" + encodeURIComponent(error.message));
    }
};

exports.postUpdateProfile = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const { phone } = req.body;

        const db = require("../config/db");
        if (phone !== undefined) {
            await db.query(`UPDATE utilisateurs SET telephone = $1 WHERE id = $2`, [phone.trim(), advisorId]);
        }

        res.redirect("/advisor/profile?success=" + encodeURIComponent("Vos coordonnées ont été mises à jour avec succès."));
    } catch (error) {
        console.error("Erreur mise à jour coordonnées conseiller :", error);
        res.redirect("/advisor/profile?error=" + encodeURIComponent(error.message));
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const rawId = req.session?.user?.id || req.session?.advisor?.id;
        const advisorId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 2;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        const clientService = require("../services/clientService");
        await clientService.updateUserPassword(advisorId, { currentPassword, newPassword, confirmPassword });

        res.redirect("/advisor/profile?success=" + encodeURIComponent("Votre mot de passe a été modifié avec succès."));
    } catch (error) {
        console.error("Erreur modification mot de passe conseiller :", error);
        res.redirect("/advisor/profile?error=" + encodeURIComponent(error.message));
    }
};

