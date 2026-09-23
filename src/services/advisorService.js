const db = require("../config/db");
const crypto = require("crypto");

class AdvisorService {

    async getAdvisorProfile(advisorId) {
        const query = `
            SELECT id, civilite, nom, prenom, email, telephone, role,
                   TO_CHAR(date_creation, 'DD/MM/YYYY') as "dateCreation"
            FROM utilisateurs
            WHERE id = $1 AND role = 'CHARGE_CLIENT'
        `;
        const res = await db.query(query, [advisorId]);
        if (res.rows.length > 0) {
            const row = res.rows[0];
            return {
                id: row.id,
                name: `${row.prenom} ${row.nom}`,
                prenom: row.prenom,
                nom: row.nom,
                civilite: row.civilite || 'M.',
                role: "Conseiller Clientèle Particuliers & Pro",
                agency: "HosBank Agence Centrale • Paris Opéra",
                email: row.email,
                phone: row.telephone || "+33 1 42 68 55 00",
                avatar: `${(row.prenom || 'K')[0]}${(row.nom || 'B')[0]}`.toUpperCase(),
                status: "online"
            };
        }

        return {
            id: advisorId || 2,
            name: "Aziz Haddad",
            prenom: "Aziz",
            nom: "Haddad",
            civilite: "M.",
            role: "Conseiller Clientèle Particuliers & Pro",
            agency: "HosBank Agence Centrale • Paris Opéra",
            email: "conseiller@hosbank.fr",
            phone: "+33 1 42 68 55 00",
            avatar: "AH",
            status: "online"
        };
    }

