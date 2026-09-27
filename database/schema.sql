CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE role_utilisateur AS ENUM ('CLIENT', 'CHARGE_CLIENT', 'ADMINISTRATEUR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE type_compte AS ENUM ('COURANT', 'EPARGNE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_compte AS ENUM ('ACTIF', 'BLOQUE', 'CLOTURE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sens_operation AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE type_carte AS ENUM ('PHYSIQUE', 'VIRTUELLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_carte AS ENUM ('ACTIVE', 'OPPOSEE', 'BLOQUEE_TEMPORAIREMENT', 'EXPIREE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE type_demande AS ENUM ('OUVERTURE_EPARGNE', 'DEMANDE_RIB', 'CARTE_VIRTUELLE', 'OPPOSITION_CARTE', 'RECALCUL_PIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_demande AS ENUM ('EN_ATTENTE', 'EN_INSTRUCTION', 'APPROUVEE', 'REJETEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statut_reclamation AS ENUM ('OUVERTE', 'EN_COURS', 'RESOLUE', 'REJETEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priorite_reclamation AS ENUM ('FAIBLE', 'MOYENNE', 'HAUTE', 'URGENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    civilite VARCHAR(10),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    telephone VARCHAR(30),
    adresse_postale VARCHAR(255),
    role role_utilisateur NOT NULL DEFAULT 'CLIENT',
    email_verifie BOOLEAN DEFAULT FALSE,
    token_verification VARCHAR(255),
    expiration_token TIMESTAMP WITH TIME ZONE,
    tentatives_echec_login INTEGER DEFAULT 0,
    compte_verrouille BOOLEAN DEFAULT FALSE,
    conseiller_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comptes_bancaires (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    numero_compte VARCHAR(30) UNIQUE NOT NULL,
    iban VARCHAR(40) UNIQUE NOT NULL,
    bic VARCHAR(15) NOT NULL,
    devise VARCHAR(5) DEFAULT 'EUR',
    type_compte type_compte NOT NULL DEFAULT 'COURANT',
    solde DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    decouvert_autorise DECIMAL(15,2) DEFAULT 0.00,
    taux_interet DECIMAL(5,2) DEFAULT 0.00,
    statut statut_compte NOT NULL DEFAULT 'ACTIF',
    date_ouverture TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_cloture TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS cartes_bancaires (
    id SERIAL PRIMARY KEY,
    compte_id INTEGER NOT NULL REFERENCES comptes_bancaires(id) ON DELETE CASCADE,
    pan_masque VARCHAR(25) NOT NULL,
    pan_hash VARCHAR(255) NOT NULL,
    date_expiration DATE NOT NULL,
    code_pin_hash VARCHAR(255) NOT NULL,
    tentatives_pin_echec INTEGER DEFAULT 0,
    type_carte type_carte NOT NULL DEFAULT 'PHYSIQUE',
    statut statut_carte NOT NULL DEFAULT 'ACTIVE',
    plafond_paiement_mensuel DECIMAL(15,2) DEFAULT 3000.00,
    plafond_retrait_hebdo DECIMAL(15,2) DEFAULT 1000.00,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beneficiaires (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    intitule VARCHAR(100) NOT NULL,
    iban VARCHAR(40) NOT NULL,
    bic VARCHAR(15),
    date_ajout TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS virements (
    id SERIAL PRIMARY KEY,
    compte_emetteur_id INTEGER NOT NULL REFERENCES comptes_bancaires(id) ON DELETE CASCADE,
    beneficiaire_id INTEGER REFERENCES beneficiaires(id) ON DELETE SET NULL,
    reference_sepa VARCHAR(50) UNIQUE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    motif VARCHAR(255),
    statut VARCHAR(30) NOT NULL DEFAULT 'VALIDE',
    date_execution TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operations (
    id SERIAL PRIMARY KEY,
    compte_id INTEGER NOT NULL REFERENCES comptes_bancaires(id) ON DELETE CASCADE,
    reference_unique UUID NOT NULL DEFAULT gen_random_uuid(),
    sens sens_operation NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    solde_apres_operation DECIMAL(15,2) NOT NULL,
    motif_libelle VARCHAR(255) NOT NULL,
    categorie VARCHAR(50),
    date_valeur DATE DEFAULT CURRENT_DATE,
    date_operation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS demandes (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    reference VARCHAR(50) UNIQUE NOT NULL,
    type_demande type_demande NOT NULL,
    statut statut_demande NOT NULL DEFAULT 'EN_ATTENTE',
    payload_json TEXT,
    motif_rejet TEXT,
    reponse_conseiller TEXT,
    date_demande TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_traitement TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS reclamations (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    reference VARCHAR(50) UNIQUE NOT NULL,
    sujet VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priorite priorite_reclamation NOT NULL DEFAULT 'MOYENNE',
    statut statut_reclamation NOT NULL DEFAULT 'OUVERTE',
    reponse_conseiller TEXT,
    date_depot TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_cloture TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS journal_audit (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entite_cible VARCHAR(50),
    id_entite_cible INTEGER,
    ancienne_valeur TEXT,
    nouvelle_valeur TEXT,
    adresse_ip VARCHAR(45),
    date_action TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index d'optimisation des performances pour la consultation des soldes et comptes
CREATE INDEX IF NOT EXISTS idx_comptes_utilisateur ON comptes_bancaires(utilisateur_id, statut);
CREATE INDEX IF NOT EXISTS idx_cartes_compte ON cartes_bancaires(compte_id);
CREATE INDEX IF NOT EXISTS idx_operations_compte_date ON operations(compte_id, date_operation DESC);
CREATE INDEX IF NOT EXISTS idx_beneficiaires_utilisateur ON beneficiaires(utilisateur_id);

