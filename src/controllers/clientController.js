const clientService = require("../services/clientService");

// 1. Afficher le tableau de bord client (comptes, cartes, mouvements) - Style Développeur Junior
exports.getDashboard = async (req, res) => {
    try {
        // Étape 1 : Récupérer l'identifiant du client connecté
        let userId = 3; // Compte par défaut pour la démonstration
        if (req.session && req.session.user && req.session.user.id) {
            userId = parseInt(req.session.user.id, 10);
        }

        // Étape 2 : Récupérer les données du client via le service
        const data = await clientService.getDashboardData(userId);

        // Étape 3 : Rendre la page avec toutes les informations
        res.render("client/dashboard", {
            title: "Tableau de bord | HosBank",
            user: req.session && req.session.user ? req.session.user : { name: "Alexandre Moreau", avatar: "AM" },
            accounts: data.accounts,
            cards: data.cards,
            transactions: data.transactions,
            totalBalance: data.totalBalance,
            currentBalance: data.currentBalance,
            savingsBalance: data.savingsBalance,
            hasSavingsAccount: data.hasSavingsAccount,
            advisor: data.advisor,
            currentPath: "/client/dashboard"
        });
    } catch (error) {
        console.error("Erreur Dashboard Client :", error.message);
        res.status(500).send("Erreur lors du chargement du tableau de bord.");
    }
};

// 2. Afficher la page des virements et des bénéficiaires (style développeur junior)
exports.getTransfers = async (req, res) => {
    try {
        // Étape 1 : Récupérer l'identifiant du client
        var userId = 3;
        if (req.session && req.session.user && req.session.user.id) {
            userId = parseInt(req.session.user.id, 10);
        }

        // Étape 2 : Récupérer les comptes et les bénéficiaires
        var accounts = await clientService.getUserAccounts(userId);
        var beneficiaries = await clientService.getBeneficiaries(userId);

        // Étape 3 : Gérer les messages de succès
        var successMessage = null;
        if (req.query.success) {
            successMessage = "Bénéficiaire enregistré avec succès !";
        } else if (req.query.deleted) {
            successMessage = "Bénéficiaire supprimé de votre carnet avec succès.";
        }

        // Étape 4 : Gérer le message d'erreur éventuel
        var errorMessage = null;
        if (req.query.error) {
            errorMessage = decodeURIComponent(req.query.error);
        }

        // Étape 5 : Rendre la vue des virements
        var userSession = req.session && req.session.user ? req.session.user : { name: "Alexandre Moreau", avatar: "AM" };

        res.render("client/transfers", {
            title: "Virements bancaires | HosBank",
            user: userSession,
            accounts: accounts,
            beneficiaries: beneficiaries,
            successMessage: successMessage,
            errorMessage: errorMessage,
            success: req.query.success || null,
            error: req.query.error || null,
            ref: req.query.ref || null,
            amount: req.query.amount || null,
            dest: req.query.dest || null,
            currentPath: "/client/transfers"
        });
    } catch (error) {
        console.error("Erreur lors du chargement des virements :", error.message);
        res.status(500).send("Erreur lors du chargement de la page des virements.");
    }
};

// 3. Ajouter un nouveau bénéficiaire avec validation stricte
exports.postAddBeneficiary = async (req, res) => {
    try {
        // Etape 1 : Recuperer l'identifiant du client connecte
        let utilisateurId = 3;
        if (req.session && req.session.user && req.session.user.id) {
            utilisateurId = parseInt(req.session.user.id, 10);
        }

        // Etape 2 : Recuperer les donnees du formulaire
        const intitule = req.body.intitule;
        const iban = req.body.iban;
        const bic = req.body.bic;

        // Etape 3 : Creer le beneficiaire via le service
        const nouveauBeneficiaire = await clientService.addBeneficiary(utilisateurId, {
            intitule: intitule,
            iban: iban,
            bic: bic
        });

        // Etape 4 : Repondre en JSON si requete AJAX, sinon rediriger avec message de succes
        const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes("json"));
        if (isAjax) {
            return res.json({
                success: true,
                message: "Bénéficiaire ajouté avec succès !",
                beneficiary: nouveauBeneficiaire
            });
        }

        return res.redirect("/client/transfers?success=1");
    } catch (erreur) {
        console.warn("Erreur ajout bénéficiaire :", erreur.message);

        const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes("json"));
        if (isAjax) {
            return res.status(400).json({
                success: false,
                message: erreur.message
            });
        }

        return res.redirect("/client/transfers?error=" + encodeURIComponent(erreur.message));
    }
};