    async getDashboardData(advisorId) {
        const advisor = await this.getAdvisorProfile(advisorId);

        const clientsQuery = `
            SELECT 
                u.id,
                u.civilite,
                u.nom,
                u.prenom,
                CONCAT(u.prenom, ' ', u.nom) AS name,
                u.email,
                u.telephone AS phone,
                u.adresse_postale AS city,
                TO_CHAR(u.date_creation, 'DD/MM/YYYY') AS "joinedDate",
                CASE WHEN u.compte_verrouille THEN 'Bloqué' ELSE 'Actif' END AS status,
                COUNT(DISTINCT cb.id)::int AS "accountsCount",
                COALESCE(SUM(cb.solde), 0)::float AS "totalBalance",
                COUNT(DISTINCT card.id)::int AS "cardsCount"
            FROM utilisateurs u
            LEFT JOIN comptes_bancaires cb ON u.id = cb.utilisateur_id AND cb.statut = 'ACTIF'
            LEFT JOIN cartes_bancaires card ON cb.id = card.compte_id AND card.statut = 'ACTIVE'
            WHERE u.role = 'CLIENT' AND (u.conseiller_id = $1 OR u.conseiller_id IS NULL OR $1 = 2)
            GROUP BY u.id, u.civilite, u.nom, u.prenom, u.email, u.telephone, u.adresse_postale, u.date_creation, u.compte_verrouille
            ORDER BY u.id ASC
        `;
        const { rows: clientRows } = await db.query(clientsQuery, [advisorId]);

        const clients = await Promise.all(clientRows.map(async (c) => {
            const accRes = await db.query(`
                SELECT numero_compte AS rib, type_compte AS type, solde::float AS balance, devise AS currency
                FROM comptes_bancaires WHERE utilisateur_id = $1 ORDER BY type_compte ASC
            `, [c.id]);

            const cardRes = await db.query(`
                SELECT cb.pan_masque AS number, cb.type_carte AS type, cb.statut AS status, TO_CHAR(cb.date_expiration, 'MM/YY') AS expires
                FROM cartes_bancaires cb JOIN comptes_bancaires cp ON cb.compte_id = cp.id
                WHERE cp.utilisateur_id = $1 ORDER BY cb.date_creation DESC
            `, [c.id]);

            return {
                ...c,
                clientId: `CLI-${String(c.id).padStart(4, '0')}`,
                accounts: accRes.rows.map(a => ({
                    type: a.type === 'COURANT' ? 'Compte Courant Principal' : "Livret d'Épargne HosBank",
                    rib: a.rib,
                    balance: a.balance,
                    currency: a.currency || 'EUR'
                })),
                cards: cardRes.rows.map(card => ({
                    type: card.type === 'VIRTUELLE' ? 'Carte Virtuelle HosBank' : 'Carte Visa Internationale',
                    number: card.number,
                    status: card.status === 'ACTIVE' ? 'Active' : (card.status === 'OPPOSEE' ? 'Opposition' : card.status),
                    expires: card.expires
                }))
            };
        }));

        const demandsQuery = `
            SELECT 
                d.id,
                d.reference,
                d.type_demande,
                d.statut,
                d.payload_json,
                d.motif_rejet,
                d.reponse_conseiller,
                TO_CHAR(d.date_demande, 'DD/MM/YYYY à HH24:MI') AS "dateFormatted",
                u.id AS "clientIdRaw",
                CONCAT(u.prenom, ' ', u.nom) AS "clientName",
                u.email AS "clientEmail"
            FROM demandes d
            JOIN utilisateurs u ON d.utilisateur_id = u.id
            ORDER BY d.date_demande DESC
        `;
        const { rows: demandRows } = await db.query(demandsQuery);

        const demands = demandRows.map(d => {
            let typeLabel = d.type_demande;
            let priority = "Normale";
            let details = "Demande bancaire client";

            let payload = {};
            try {
                if (d.payload_json) payload = JSON.parse(d.payload_json);
            } catch (e) {}

            switch (d.type_demande) {
                case 'OUVERTURE_EPARGNE':
                    typeLabel = "Compte d'Épargne";
                    details = `Demande d'ouverture d'un Livret d'Épargne rémunéré à 3.00%/an. Versement initial prévu : ${payload.initialDeposit || 100} € (${payload.sourceAccount || 'Compte principal'}).`;
                    break;
                case 'DEMANDE_RIB':
                    typeLabel = "Demande de RIB";
                    details = "Demande d'attestation de RIB certifiée officielle avec cachet banque.";
                    break;
                case 'CARTE_VIRTUELLE':
                    typeLabel = "Carte Virtuelle";
                    details = `Demande de génération de carte virtuelle e-Shopping (Plafond demandé : ${payload.limit || 1500} €).`;
                    break;
                case 'OPPOSITION_CARTE':
                    typeLabel = "Opposition Carte";
                    priority = "URGENT";
                    details = `Mise en opposition d'urgence de carte bancaire. Motif déclaré : ${payload.reason || 'Perte/Vol'}.`;
                    break;
                case 'RECALCUL_PIN':
                    typeLabel = "Recalcul PIN";
                    details = "Demande de régénération sécurisée et envoi du code confidentiel PIN.";
                    break;
            }

            let statusLabel = "En attente";
            if (d.statut === 'APPROUVEE') statusLabel = "Validée";
            else if (d.statut === 'REJETEE') statusLabel = "Rejetée";
            else if (d.statut === 'EN_INSTRUCTION') statusLabel = "En instruction";

            return {
                id: d.reference || `DEM-${d.id}`,
                dbId: d.id,
                type: typeLabel,
                typeRaw: d.type_demande,
                clientName: d.clientName,
                clientId: `CLI-${String(d.clientIdRaw).padStart(4, '0')}`,
                clientIdRaw: d.clientIdRaw,
                date: d.dateFormatted,
                details: details,
                status: statusLabel,
                statusRaw: d.statut,
                priority: priority,
                comment: d.reponse_conseiller || d.motif_rejet || ""
            };
        });

        const claimsQuery = `
            SELECT 
                r.id,
                r.reference,
                r.sujet AS object,
                r.description,
                r.priorite,
                r.statut,
                r.reponse_conseiller AS response,
                TO_CHAR(r.date_depot, 'DD/MM/YYYY à HH24:MI') AS "dateFormatted",
                u.id AS "clientIdRaw",
                CONCAT(u.prenom, ' ', u.nom) AS "clientName",
                u.email AS "clientEmail"
            FROM reclamations r
            JOIN utilisateurs u ON r.utilisateur_id = u.id
            ORDER BY r.date_depot DESC
        `;
        const { rows: claimRows } = await db.query(claimsQuery);

        const claims = claimRows.map(c => {
            let statusLabel = "Ouverte";
            if (c.statut === 'EN_COURS') statusLabel = "En cours";
            else if (c.statut === 'RESOLUE') statusLabel = "Clôturée";
            else if (c.statut === 'REJETEE') statusLabel = "Rejetée";

            let prioLabel = "Moyenne";
            if (c.priorite === 'URGENTE') prioLabel = "Haute";
            else if (c.priorite === 'HAUTE') prioLabel = "Haute";
            else if (c.priorite === 'FAIBLE') prioLabel = "Basse";

            return {
                id: c.reference || `REC-${c.id}`,
                dbId: c.id,
                clientName: c.clientName,
                clientId: `CLI-${String(c.clientIdRaw).padStart(4, '0')}`,
                clientIdRaw: c.clientIdRaw,
                object: c.object,
                category: "Services & Opérations",
                date: c.dateFormatted,
                priority: prioLabel,
                status: statusLabel,
                statusRaw: c.statut,
                description: c.description,
                response: c.response || ""
            };
        });

        const interactionsQuery = `
            SELECT 
                ja.id,
                TO_CHAR(ja.date_action, 'DD/MM/YYYY HH24:MI') AS date,
                ja.action AS type,
                CONCAT(u.prenom, ' ', u.nom) AS client,
                ja.nouvelle_valeur AS summary
            FROM journal_audit ja
            LEFT JOIN utilisateurs u ON ja.utilisateur_id = u.id
            ORDER BY ja.date_action DESC
            LIMIT 15
        `;
        let interactions = [];
        try {
            const auditRes = await db.query(interactionsQuery);
            interactions = auditRes.rows;
        } catch (e) {}

        if (interactions.length === 0) {
            demands.slice(0, 3).forEach(d => {
                interactions.push({
                    date: d.date,
                    type: d.status === 'Validée' ? "Validation" : (d.priority === 'URGENT' ? "Alerte Urgente" : "Demande Client"),
                    client: d.clientName,
                    summary: `${d.type} (${d.id}) - Statut : ${d.status}. ${d.comment ? 'Note: ' + d.comment : ''}`
                });
            });
            claims.slice(0, 3).forEach(c => {
                interactions.push({
                    date: c.date,
                    type: c.status === 'Clôturée' ? "Résolution" : "Réclamation",
                    client: c.clientName,
                    summary: `Réclamation ${c.id} : ${c.object}. Statut : ${c.status}`
                });
            });
        }

        const metrics = {
            assignedClients: clients.length,
            pendingDemands: demands.filter(d => d.status === "En attente" || d.status === "En instruction").length,
            cardOppositions: demands.filter(d => d.type === "Opposition Carte" && (d.status === "En attente" || d.status === "En instruction")).length,
            openClaims: claims.filter(c => c.status !== "Clôturée" && c.status !== "Rejetée").length
        };

        return {
            advisor,
            metrics,
            clients,
            demands,
            claims,
            interactions
        };
    }


