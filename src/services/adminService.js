const clientRepo = require("../repositories/clientRepository");
const userRepo = require("../repositories/userRepository");
const accountRepo = require("../repositories/accountRepository");
const cardRepo = require("../repositories/cardRepository");
const bcrypt = require("bcrypt");
const requestRepo = require("../repositories/requestRepository");
const transactionRepo = require("../repositories/transactionRepository");
const kycRepo = require("../repositories/kycRepository");
const auditRepo = require("../repositories/auditRepository");
const db = require("../config/db");

class AdminDataService {
    constructor() {
        this.fallbackClients = [
            {
                id: "CLI-9821",
                gender: "M",
                firstName: "Alexandre",
                lastName: "Moreau",
                email: "alexandre.moreau@email.fr",
                phone: "+33 6 42 19 88 02",
                city: "Paris",
                joinedDate: "2024-03-12",
                status: "Actif",
                kycStatus: "Vérifié",
                accountsCount: 2,
                totalBalance: 24850.75,
                riskLevel: "Faible"
            },
            {
                id: "CLI-9822",
                gender: "Mme",
                firstName: "Sophia",
                lastName: "Benali",
                email: "sophia.benali@outlook.com",
                phone: "+33 7 81 22 45 67",
                city: "Lyon",
                joinedDate: "2024-05-18",
                status: "Actif",
                kycStatus: "Vérifié",
                accountsCount: 3,
                totalBalance: 87400.00,
                riskLevel: "Faible"
            },
            {
                id: "CLI-9823",
                gender: "M",
                firstName: "Thomas",
                lastName: "Lefebvre",
                email: "thomas.lefebvre@techfirm.io",
                phone: "+33 6 11 90 34 12",
                city: "Bordeaux",
                joinedDate: "2024-07-02",
                status: "En attente",
                kycStatus: "En cours",
                accountsCount: 1,
                totalBalance: 4200.00,
                riskLevel: "Moyen"
            }
        ];

        this.fallbackAccounts = [
            {
                id: "ACC-001",
                iban: "FR76 3000 4012 3456 7890 1234 567",
                type: "Compte Courant",
                clientId: "CLI-9821",
                clientName: "Alexandre Moreau",
                balance: 14850.75,
                currency: "EUR",
                status: "Actif",
                cardsCount: 1,
                cardType: "Visa Premier",
                cardStatus: "Active"
            },
            {
                id: "ACC-002",
                iban: "FR76 3000 4012 3456 7890 9876 543",
                type: "Livret Épargne Hos+",
                clientId: "CLI-9821",
                clientName: "Alexandre Moreau",
                balance: 10000.00,
                currency: "EUR",
                status: "Actif",
                cardsCount: 0,
                cardType: "-",
                cardStatus: "-"
            },
            {
                id: "ACC-003",
                iban: "FR76 3000 4012 9988 7766 5544 332",
                type: "Compte Professionnel",
                clientId: "CLI-9822",
                clientName: "Sophia Benali",
                balance: 62400.00,
                currency: "EUR",
                status: "Actif",
                cardsCount: 2,
                cardType: "Mastercard Platinum",
                cardStatus: "Active"
            }
        ];

        this.fallbackTransactions = [
            {
                id: "TX-90412",
                reference: "VIR-SEPA-8849",
                sender: "Alexandre Moreau",
                senderIban: "FR76 ... 4567",
                recipient: "Cabinet Dr. Vallet",
                type: "Virement SEPA",
                amount: -120.00,
                currency: "EUR",
                date: "2024-09-14 14:22",
                status: "Validé",
                flagged: false
            },
            {
                id: "TX-90413",
                reference: "VIR-INST-9021",
                sender: "Sophia Benali",
                senderIban: "FR76 ... 4332",
                recipient: "Tech Partners SAS",
                type: "Virement Instantané",
                amount: -15400.00,
                currency: "EUR",
                date: "2024-09-14 13:45",
                status: "En attente",
                flagged: true,
                flagReason: "Montant supérieur au seuil standard (10 000 €)"
            }
        ];

        this.fallbackKyc = [
            {
                id: "KYC-301",
                clientId: "CLI-9823",
                clientName: "Thomas Lefebvre",
                documentType: "Passeport",
                documentNumber: "21AB99812",
                submissionDate: "2024-09-13 16:40",
                status: "En attente",
                notes: "Nouveau client - Ouverture de compte courant"
            }
        ];

        this.fallbackLogs = [
            {
                id: 1,
                timestamp: "2024-09-14 15:30:12",
                adminUser: "Admin Principal (admin@hosbank.fr)",
                action: "Connexion réussie",
                ip: "192.168.1.45",
                severity: "Info"
            }
        ];
    }

