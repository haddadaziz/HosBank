-- ==========================================================
-- HosBank - Schéma de Base de Données Relationnelle (PostgreSQL)
-- Architecture Bancaire N-tiers - Requêtes SQL Directes sans ORM
-- ==========================================================

-- Suppression propre si nécessaire
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS kyc_documents CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- 1. Table des Clients
CREATE TABLE clients (
    id VARCHAR(20) PRIMARY KEY,
    gender VARCHAR(10) NOT NULL DEFAULT 'M',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    city VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'Actif', -- 'Actif', 'Suspendu', 'En attente'
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'En cours', -- 'Vérifié', 'En cours', 'Non conforme'
    risk_level VARCHAR(20) NOT NULL DEFAULT 'Faible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des Comptes Bancaires
CREATE TABLE accounts (
    id VARCHAR(20) PRIMARY KEY,
    iban VARCHAR(40) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'Compte Courant',
    client_id VARCHAR(20) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(5) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'Actif', -- 'Actif', 'Bloqué', 'Clôturé'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des Cartes Bancaires
CREATE TABLE cards (
    id VARCHAR(20) PRIMARY KEY,
    account_id VARCHAR(20) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    card_number VARCHAR(25) NOT NULL,
    card_type VARCHAR(50) NOT NULL DEFAULT 'Visa Classic',
    expiration_date VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Bloquée', 'Expirée'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des Transactions et Virements
CREATE TABLE transactions (
    id VARCHAR(20) PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    sender_account_id VARCHAR(20) REFERENCES accounts(id) ON DELETE SET NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_iban VARCHAR(40) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_iban VARCHAR(40),
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'Virement SEPA',
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(5) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'Validé', -- 'Validé', 'En attente', 'Bloqué', 'Rejeté'
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des Pièces Justificatives KYC
CREATE TABLE kyc_documents (
    id VARCHAR(20) PRIMARY KEY,
    client_id VARCHAR(20) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    file_url VARCHAR(255) DEFAULT '/images/sample-doc.svg',
    status VARCHAR(20) NOT NULL DEFAULT 'En attente', -- 'En attente', 'Approuvé', 'Rejeté'
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table du Journal d'Audit
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    admin_user VARCHAR(150) NOT NULL,
    action TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'Info', -- 'Info', 'Avertissement', 'Alerte'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- JEU DE DONNÉES RÉELLES INITIALES (SEED)
-- ==========================================================

INSERT INTO clients (id, gender, first_name, last_name, email, phone, city, status, kyc_status, risk_level, created_at)
VALUES
('CLI-9821', 'M', 'Alexandre', 'Moreau', 'alexandre.moreau@email.fr', '+33 6 42 19 88 02', 'Paris', 'Actif', 'Vérifié', 'Faible', '2024-03-12 10:00:00'),
('CLI-9822', 'Mme', 'Sophia', 'Benali', 'sophia.benali@outlook.com', '+33 7 81 22 45 67', 'Lyon', 'Actif', 'Vérifié', 'Faible', '2024-05-18 14:30:00'),
('CLI-9823', 'M', 'Thomas', 'Lefebvre', 'thomas.lefebvre@techfirm.io', '+33 6 11 90 34 12', 'Bordeaux', 'En attente', 'En cours', 'Moyen', '2024-07-02 09:15:00'),
('CLI-9824', 'Mme', 'Camille', 'Rousseau', 'camille.rousseau@gmail.com', '+33 6 77 84 90 21', 'Nantes', 'Actif', 'Vérifié', 'Faible', '2024-08-11 11:45:00'),
('CLI-9825', 'M', 'Karim', 'El Amrani', 'k.elamrani@consulting.fr', '+33 7 54 33 21 09', 'Marseille', 'Suspendu', 'Non conforme', 'Élevé', '2024-09-01 16:20:00'),
('CLI-9826', 'Mme', 'Inès', 'Gauthier', 'ines.gauthier@designstudio.com', '+33 6 30 15 44 89', 'Lille', 'Actif', 'En cours', 'Faible', '2024-09-10 17:00:00');

INSERT INTO accounts (id, iban, account_type, client_id, balance, currency, status, created_at)
VALUES
('ACC-001', 'FR76 3000 4012 3456 7890 1234 567', 'Compte Courant', 'CLI-9821', 14850.75, 'EUR', 'Actif', '2024-03-12 10:10:00'),
('ACC-002', 'FR76 3000 4012 3456 7890 9876 543', 'Livret Épargne Hos+', 'CLI-9821', 10000.00, 'EUR', 'Actif', '2024-04-01 11:00:00'),
('ACC-003', 'FR76 3000 4012 9988 7766 5544 332', 'Compte Professionnel', 'CLI-9822', 62400.00, 'EUR', 'Actif', '2024-05-18 14:40:00'),
('ACC-004', 'FR76 3000 4012 1122 3344 5566 778', 'Compte Courant', 'CLI-9823', 4200.00, 'EUR', 'Actif', '2024-07-02 09:25:00'),
('ACC-005', 'FR76 3000 4012 5544 3322 1100 998', 'Compte Courant', 'CLI-9825', 1450.00, 'EUR', 'Bloqué', '2024-09-01 16:30:00');

INSERT INTO cards (id, account_id, card_number, card_type, expiration_date, status)
VALUES
('CARD-101', 'ACC-001', '•••• •••• •••• 4289', 'Visa Premier', '08/27', 'Active'),
('CARD-102', 'ACC-003', '•••• •••• •••• 8841', 'Mastercard Platinum', '11/26', 'Active'),
('CARD-103', 'ACC-004', '•••• •••• •••• 1192', 'Visa Classic', '04/26', 'Bloquée'),
('CARD-104', 'ACC-005', '•••• •••• •••• 7730', 'Mastercard Standard', '01/25', 'Bloquée');

INSERT INTO transactions (id, reference, sender_account_id, sender_name, sender_iban, recipient_name, recipient_iban, transaction_type, amount, currency, status, flagged, flag_reason, created_at)
VALUES
('TX-90412', 'VIR-SEPA-8849', 'ACC-001', 'Alexandre Moreau', 'FR76 ... 4567', 'Cabinet Dr. Vallet', 'FR76 3000 1234 5678 9012 3456 789', 'Virement SEPA', -120.00, 'EUR', 'Validé', FALSE, NULL, '2024-09-14 14:22:00'),
('TX-90413', 'VIR-INST-9021', 'ACC-003', 'Sophia Benali', 'FR76 ... 4332', 'Tech Partners SAS', 'FR76 3000 9988 7766 5544 3322 110', 'Virement Instantané', -15400.00, 'EUR', 'En attente', TRUE, 'Montant supérieur au seuil standard (10 000 €)', '2024-09-14 13:45:00'),
('TX-90414', 'DEP-SALAIRE-441', NULL, 'Acme Corp SAS', 'FR76 ... 0019', 'Camille Rousseau', 'FR76 ... 9021', 'Dépôt Salaire', 3250.00, 'EUR', 'Validé', FALSE, NULL, '2024-09-14 11:30:00'),
('TX-90415', 'RETRAIT-DAB-109', 'ACC-004', 'Thomas Lefebvre', 'FR76 ... 6778', 'DAB HosBank Paris République', 'FR76 ... DAB', 'Retrait Espèces', -250.00, 'EUR', 'Validé', FALSE, NULL, '2024-09-14 09:12:00'),
('TX-90416', 'VIR-INT-1192', 'ACC-005', 'Karim El Amrani', 'FR76 ... 0998', 'Global Crypto Ltd', 'GB82 4000 1122 3344 5566 77', 'Virement International', -8900.00, 'EUR', 'Bloqué', TRUE, 'Bénéficiaire sur liste de vigilance financière', '2024-09-13 18:04:00');

INSERT INTO kyc_documents (id, client_id, document_type, document_number, file_url, status, notes, submitted_at)
VALUES
('KYC-301', 'CLI-9823', 'Passeport', '21AB99812', '/images/sample-doc.svg', 'En attente', 'Nouveau client - Ouverture de compte courant', '2024-09-13 16:40:00'),
('KYC-302', 'CLI-9826', 'Carte Nationale d''Identité', 'CNI-88741029', '/images/sample-doc.svg', 'En attente', 'Justificatif de domicile validé, CNI en attente', '2024-09-14 10:15:00'),
('KYC-303', 'CLI-9825', 'Titre de séjour', 'TS-00994182', '/images/sample-doc.svg', 'Rejeté', 'Document expiré le 31/08/2024', '2024-09-11 11:20:00');

INSERT INTO audit_logs (admin_user, action, ip_address, severity, created_at)
VALUES
('Admin Principal (admin@hosbank.fr)', 'Connexion réussie', '192.168.1.45', 'Info', '2024-09-14 15:30:12'),
('Admin Principal (admin@hosbank.fr)', 'Blocage de la carte de Thomas Lefebvre (ACC-004)', '192.168.1.45', 'Avertissement', '2024-09-14 14:10:05'),
('Système de Sécurité Automatique', 'Interception de la transaction TX-90416 (8 900 €)', '10.0.0.1', 'Alerte', '2024-09-13 18:15:20');