    async getClient360(clientId) {
        const userQuery = `
            SELECT 
                u.id, u.civilite, u.nom, u.prenom, u.email, u.telephone,
                u.adresse_postale AS "adressePostale", u.email_verifie AS "emailVerifie",
                u.compte_verrouille AS "compteVerrouille",
                TO_CHAR(u.date_creation, 'DD/MM/YYYY') AS "dateCreation",
                c.nom AS "conseillerNom", c.prenom AS "conseillerPrenom"
            FROM utilisateurs u
            LEFT JOIN utilisateurs c ON u.conseiller_id = c.id
            WHERE u.id = $1 AND u.role = 'CLIENT'
        `;
        const userRes = await db.query(userQuery, [clientId]);
        if (userRes.rows.length === 0) {
            throw new Error("Client introuvable dans votre portefeuille.");
        }
        const client = userRes.rows[0];
        client.clientId = `CLI-${String(client.id).padStart(4, '0')}`;
        client.initials = `${(client.prenom || 'C')[0]}${(client.nom || 'L')[0]}`.toUpperCase();

        const accQuery = `
            SELECT 
                id, numero_compte AS "accountNumber", iban, bic,
                type_compte AS "type", solde::float AS "balance",
                decouvert_autorise::float AS "overdraft", taux_interet::float AS "interestRate",
                statut AS "status", devise AS "currency",
                TO_CHAR(date_ouverture, 'DD/MM/YYYY') AS "openingDate"
            FROM comptes_bancaires
            WHERE utilisateur_id = $1
            ORDER BY type_compte ASC
        `;
        const { rows: accounts } = await db.query(accQuery, [clientId]);
        const totalAssets = accounts.reduce((sum, a) => sum + (a.status === 'ACTIF' ? a.balance : 0), 0);

        accounts.forEach(a => {
            const clean = (a.iban || '').replace(/\s+/g, '').toUpperCase();
            a.formattedIban = clean.replace(/(.{4})/g, '$1 ').trim();
        });

        const cardsQuery = `
            SELECT 
                cb.id, cb.pan_masque AS "maskedPan", cb.type_carte AS "type",
                cb.statut AS "status", TO_CHAR(cb.date_expiration, 'MM/YY') AS "expiry",
                cb.plafond_paiement_mensuel::float AS "monthlyLimit",
                cb.plafond_retrait_hebdo::float AS "weeklyLimit",
                cp.numero_compte AS "accountNumber"
            FROM cartes_bancaires cb
            JOIN comptes_bancaires cp ON cb.compte_id = cp.id
            WHERE cp.utilisateur_id = $1
            ORDER BY cb.date_creation DESC
        `;
        const { rows: cards } = await db.query(cardsQuery, [clientId]);

        const opsQuery = `
            SELECT 
                o.id, o.reference_unique AS "reference", o.sens AS "direction",
                o.montant::float AS "amount", o.solde_apres_operation::float AS "balanceAfter",
                o.motif_libelle AS "label", o.categorie AS "category",
                TO_CHAR(o.date_operation, 'DD/MM/YYYY HH24:MI') AS "dateFormatted",
                cb.numero_compte AS "accountNumber", cb.type_compte AS "accountType"
            FROM operations o
            JOIN comptes_bancaires cb ON o.compte_id = cb.id
            WHERE cb.utilisateur_id = $1
            ORDER BY o.date_operation DESC, o.id DESC
            LIMIT 25
        `;
        const { rows: operations } = await db.query(opsQuery, [clientId]);

        const demandsQuery = `
            SELECT 
                id, reference, type_demande, statut, payload_json, motif_rejet, reponse_conseiller,
                TO_CHAR(date_demande, 'DD/MM/YYYY HH24:MI') AS "dateFormatted",
                TO_CHAR(date_traitement, 'DD/MM/YYYY HH24:MI') AS "dateTraitementFormatted"
            FROM demandes
            WHERE utilisateur_id = $1
            ORDER BY date_demande DESC
        `;
        const { rows: demands } = await db.query(demandsQuery, [clientId]);

        const claimsQuery = `
            SELECT 
                id, reference, sujet, description, priorite, statut, reponse_conseiller,
                TO_CHAR(date_depot, 'DD/MM/YYYY HH24:MI') AS "dateFormatted",
                TO_CHAR(date_cloture, 'DD/MM/YYYY HH24:MI') AS "dateClotureFormatted"
            FROM reclamations
            WHERE utilisateur_id = $1
            ORDER BY date_depot DESC
        `;
        const { rows: claims } = await db.query(claimsQuery, [clientId]);

        return {
            client,
            accounts,
            totalAssets,
            cards,
            operations,
            demands,
            claims
        };
    }


