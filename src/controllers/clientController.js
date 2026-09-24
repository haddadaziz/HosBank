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

exports.getTransfers = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;

        const [accounts, beneficiaries] = await Promise.all([
            clientService.getUserAccounts(userId),
            clientService.getBeneficiaries(userId)
        ]);

        const successMessage = req.query.success 
            ? "Bénéficiaire enregistré avec succès !" 
            : (req.query.deleted ? "Bénéficiaire supprimé de votre carnet avec succès." : null);

        res.render("client/transfers", {
            title: "Virements bancaires | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            accounts: accounts,
            beneficiaries: beneficiaries,
            successMessage: successMessage,
            errorMessage: req.query.error ? decodeURIComponent(req.query.error) : null,
            currentPath: "/client/transfers"
        });
    } catch (error) {
        console.error("Erreur Virements Client :", error);
        res.status(500).send("Erreur lors du chargement de la page des virements.");
    }
};

exports.postAddBeneficiary = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;
        const { intitule, iban, bic } = req.body;

        const newBeneficiary = await clientService.addBeneficiary(userId, { intitule, iban, bic });

        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.json({
                success: true,
                message: "Bénéficiaire ajouté avec succès !",
                beneficiary: newBeneficiary
            });
        }

        res.redirect("/client/transfers?success=1");
    } catch (error) {
        console.warn("Erreur ajout bénéficiaire :", error.message);

        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.redirect(`/client/transfers?error=${encodeURIComponent(error.message)}`);
    }
};

exports.postDeleteBeneficiary = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;
        const { id } = req.params;

        await clientService.deleteBeneficiary(id, userId);

        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.json({ success: true, message: "Bénéficiaire supprimé avec succès." });
        }

        res.redirect("/client/transfers?deleted=1");
    } catch (error) {
        console.warn("Erreur suppression bénéficiaire :", error.message);
        res.redirect(`/client/transfers?error=${encodeURIComponent("Impossible de supprimer ce bénéficiaire.")}`);
    }
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