// 4. Supprimer un bénéficiaire du carnet (style développeur junior)
exports.postDeleteBeneficiary = async (req, res) => {
    try {
        // Étape 1 : Récupérer l'identifiant du client connecté
        var userId = 3;
        if (req.session && req.session.user && req.session.user.id) {
            userId = parseInt(req.session.user.id, 10);
        }

        // Étape 2 : Récupérer l'identifiant du bénéficiaire
        var id = req.params.id;

        // Étape 3 : Demander au service de supprimer le bénéficiaire
        await clientService.deleteBeneficiary(id, userId);

        // Étape 4 : Rediriger avec l'indicateur de suppression réussie
        return res.redirect("/client/transfers?deleted=1");
    } catch (error) {
        console.warn("Erreur suppression bénéficiaire :", error.message);
        return res.redirect("/client/transfers?error=" + encodeURIComponent("Impossible de supprimer ce bénéficiaire."));
    }
};

// 5. Exécuter un virement bancaire sécurisé (style développeur junior)
exports.postTransfer = async (req, res) => {
    try {
        // Étape 1 : Récupérer l'identifiant du client connecté
        var userId = 3;
        if (req.session && req.session.user && req.session.user.id) {
            userId = parseInt(req.session.user.id, 10);
        }

        // Étape 2 : Récupérer les données du formulaire
        var sourceAccountId = req.body.sourceAccountId;
        var beneficiaryId = req.body.beneficiaryId;
        var amount = req.body.amount;
        var motif = req.body.motif;

        // Étape 3 : Contrôler la présence des champs indispensables
        if (!sourceAccountId || !beneficiaryId || !amount) {
            var msgErreur = "Veuillez sélectionner un compte émetteur, un destinataire et renseigner un montant valide.";
            return res.redirect("/client/transfers?error=" + encodeURIComponent(msgErreur));
        }

        // Étape 4 : Exécuter le virement via le service métier (transaction atomique)
        var resultat = await clientService.executeTransfer(userId, {
            sourceAccountId: parseInt(sourceAccountId, 10),
            beneficiaryId: parseInt(beneficiaryId, 10),
            amount: amount,
            motif: motif
        });

        // Étape 5 : Rediriger avec les informations de confirmation
        var urlSucces = "/client/transfers?success=transfer_completed" +
            "&ref=" + encodeURIComponent(resultat.reference) +
            "&amount=" + encodeURIComponent(resultat.amount.toFixed(2)) +
            "&dest=" + encodeURIComponent(resultat.beneficiaryName);

        return res.redirect(urlSucces);
    } catch (error) {
        // Traçabilité de l'erreur et message clair pour l'utilisateur
        console.error("Erreur lors de l'exécution du virement :", error.message);
        return res.redirect("/client/transfers?error=" + encodeURIComponent(error.message));
    }
};

exports.getCards = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const [cards, accounts, advisor] = await Promise.all([
            clientService.getCards(userId),
            clientService.getUserAccounts(userId),
            clientService.getUserAdvisor(userId)
        ]);

        res.render("client/cards", {
            title: "Mes Cartes | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            cards,
            accounts,
            advisor,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/client/cards"
        });
    } catch (error) {
        console.error("Erreur récupération cartes :", error);
        res.status(500).send("Erreur lors du chargement des cartes bancaires.");
    }
};

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

exports.getDocuments = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const selectedAccountId = req.query.accountId ? parseInt(req.query.accountId, 10) : null;

        const [accounts, ribData, demandes, reclamations, advisor] = await Promise.all([
            clientService.getUserAccounts(userId),
            clientService.getAccountRibData(userId, selectedAccountId),
            clientService.getUserDemandes(userId),
            clientService.getUserReclamations(userId),
            clientService.getUserAdvisor(userId)
        ]);

        res.render("client/documents", {
            title: "RIB & Démarches | HosBank",
            user: req.session.user || { name: "Alexandre Moreau", avatar: "AM" },
            accounts,
            selectedAccountId: ribData.account.id,
            rib: ribData,
            demandes,
            reclamations,
            advisor,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/client/documents"
        });
    } catch (error) {
        console.error("Erreur page documents :", error);
        res.status(500).send("Erreur lors du chargement des documents et démarches.");
    }
};

exports.getPrintRib = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const selectedAccountId = req.query.accountId ? parseInt(req.query.accountId, 10) : null;
        const ribData = await clientService.getAccountRibData(userId, selectedAccountId);

        res.render("client/rib-print", {
            title: `RIB Officiel - ${ribData.account.number} | HosBank`,
            user: req.session.user || { name: "Alexandre Moreau" },
            rib: ribData,
            autoprint: req.query.autoprint === "1"
        });
    } catch (error) {
        console.error("Erreur impression RIB :", error);
        res.status(500).send("Erreur lors de la génération du RIB imprimable.");
    }
};