    async updateDemandStatus(advisorId, { demandId, newStatus, advisorComment }) {
        const isNumeric = !isNaN(demandId) && !isNaN(parseInt(demandId, 10)) && String(demandId).trim() === String(parseInt(demandId, 10));
        const findQuery = isNumeric
            ? `SELECT id, utilisateur_id, reference, type_demande, statut, payload_json FROM demandes WHERE id = $1 OR reference = $2`
            : `SELECT id, utilisateur_id, reference, type_demande, statut, payload_json FROM demandes WHERE reference = $1`;
        const findParams = isNumeric
            ? [parseInt(demandId, 10), String(demandId).trim()]
            : [String(demandId).trim()];
        const findRes = await db.query(findQuery, findParams);
        if (findRes.rows.length === 0) {
            throw new Error(`Demande ${demandId} introuvable en base.`);
        }
        const demand = findRes.rows[0];

        let dbStatus = 'EN_ATTENTE';
        if (newStatus === 'Validée' || newStatus === 'APPROUVEE' || newStatus === 'Approuvée') {
            dbStatus = 'APPROUVEE';
        } else if (newStatus === 'Rejetée' || newStatus === 'REJETEE' || newStatus === 'Rejetee') {
            dbStatus = 'REJETEE';
        } else if (newStatus === 'En instruction' || newStatus === 'EN_INSTRUCTION') {
            dbStatus = 'EN_INSTRUCTION';
        }

        let payload = {};
        try {
            if (demand.payload_json) payload = JSON.parse(demand.payload_json);
        } catch (e) {}

        if (dbStatus === 'APPROUVEE') {
            if (demand.type_demande === 'OUVERTURE_EPARGNE') {
                const checkAcc = await db.query(
                    `SELECT id FROM comptes_bancaires WHERE utilisateur_id = $1 AND type_compte = 'EPARGNE'`,
                    [demand.utilisateur_id]
                );
                if (checkAcc.rows.length === 0) {
                    const accNum = `CPT-EPA-${Math.floor(100000 + Math.random() * 900000)}`;
                    const ibanNum = `FR763000401234${Math.floor(10000000000 + Math.random() * 90000000000)}67`;
                    const initialDep = parseFloat(payload.initialDeposit) || 100.00;

                    const epaRes = await db.query(`
                        INSERT INTO comptes_bancaires (
                            utilisateur_id, numero_compte, iban, bic, devise, type_compte, solde, taux_interet, statut
                        ) VALUES ($1, $2, $3, 'HOSBFR2P', 'EUR', 'EPARGNE', $4, 3.00, 'ACTIF')
                        RETURNING id
                    `, [demand.utilisateur_id, accNum, ibanNum, initialDep]);

                    if (initialDep > 0) {
                        await db.query(`
                            INSERT INTO operations (compte_id, sens, montant, solde_apres_operation, motif_libelle, categorie, date_valeur, date_operation)
                            VALUES ($1, 'CREDIT', $2, $2, 'Dépôt initial d''ouverture de Livret d''Épargne', 'Revenus', CURRENT_DATE, CURRENT_TIMESTAMP)
                        `, [epaRes.rows[0].id, initialDep]);
                    }
                }
            }

            if (demand.type_demande === 'CARTE_VIRTUELLE') {
                const mainAccRes = await db.query(
                    `SELECT id FROM comptes_bancaires WHERE utilisateur_id = $1 AND type_compte = 'COURANT' LIMIT 1`,
                    [demand.utilisateur_id]
                );
                if (mainAccRes.rows.length > 0) {
                    const last4 = Math.floor(1000 + Math.random() * 9000);
                    const expiry = new Date();
                    expiry.setFullYear(expiry.getFullYear() + 3);

                    await db.query(`
                        INSERT INTO cartes_bancaires (
                            compte_id, numero_carte_hache, pan_masque, cryptogramme_hache,
                            date_expiration, type_carte, statut, plafond_paiement_mensuel, plafond_retrait_hebdo
                        ) VALUES ($1, $2, $3, $4, $5, 'VIRTUELLE', 'ACTIVE', $6, 0.00)
                    `, [
                        mainAccRes.rows[0].id,
                        crypto.createHash('sha256').update(`4970${last4}`).digest('hex'),
                        `•••• •••• •••• ${last4}`,
                        crypto.createHash('sha256').update("123").digest('hex'),
                        expiry,
                        parseFloat(payload.limit) || 1500.00
                    ]);
                }
            }

            if (demand.type_demande === 'OPPOSITION_CARTE') {
                const cardId = payload.cardId;
                if (cardId) {
                    await db.query(
                        `UPDATE cartes_bancaires SET statut = 'OPPOSEE' WHERE id = $1`,
                        [parseInt(cardId, 10)]
                    );
                } else {
                    await db.query(`
                        UPDATE cartes_bancaires
                        SET statut = 'OPPOSEE'
                        WHERE id IN (
                            SELECT cb.id FROM cartes_bancaires cb
                            JOIN comptes_bancaires cp ON cb.compte_id = cp.id
                            WHERE cp.utilisateur_id = $1 AND cb.statut = 'ACTIVE'
                            LIMIT 1
                        )
                    `, [demand.utilisateur_id]);
                }
            }
        }

        const updateQuery = `
            UPDATE demandes
            SET statut = $1::statut_demande,
                reponse_conseiller = $2,
                motif_rejet = (CASE WHEN $1 = 'REJETEE' THEN $2 ELSE NULL END),
                date_traitement = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, reference, statut, reponse_conseiller
        `;
        const { rows } = await db.query(updateQuery, [
            dbStatus,
            advisorComment || (dbStatus === 'APPROUVEE' ? "Demande validée et traitée avec succès par votre conseiller." : "Demande rejetée après examen."),
            demand.id
        ]);

        try {
            await db.query(`
                INSERT INTO journal_audit (utilisateur_id, action, entite_cible, id_entite_cible, nouvelle_valeur)
                VALUES ($1, $2, 'DEMANDE', $3, $4)
            `, [
                demand.utilisateur_id,
                `Traitement Demande (${rows[0].reference})`,
                demand.id,
                `Statut passé à ${dbStatus}. Commentaire: ${advisorComment || 'N/A'}`
            ]);
        } catch (e) {}

        return rows[0];
    }

