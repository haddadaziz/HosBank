let advisorData = {
    advisor: {
        id: "ADV-104",
        name: "Karim Bennani",
        role: "Chargé de Clientèle Particuliers & Pro",
        agency: "Agence Casablanca Finance City",
        email: "k.bennani@hosbank.ma",
        phone: "+212 5 22 40 88 00",
        avatar: "KB",
        status: "online"
    },
    metrics: {
        assignedClients: 38,
        pendingDemands: 6,
        cardOppositions: 2,
        openClaims: 3
    },
    clients: [
        {
            id: "CLI-1001",
            civilite: "M.",
            name: "Mehdi Alami",
            email: "mehdi.alami@gmail.com",
            phone: "+212 6 61 24 55 89",
            cin: "BE849201",
            city: "Casablanca",
            joinedDate: "12/01/2024",
            status: "Actif",
            accounts: [
                { type: "Compte Chèque Principal", rib: "007 780 00012345678901 45", balance: 48520.50, currency: "MAD" },
                { type: "Compte Sur Carnet (Épargne)", rib: "007 780 00012345678902 78", balance: 120000.00, currency: "MAD" }
            ],
            cards: [
                { type: "HosBank Black Mastercard", number: "•••• 4829", status: "Active", expires: "08/28" }
            ]
        },
        {
            id: "CLI-1002",
            civilite: "Mme",
            name: "Sofia Tazi",
            email: "s.tazi@outlook.com",
            phone: "+212 6 72 90 14 33",
            cin: "A712903",
            city: "Rabat",
            joinedDate: "05/03/2024",
            status: "Actif",
            accounts: [
                { type: "Compte Chèque Principal", rib: "007 810 00045612378901 12", balance: 15400.00, currency: "MAD" }
            ],
            cards: [
                { type: "HosBank Gold Visa", number: "•••• 9104", status: "Active", expires: "11/27" }
            ]
        },
        {
            id: "CLI-1003",
            civilite: "M.",
            name: "Youssef Bennani",
            email: "youssef.bennani@techcorp.ma",
            phone: "+212 6 63 45 11 02",
            cin: "BK449012",
            city: "Casablanca",
            joinedDate: "18/06/2024",
            status: "Actif",
            accounts: [
                { type: "Compte Chèque Principal", rib: "007 780 00098765432101 90", balance: 84300.75, currency: "MAD" },
                { type: "Compte Épargne Sérénité", rib: "007 780 00098765432102 23", balance: 250000.00, currency: "MAD" }
            ],
            cards: [
                { type: "HosBank Black Mastercard", number: "•••• 3301", status: "Active", expires: "04/29" },
                { type: "Carte Virtuelle E-Shopping", number: "•••• 7712", status: "Active", expires: "12/26" }
            ]
        },
        {
            id: "CLI-1004",
            civilite: "Mme",
            name: "Imane Chraibi",
            email: "imane.chraibi@avocat.ma",
            phone: "+212 6 54 88 92 10",
            cin: "C902188",
            city: "Marrakech",
            joinedDate: "22/07/2024",
            status: "Actif",
            accounts: [
                { type: "Compte Chèque Professionnel", rib: "007 820 00065412398701 55", balance: 96750.00, currency: "MAD" }
            ],
            cards: [
                { type: "HosBank Visa Platinum", number: "•••• 5188", status: "Opposition demandée", expires: "09/27" }
            ]
        },
        {
            id: "CLI-1005",
            civilite: "M.",
            name: "Amine El Fassi",
            email: "amine.elfassi@gmail.com",
            phone: "+212 6 60 11 77 44",
            cin: "D663219",
            city: "Tanger",
            joinedDate: "02/09/2024",
            status: "En attente RIB",
            accounts: [
                { type: "Compte Chèque Principal", rib: "007 790 00078945612301 34", balance: 6200.00, currency: "MAD" }
            ],
            cards: []
        }
    ],
    demands: [
        {
            id: "DEM-401",
            type: "Opposition Carte",
            clientName: "Imane Chraibi",
            clientId: "CLI-1004",
            date: "15/09/2026 à 09:20",
            details: "Opposition demandée sur Carte Visa Platinum (•••• 5188). Motif : Vol de sacoche avec portefeuille.",
            status: "En attente",
            priority: "URGENT",
            comment: ""
        },
        {
            id: "DEM-402",
            type: "Recalcul PIN",
            clientName: "Mehdi Alami",
            clientId: "CLI-1001",
            date: "14/09/2026 à 16:45",
            details: "Demande de réinitialisation et envoi sécurisé du code confidentiel pour Mastercard (•••• 4829).",
            status: "En attente",
            priority: "Normale",
            comment: ""
        },
        {
            id: "DEM-403",
            type: "Carte Virtuelle",
            clientName: "Sofia Tazi",
            clientId: "CLI-1002",
            date: "14/09/2026 à 14:10",
            details: "Création d'une nouvelle carte virtuelle pour paiements sécurisés internationaux (Plafond demandé : 5 000 MAD).",
            status: "En attente",
            priority: "Normale",
            comment: ""
        },
        {
            id: "DEM-404",
            type: "Compte d'Épargne",
            clientName: "Sofia Tazi",
            clientId: "CLI-1002",
            date: "13/09/2026 à 11:30",
            details: "Demande d'ouverture d'un Compte sur Carnet rémunéré avec versement initial de 10 000 MAD.",
            status: "En attente",
            priority: "Normale",
            comment: ""
        },
        {
            id: "DEM-405",
            type: "Demande de RIB",
            clientName: "Amine El Fassi",
            clientId: "CLI-1005",
            date: "13/09/2026 à 09:15",
            details: "Demande d'attestation de RIB certifiée avec cachet agence pour domiciliation de salaire employeur.",
            status: "En attente",
            priority: "Normale",
            comment: ""
        },
        {
            id: "DEM-406",
            type: "Opposition Carte",
            clientName: "Youssef Bennani",
            clientId: "CLI-1003",
            date: "12/09/2026 à 18:00",
            details: "Suspicion d'opération frauduleuse en ligne sur carte virtuelle (•••• 7712).",
            status: "Validée",
            priority: "URGENT",
            comment: "Carte bloquée immédiatement et rejet préventif des paiements suspects."
        }
    ],
    claims: [
        {
            id: "REC-201",
            clientName: "Mehdi Alami",
            clientId: "CLI-1001",
            object: "Débit non reconnu de 450 MAD au DAB Guéliz",
            category: "Contestation d'opération",
            date: "14/09/2026 à 17:30",
            priority: "Haute",
            status: "Ouverte",
            description: "Le DAB n'a pas délivré les billets mais mon compte a été débité de 450 MAD le 13/09 à 19h.",
            response: ""
        },
        {
            id: "REC-202",
            clientName: "Imane Chraibi",
            clientId: "CLI-1004",
            object: "Délai de traitement virement interbancaire",
            category: "Virement",
            date: "13/09/2026 à 10:15",
            priority: "Moyenne",
            status: "En cours",
            description: "Un virement émis vendredi vers un compte Attijariwafa n'est toujours pas crédité chez le bénéficiaire.",
            response: "Recherche en cours auprès du service télécompensation interbancaire."
        },
        {
            id: "REC-203",
            clientName: "Amine El Fassi",
            clientId: "CLI-1005",
            object: "Problème d'accès à l'application mobile",
            category: "Accès & Authentification",
            date: "11/09/2026 à 14:00",
            priority: "Basse",
            status: "Clôturée",
            description: "Message d'erreur lors de la double authentification par e-mail.",
            response: "Identifiant réinitialisé et nouveau lien d'activation sécurisé transmis au client."
        }
    ],
    interactions: [
        {
            date: "15/09/2026 09:45",
            type: "Action Système",
            client: "Imane Chraibi",
            summary: "Notification d'urgence reçue : Demande d'opposition de carte suite à vol."
        },
        {
            date: "14/09/2026 17:35",
            type: "Réclamation",
            client: "Mehdi Alami",
            summary: "Dépôt d'une réclamation n° REC-201 pour débit DAB erroné."
        },
        {
            date: "13/09/2026 11:40",
            type: "Validation",
            client: "Youssef Bennani",
            summary: "Opposition validée avec succès sur la carte virtuelle •••• 7712."
        },
        {
            date: "12/09/2026 15:20",
            type: "Échange",
            client: "Sofia Tazi",
            summary: "Appel téléphonique : conseil sur les conditions de rémunération du compte sur carnet."
        },
        {
            date: "11/09/2026 14:15",
            type: "Résolution",
            client: "Amine El Fassi",
            summary: "Clôture de la réclamation REC-203 et confirmation du rétablissement de l'accès bancaire."
        }
    ]
};