exports.postCreateSavingsDemand = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { initialDeposit, sourceAccountId, notes } = req.body;

        if (!sourceAccountId || !initialDeposit) {
            const errorMsg = "Veuillez sélectionner un compte source et renseigner un versement initial.";
            if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect("/client/documents?error=" + encodeURIComponent(errorMsg));
        }

        const demand = await clientService.createSavingsAccountDemand(userId, {
            initialDeposit,
            sourceAccountId: parseInt(sourceAccountId, 10),
            notes
        });

        const advisorMsg = demand.advisor 
            ? `Votre conseiller ${demand.advisor.name} a reçu votre requête et vous notifiera dès son activation.`
            : "Votre demande a été transmise avec succès au pôle gestion HosBank et sera instruite par un conseiller sous 24h ouvrées.";

        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json')) {
            return res.json({
                success: true,
                reference: demand.reference,
                advisor: demand.advisor,
                message: advisorMsg
            });
        }

        const redirectMsg = demand.advisor
            ? `Votre demande d'ouverture de livret d'épargne (${demand.reference}) a été transmise à votre conseiller ${demand.advisor.name}.`
            : `Votre demande d'ouverture de livret d'épargne (${demand.reference}) a été transmise aux équipes bancaires HosBank.`;

        res.redirect("/client/documents?success=" + encodeURIComponent(redirectMsg));
    } catch (error) {
        console.error("Erreur demande livret d'épargne :", error);
        if (req.xhr || req.headers.accept?.includes('application/json') || req.is('json')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.redirect("/client/documents?error=" + encodeURIComponent(error.message));
    }
};

exports.postCreateReclamation = async (req, res) => {
    try {
        const userId = req.session?.user?.id || 3;
        const { sujet, description, priorite } = req.body;

        if (!sujet || !description) {
            return res.redirect("/client/documents?error=" + encodeURIComponent("Le sujet et la description détaillée sont obligatoires."));
        }

        const rec = await clientService.createReclamation(userId, {
            sujet,
            description,
            priorite
        });

        res.redirect("/client/documents?success=" + encodeURIComponent(`Votre réclamation (${rec.reference}) a été enregistrée avec succès. Elle sera traitée sous 24h ouvrées.`));
    } catch (error) {
        console.error("Erreur dépôt réclamation :", error);
        res.redirect("/client/documents?error=" + encodeURIComponent(error.message));
    }
};

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

        const accounts = await clientService.getUserAccounts(userId);
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

exports.getProfile = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;

        const data = await clientService.getUserProfile(userId);

        res.render("client/profile", {
            title: "Mon Profil & Coordonnées | HosBank",
            user: req.session.user || { name: `${data.profile.prenom} ${data.profile.nom}`, avatar: data.profile.initials },
            profile: data.profile,
            stats: data.stats,
            advisor: data.advisor,
            success: req.query.success || null,
            error: req.query.error || null,
            currentPath: "/client/profile"
        });
    } catch (error) {
        console.error("Erreur consultation profil :", error);
        res.redirect("/client/dashboard?error=" + encodeURIComponent(error.message));
    }
};

exports.postUpdateCoordinates = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;
        const { telephone, adressePostale } = req.body;

        await clientService.updateUserCoordinates(userId, { telephone, adressePostale });

        if (req.session.user) {
            req.session.user.telephone = telephone ? telephone.trim() : "";
            req.session.user.adressePostale = adressePostale ? adressePostale.trim() : "";
        }

        res.redirect("/client/profile?success=" + encodeURIComponent("Vos coordonnées ont été mises à jour avec succès."));
    } catch (error) {
        console.error("Erreur mise à jour coordonnées :", error);
        res.redirect("/client/profile?error=" + encodeURIComponent(error.message));
    }
};


exports.postChangePassword = async (req, res) => {
    try {
        const rawId = req.session?.user?.id;
        const userId = (!isNaN(rawId) && parseInt(rawId, 10)) ? parseInt(rawId, 10) : 3;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        await clientService.updateUserPassword(userId, { currentPassword, newPassword, confirmPassword });

        res.redirect("/client/profile?success=" + encodeURIComponent("Votre mot de passe a été modifié avec succès."));
    } catch (error) {
        console.error("Erreur modification mot de passe :", error);
        res.redirect("/client/profile?error=" + encodeURIComponent(error.message));
    }
};


