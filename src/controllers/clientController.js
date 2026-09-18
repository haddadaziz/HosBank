const clientService = require("../services/clientService");

exports.getDashboard = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;

        const data = await clientService.getDashboardData(userId);

        res.render("client/dashboard", {
            title: "Tableau de bord | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
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
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        currentPath: "/client/transfers"
    });
};

exports.getCards = (req, res) => {
    res.render("client/cards", {
        title: "Mes Cartes | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        cards: [],
        currentPath: "/client/cards"
    });
};

exports.getDocuments = (req, res) => {
    res.render("client/documents", {
        title: "RIB & Démarches | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        currentPath: "/client/documents"
    });
};

exports.getTransactions = (req, res) => {
    res.render("client/transactions", {
        title: "Historique des opérations | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        currentPath: "/client/transactions"
    });
};
