INSERT INTO utilisateurs (id, civilite, nom, prenom, email, mot_de_passe_hash, telephone, adresse_postale, role, email_verifie, conseiller_id)
VALUES
(1, 'M.', 'Admin', 'HosBank', 'admin@hosbank.fr', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5k5o1/mZ0fUvO2q6l3n.Z1jYnLrqy', '+33 1 00 00 00 00', '1 Place de la Banque, Paris', 'ADMINISTRATEUR', TRUE, NULL),
(2, 'M.', 'Haddad', 'Aziz', 'conseiller@hosbank.fr', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5k5o1/mZ0fUvO2q6l3n.Z1jYnLrqy', '+33 6 12 34 56 78', '12 Avenue des Finances, Paris', 'CHARGE_CLIENT', TRUE, NULL),
(3, 'M.', 'Moreau', 'Alexandre', 'alexandre.moreau@email.fr', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5k5o1/mZ0fUvO2q6l3n.Z1jYnLrqy', '+33 6 42 19 88 02', '14 Rue de la République, Paris', 'CLIENT', TRUE, 2),
(4, 'Mme', 'Benali', 'Sophia', 'sophia.benali@outlook.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5k5o1/mZ0fUvO2q6l3n.Z1jYnLrqy', '+33 7 81 22 45 67', '28 Cours Franklin Roosevelt, Lyon', 'CLIENT', TRUE, 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('utilisateurs_id_seq', (SELECT MAX(id) FROM utilisateurs));

INSERT INTO comptes_bancaires (id, utilisateur_id, numero_compte, iban, bic, devise, type_compte, solde, decouvert_autorise, taux_interet, statut)
VALUES
(1, 3, 'CPT-00109281', 'FR76 3000 4012 3456 7890 1234 567', 'HOSBFR2P', 'EUR', 'COURANT', 14850.75, 500.00, 0.00, 'ACTIF'),
(2, 3, 'CPT-00109282', 'FR76 3000 4012 3456 7890 9876 543', 'HOSBFR2P', 'EUR', 'EPARGNE', 10000.00, 0.00, 3.00, 'ACTIF'),
(3, 4, 'CPT-00201948', 'FR76 3000 4012 9988 7766 5544 332', 'HOSBFR2P', 'EUR', 'COURANT', 62400.00, 1500.00, 0.00, 'ACTIF')
ON CONFLICT (id) DO NOTHING;

SELECT setval('comptes_bancaires_id_seq', (SELECT MAX(id) FROM comptes_bancaires));

INSERT INTO cartes_bancaires (id, compte_id, pan_masque, pan_hash, date_expiration, code_pin_hash, type_carte, statut, plafond_paiement_mensuel, plafond_retrait_hebdo)
VALUES
(1, 1, '•••• •••• •••• 4289', 'hash_pan_4289', '2027-08-31', 'hash_pin_1234', 'PHYSIQUE', 'ACTIVE', 3000.00, 1000.00),
(2, 1, '•••• •••• •••• 8841', 'hash_pan_8841', '2026-11-30', 'hash_pin_5678', 'VIRTUELLE', 'ACTIVE', 1500.00, 500.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval('cartes_bancaires_id_seq', (SELECT MAX(id) FROM cartes_bancaires));

INSERT INTO beneficiaires (id, utilisateur_id, intitule, iban, bic)
VALUES
(1, 3, 'Cabinet Dr. Vallet', 'FR76 3000 1234 5678 9012 3456 789', 'BNPAFR2P')
ON CONFLICT (id) DO NOTHING;

SELECT setval('beneficiaires_id_seq', (SELECT MAX(id) FROM beneficiaires));

INSERT INTO virements (id, compte_emetteur_id, beneficiaire_id, reference_sepa, montant, motif, statut)
VALUES
(1, 1, 1, 'VIR-SEPA-2026-001', 120.00, 'Consultation médicale', 'VALIDE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('virements_id_seq', (SELECT MAX(id) FROM virements));

INSERT INTO operations (id, compte_id, reference_unique, sens, montant, solde_apres_operation, motif_libelle, categorie, date_valeur)
VALUES
(1, 1, 'b25e7912-3f82-491c-9b81-c71d6240001a', 'CREDIT', 3250.00, 14970.75, 'Virement Salaire Acme Corp', 'Revenus', CURRENT_DATE - 2),
(2, 1, 'c91f1822-482a-4df2-8921-d82e7350002b', 'DEBIT', 120.00, 14850.75, 'Virement Dr. Vallet', 'Santé', CURRENT_DATE - 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('operations_id_seq', (SELECT MAX(id) FROM operations));

INSERT INTO demandes (id, utilisateur_id, reference, type_demande, statut, payload_json, motif_rejet, reponse_conseiller)
VALUES
(1, 3, 'DEM-2026-001', 'CARTE_VIRTUELLE', 'EN_ATTENTE', '{"type": "E-Commerce", "plafond": 500}', NULL, NULL),
(2, 4, 'DEM-2026-002', 'OUVERTURE_EPARGNE', 'APPROUVEE', '{"depot_initial": 1000}', NULL, 'Livret d''épargne ouvert avec succès.')
ON CONFLICT (id) DO NOTHING;

SELECT setval('demandes_id_seq', (SELECT MAX(id) FROM demandes));

INSERT INTO reclamations (id, utilisateur_id, reference, sujet, description, priorite, statut, reponse_conseiller)
VALUES
(1, 3, 'REC-2026-001', 'Frais bancaires non reconnus', 'Prélèvement de 12 EUR sans justification apparente.', 'MOYENNE', 'OUVERTE', NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('reclamations_id_seq', (SELECT MAX(id) FROM reclamations));

INSERT INTO journal_audit (id, utilisateur_id, action, entite_cible, id_entite_cible, ancienne_valeur, nouvelle_valeur, adresse_ip)
VALUES
(1, 1, 'CONNEXION_ADMIN', 'Utilisateur', 1, NULL, 'Succès', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;

SELECT setval('journal_audit_id_seq', (SELECT MAX(id) FROM journal_audit));
