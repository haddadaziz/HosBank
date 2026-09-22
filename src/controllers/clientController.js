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

/**
 * Consultation de la page des virements (HOS-24)
 */
exports.getTransfers = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const [accounts, beneficiaries] = await Promise.all([
            clientService.getUserAccounts(userId),
            clientService.getBeneficiaries(userId)
        ]);

        res.render("client/transfers", {
            title: "Virements bancaires | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            accounts,
            beneficiaries,
            success: req.query.success || null,
            error: req.query.error || null,
            ref: req.query.ref || null,
            amount: req.query.amount || null,
            dest: req.query.dest || null,
            currentPath: "/client/transfers"
        });
    } catch (error) {
        console.error("Erreur page virements :", error);
        res.status(500).send("Erreur lors du chargement de la page des virements.");
    }
};

/**
 * Traitement d'un virement bancaire (HOS-25)
 */
exports.postTransfer = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { sourceAccountId, beneficiaryId, amount, motif } = req.body;

        if (!sourceAccountId || !beneficiaryId || !amount) {
            return res.redirect("/client/transfers?error=" + encodeURIComponent("Veuillez sélectionner un compte émetteur, un destinataire et renseigner un montant valide."));
        }

        const result = await clientService.executeTransfer(userId, {
            sourceAccountId: parseInt(sourceAccountId, 10),
            beneficiaryId: parseInt(beneficiaryId, 10),
            amount,
            motif
        });

        res.redirect(`/client/transfers?success=transfer_completed&ref=${encodeURIComponent(result.reference)}&amount=${encodeURIComponent(result.amount.toFixed(2))}&dest=${encodeURIComponent(result.beneficiaryName)}`);
    } catch (error) {
        console.error("Erreur exécution virement :", error);
        res.redirect("/client/transfers?error=" + encodeURIComponent(error.message));
    }
};

/**
 * Enregistrement d'un nouveau bénéficiaire (HOS-24)
 */
exports.postAddBeneficiary = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { intitule, iban, bic } = req.body;

        await clientService.addBeneficiary(userId, { intitule, iban, bic });
        res.redirect("/client/transfers?success=beneficiary_added");
    } catch (error) {
        console.error("Erreur ajout bénéficiaire :", error);
        res.redirect("/client/transfers?error=" + encodeURIComponent(error.message));
    }
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

/**
 * Consultation de l'historique des opérations bancaires avec filtres et pagination (HOS-26, HOS-27, HOS-28)
 */
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;

        const {
            page = 1,
            limit = 10,
            accountId = '',
            direction = 'ALL',
            period = 'all',
            search = '',
            export: exportFormat = ''
        } = req.query;

        // Récupérer les comptes pour le filtre de sélection
        const accounts = await clientService.getUserAccounts(userId);

        // Si export CSV demandé, récupérer toutes les écritures filtrées (jusqu'à 1000 max)
        const isExport = exportFormat === 'csv';
        const effectiveLimit = isExport ? 1000 : Math.max(1, parseInt(limit, 10) || 10);
        const effectivePage = isExport ? 1 : Math.max(1, parseInt(page, 10) || 1);

        const data = await clientService.getPaginatedTransactions(userId, {
            accountId,
            direction,
            period,
            search,
            page: effectivePage,
            limit: effectiveLimit
        });

        // Traitement de l'export CSV
        if (isExport) {
            const csvRows = [
                ["Date", "Reference", "Compte", "Type de Compte", "Sens", "Categorie", "Libelle", "Montant (EUR)", "Solde Apres (EUR)"]
            ];

            data.transactions.forEach(tx => {
                csvRows.push([
                    `"${tx.dateFormatted}"`,
                    `"${tx.reference}"`,
                    `"${tx.accountNumber}"`,
                    `"${tx.accountType}"`,
                    `"${tx.direction}"`,
                    `"${(tx.category || '').replace(/"/g, '""')}"`,
                    `"${(tx.label || '').replace(/"/g, '""')}"`,
                    `"${(tx.direction === 'CREDIT' ? '+' : '-') + tx.amount.toFixed(2)}"`,
                    `"${tx.balanceAfter.toFixed(2)}"`
                ]);
            });

            const csvContent = "\uFEFF" + csvRows.map(r => r.join(";")).join("\r\n");
            const filename = `operations_hosbank_${new Date().toISOString().slice(0, 10)}.csv`;

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            return res.send(csvContent);
        }

        // Rendu de la vue EJS avec filtres et pagination
        res.render("client/transactions", {
            title: "Historique des opérations | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            accounts,
            transactions: data.transactions,
            pagination: data.pagination,
            stats: data.stats,
            filters: {
                accountId,
                direction,
                period,
                search: search.trim()
            },
            currentPath: "/client/transactions"
        });
    } catch (error) {
        console.error("Erreur historique des opérations :", error);
        res.status(500).send("Erreur lors du chargement de l'historique des opérations.");
    }
};

