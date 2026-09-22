const clientService = require("../services/clientService");

exports.getDashboard = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;

        const data = await clientService.getDashboardData(userId);

        res.render("client/dashboard", {
            title: "Tableau de bord | HosBank",
            user: req.session.user,
            accounts: data.accounts,
            cards: data.cards,
            transactions: data.transactions,
            totalBalance: data.totalBalance,
            currentPath: "/client/dashboard"
        });
    } catch (error) {
        console.error("Erreur Dashboard Client :", error);
        res.status(500).send("Erreur lors du chargement du tableau de bord.");
    }
};

exports.getTransfers = (req, res) => {
    res.render("client/transfers", {
        title: "Virements bancaires | HosBank",
        user: req.session.user,
        currentPath: "/client/transfers"
    });
};

/**
 * Consultation des cartes bancaires (HOS-29)
 */
exports.getCards = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const [cards, accounts] = await Promise.all([
            clientService.getCards(userId),
            clientService.getUserAccounts(userId)
        ]);

        res.render("client/cards", {
            title: "Mes Cartes | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            cards,
            accounts,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/client/cards"
        });
    } catch (error) {
        console.error("Erreur récupération cartes :", error);
        res.status(500).send("Erreur lors du chargement des cartes bancaires.");
    }
};

/**
 * Mise en opposition d'une carte (HOS-31)
 */
exports.postOpposeCard = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { cardId, reason } = req.body;

        if (!cardId) {
            return res.redirect("/client/cards?error=" + encodeURIComponent("Identifiant de carte manquant."));
        }

        await clientService.opposeCard(userId, parseInt(cardId, 10), reason);
        res.redirect("/client/cards?success=opposition");
    } catch (error) {
        console.error("Erreur opposition carte :", error);
        res.redirect("/client/cards?error=" + encodeURIComponent(error.message));
    }
};

/**
 * Création d'une carte virtuelle (HOS-30)
 */
exports.postCreateVirtualCard = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { accountId, monthlyLimit } = req.body;

        if (!accountId) {
            return res.redirect("/client/cards?error=" + encodeURIComponent("Veuillez sélectionner un compte bancaire de rattachement."));
        }

        await clientService.createVirtualCard(userId, parseInt(accountId, 10), monthlyLimit);
        res.redirect("/client/cards?success=virtual_created");
    } catch (error) {
        console.error("Erreur création carte virtuelle :", error);
        res.redirect("/client/cards?error=" + encodeURIComponent(error.message));
    }
};

/**
 * Demande de recalcul de code PIN (HOS-32)
 */
exports.postRequestPin = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { cardId } = req.body;

        if (!cardId) {
            return res.redirect("/client/cards?error=" + encodeURIComponent("Identifiant de carte manquant."));
        }

        await clientService.requestPin(userId, parseInt(cardId, 10));
        res.redirect("/client/cards?success=pin_requested");
    } catch (error) {
        console.error("Erreur demande code PIN :", error);
        res.redirect("/client/cards?error=" + encodeURIComponent(error.message));
    }
};

exports.getDocuments = (req, res) => {
    res.render("client/documents", {
        title: "RIB & Démarches | HosBank",
        user: req.session.user,
        currentPath: "/client/documents"
    });
};

exports.getTransactions = (req, res) => {
    res.render("client/transactions", {
        title: "Historique des opérations | HosBank",
        user: req.session.user,
        currentPath: "/client/transactions"
    });
};