    async getDashboardStats() {
        try {
            const metrics = await transactionRepo.getMetrics();
            const recentTransactions = await transactionRepo.findAll(5);
            const allKyc = await kycRepo.findAll();
            const pendingKyc = allKyc.filter(k => k.status === "En attente");
            const recentClients = await clientRepo.findAll();

            return {
                metrics,
                recentTransactions,
                pendingKyc: pendingKyc.slice(0, 4),
                recentClients: recentClients.slice(0, 4),
                isRealDb: true
            };
        } catch (err) {
            return {
                metrics: {
                    totalClients: this.fallbackClients.length,
                    activeAccounts: this.fallbackAccounts.length,
                    totalDeposits: 97250.75,
                    todayTransactionsVolume: 15520.00,
                    pendingKycCount: 1,
                    flaggedTransactionsCount: 1
                },
                recentTransactions: this.fallbackTransactions,
                pendingKyc: this.fallbackKyc,
                recentClients: this.fallbackClients,
                isRealDb: false,
                dbError: err.message
            };
        }
    }

    async getClients(query = "", role = "") {
        try {
            return await userRepo.findAll(query, role);
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async addClient(data) {
        const motDePasse = data.password || "Password123!";
        const motDePasseHash = await bcrypt.hash(motDePasse, 10);
        const user = await userRepo.createUser({
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            motDePasseHash,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        });

        if (user.role === "CLIENT") {
            try {
                await userRepo.createDefaultAccount(user.id);
            } catch (err) {
                console.warn(err.message);
            }
        }
        return user;
    }

    async updateClient(id, data) {
        return await userRepo.updateUser(id, {
            civilite: data.gender || "M.",
            nom: data.lastName,
            prenom: data.firstName,
            email: data.email,
            role: data.role || "CLIENT",
            telephone: data.phone || null,
            adressePostale: data.city || null
        });
    }

    async updateUserRole(id, role) {
        return await userRepo.updateRole(id, role);
    }

    async toggleClientStatus(id) {
        return await userRepo.toggleLock(id);
    }

    async getAccounts() {
        try {
            return await accountRepo.findAll();
        } catch (err) {
            return this.fallbackAccounts;
        }
    }

    async toggleCardStatus(accountId) {
        try {
            return await accountRepo.toggleCardStatus(accountId);
        } catch (err) {
            const a = this.fallbackAccounts.find(item => item.id === accountId);
            if (a && a.cardStatus !== "-") {
                a.cardStatus = a.cardStatus === "Active" ? "Bloquée" : "Active";
            }
            return a;
        }
    }

    async toggleAccountStatus(accountId) {
        try {
            return await accountRepo.toggleAccountStatus(accountId);
        } catch (err) {
            const a = this.fallbackAccounts.find(item => item.id === accountId);
            if (a) {
                a.status = a.status === "Actif" ? "Bloqué" : "Actif";
            }
            return a;
        }
    }

    async getCards() {
        try {
            return await cardRepo.findAll();
        } catch (err) {
            return [];
        }
    }

    async toggleCardBlock(cardId) {
        try {
            return await cardRepo.toggleStatus(cardId);
        } catch (err) {
            return null;
        }
    }

    async opposeCard(cardId) {
        try {
            return await cardRepo.opposeCard(cardId);
        } catch (err) {
            return null;
        }
    }

    async updateCardLimits(cardId, plafondPaiement, plafondRetrait) {
        try {
            return await cardRepo.updateLimits(cardId, plafondPaiement, plafondRetrait);
        } catch (err) {
            return null;
        }
    }


    async getTransactions() {
        try {
            return await transactionRepo.findAll(100);
        } catch (err) {
            return this.fallbackTransactions;
        }
    }

    async approveTransaction(id) {
        try {
            return await transactionRepo.updateStatus(id, "Validé");
        } catch (err) {
            const tx = this.fallbackTransactions.find(t => t.id === id);
            if (tx) {
                tx.status = "Validé";
                tx.flagged = false;
            }
            return tx;
        }
    }

    async rejectTransaction(id) {
        try {
            return await transactionRepo.updateStatus(id, "Rejeté");
        } catch (err) {
            const tx = this.fallbackTransactions.find(t => t.id === id);
            if (tx) {
                tx.status = "Rejeté";
                tx.flagged = false;
            }
            return tx;
        }
    }

    async getKycRequests() {
        try {
            return await kycRepo.findAll();
        } catch (err) {
            return this.fallbackKyc;
        }
    }

    async updateKycStatus(id, status) {
        try {
            return await kycRepo.updateStatus(id, status);
        } catch (err) {
            const k = this.fallbackKyc.find(item => item.id === id);
            if (k) k.status = status;
            return k;
        }
    }

    async getAuditLogs() {
        try {
            return await auditRepo.findAll(50);
        } catch (err) {
            return this.fallbackLogs;
        }
    }

    async logAction(adminUser, action, ip, severity) {
        try {
            return await auditRepo.log({ adminUser, action, ip, severity });
        } catch (err) {
            return null;
        }
    }

    async getDemandes() {
        try {
            return await requestRepo.findAllDemandes();
        } catch (err) {
            return [];
        }
    }

    async getReclamations() {
        try {
            return await requestRepo.findAllReclamations();
        } catch (err) {
            return [];
        }
    }

    async updateDemandeStatus(id, statut, reponse = null) {
        return await requestRepo.updateDemandeStatus(id, statut, reponse);
    }

    async updateReclamationStatus(id, statut, reponse = null) {
        return await requestRepo.updateReclamationStatus(id, statut, reponse);
    }
}

module.exports = new AdminDataService();