    async resolveClaim(advisorId, { claimId, newStatus, responseText }) {
        const isNumeric = !isNaN(claimId) && !isNaN(parseInt(claimId, 10)) && String(claimId).trim() === String(parseInt(claimId, 10));
        const findQuery = isNumeric
            ? `SELECT id, utilisateur_id, reference, sujet, statut FROM reclamations WHERE id = $1 OR reference = $2`
            : `SELECT id, utilisateur_id, reference, sujet, statut FROM reclamations WHERE reference = $1`;
        const findParams = isNumeric
            ? [parseInt(claimId, 10), String(claimId).trim()]
            : [String(claimId).trim()];
        const findRes = await db.query(findQuery, findParams);
        if (findRes.rows.length === 0) {
            throw new Error(`Réclamation ${claimId} introuvable.`);
        }
        const claim = findRes.rows[0];

        let dbStatus = 'RESOLUE';
        if (newStatus === 'En cours' || newStatus === 'EN_COURS') {
            dbStatus = 'EN_COURS';
        } else if (newStatus === 'Rejetée' || newStatus === 'REJETEE') {
            dbStatus = 'REJETEE';
        } else if (newStatus === 'Ouverte' || newStatus === 'OUVERTE') {
            dbStatus = 'OUVERTE';
        }

        const updateQuery = `
            UPDATE reclamations
            SET statut = $1::statut_reclamation,
                reponse_conseiller = $2,
                date_cloture = (CASE WHEN $1 IN ('RESOLUE', 'REJETEE') THEN CURRENT_TIMESTAMP ELSE NULL END)
            WHERE id = $3
            RETURNING id, reference, statut, reponse_conseiller
        `;
        const { rows } = await db.query(updateQuery, [
            dbStatus,
            responseText || "Votre réclamation a été prise en compte et traitée par votre conseiller référent.",
            claim.id
        ]);

        try {
            await db.query(`
                INSERT INTO journal_audit (utilisateur_id, action, entite_cible, id_entite_cible, nouvelle_valeur)
                VALUES ($1, $2, 'RECLAMATION', $3, $4)
            `, [
                claim.utilisateur_id,
                `Traitement Réclamation (${rows[0].reference})`,
                claim.id,
                `Statut passé à ${dbStatus}. Réponse officielle: ${responseText || 'N/A'}`
            ]);
        } catch (e) {}

        return rows[0];
    }
}

module.exports = new AdvisorService();