exports.getDashboard = (req, res) => {
    const pendingDemands = advisorData.demands.filter(d => d.status === "En attente").length;
    const cardOppositions = advisorData.demands.filter(d => d.type === "Opposition Carte" && d.status === "En attente").length;
    const openClaims = advisorData.claims.filter(c => c.status !== "Clôturée").length;
    
    advisorData.metrics.pendingDemands = pendingDemands;
    advisorData.metrics.cardOppositions = cardOppositions;
    advisorData.metrics.openClaims = openClaims;

    res.render("advisor/dashboard", {
        title: "Tableau de Bord Conseiller | HosBank",
        advisor: advisorData.advisor,
        metrics: advisorData.metrics,
        clients: advisorData.clients,
        demands: advisorData.demands,
        claims: advisorData.claims,
        interactions: advisorData.interactions
    });
};

exports.postUpdateDemand = (req, res) => {
    const { demandId, newStatus, advisorComment } = req.body;
    
    const demand = advisorData.demands.find(d => d.id === demandId);
    if (demand) {
        demand.status = newStatus;
        demand.comment = advisorComment || "";
        
        advisorData.interactions.unshift({
            date: new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            type: "Traitement Demande",
            client: demand.clientName,
            summary: `Demande ${demand.type} (${demand.id}) passée au statut : ${newStatus}. Note : ${advisorComment || 'Aucun commentaire'}`
        });
    }
    
    res.redirect("/advisor/dashboard");
};

exports.postResolveClaim = (req, res) => {
    const { claimId, newStatus, responseText } = req.body;
    
    const claim = advisorData.claims.find(c => c.id === claimId);
    if (claim) {
        claim.status = newStatus;
        claim.response = responseText || "";
        
        advisorData.interactions.unshift({
            date: new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            type: "Réponse Réclamation",
            client: claim.clientName,
            summary: `Réclamation (${claim.id}) mise à jour : ${newStatus}. Réponse transmise au client.`
        });
    }
    
    res.redirect("/advisor/dashboard");
};
