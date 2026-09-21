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

exports.getCards = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const cards = await clientService.getCards(userId);

        res.render("client/cards", {
            title: "Mes Cartes | HosBank",
            user: req.session.user,
            cards,
            currentPath: "/client/cards"
        });
    } catch (error) {
        console.error("Erreur récupération cartes :", error);
        res.status(500).send("Erreur lors du chargement des cartes.");
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
