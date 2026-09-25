const clientService = require("../services/clientService");

// 1. Afficher le tableau de bord client (comptes, cartes, mouvements)
exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
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
        console.error("Erreur Dashboard Client :", error.message);
        res.status(500).send("Erreur lors du chargement du tableau de bord.");
    }
};

// 2. Afficher la page des virements et des bénéficiaires
exports.getTransfers = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;

        // Récupérer les comptes et bénéficiaires du client
        const [accounts, beneficiaries] = await Promise.all([
            clientService.getUserAccounts(userId),
            clientService.getBeneficiaries(userId)
        ]);

        // Message de succès selon l'action effectuée
        let successMessage = null;
        if (req.query.success) {
            successMessage = "Bénéficiaire enregistré avec succès !";
        } else if (req.query.deleted) {
            successMessage = "Bénéficiaire supprimé de votre carnet avec succès.";
        }

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
        console.error("Erreur Virements Client :", error.message);
        res.status(500).send("Erreur lors du chargement de la page des virements.");
    }
};

// 3. Ajouter un nouveau bénéficiaire (avec contrôle Modulo 97 et règles bancaires)
exports.postAddBeneficiary = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { intitule, iban, bic } = req.body;

        const newBeneficiary = await clientService.addBeneficiary(userId, { intitule, iban, bic });

        // Si la requête est envoyée en AJAX (JSON)
        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.json({
                success: true,
                message: "Bénéficiaire ajouté avec succès !",
                beneficiary: newBeneficiary
            });
        }

        // Redirection classique formulaire
        res.redirect("/client/transfers?success=1");
    } catch (error) {
        console.warn("Erreur ajout bénéficiaire :", error.message);

        // Si la requête est envoyée en AJAX (JSON)
        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Redirection avec message d'erreur clair
        res.redirect(`/client/transfers?error=${encodeURIComponent(error.message)}`);
    }
};

// 4. Supprimer un bénéficiaire du carnet
exports.postDeleteBeneficiary = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
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

// 5. Afficher les cartes bancaires
exports.getCards = (req, res) => {
    res.render("client/cards", {
        title: "Mes Cartes | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        cards: [],
        currentPath: "/client/cards"
    });
};

// 6. Afficher les documents et le RIB
exports.getDocuments = (req, res) => {
    res.render("client/documents", {
        title: "RIB & Démarches | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        currentPath: "/client/documents"
    });
};

// 7. Afficher l'historique des opérations
exports.getTransactions = (req, res) => {
    res.render("client/transactions", {
        title: "Historique des opérations | HosBank",
        user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
        currentPath: "/client/transactions"
    });
};
