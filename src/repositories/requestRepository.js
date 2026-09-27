const db = require("../config/db");

// =========================================================================
// REPOSITORY : DEMANDES ET RÉCLAMATIONS (CODE DÉVELOPPEUR JUNIOR)
// =========================================================================
const requestRepository = {

    // 1. Récupérer toutes les demandes bancaires (RIB, Épargne, Cartes, etc.)
    async findAllDemandes(filters = {}) {
        const { category, status, searchQuery } = filters;

        // Requête SQL simple avec jointure sur le client et son conseiller
        let query = `
            SELECT 
                d.id,
                d.reference,
                d.type_demande,
                d.statut,
                d.payload_json,
                d.motif_rejet,
                d.reponse_conseiller,
                TO_CHAR(d.date_demande, 'DD/MM/YYYY HH24:MI') AS date_demande_fr,
                TO_CHAR(d.date_traitement, 'DD/MM/YYYY HH24:MI') AS date_traitement_fr,
                (u.prenom || ' ' || u.nom) AS client_nom,
                u.email AS client_email,
                u.id AS client_id,
                (cons.prenom || ' ' || cons.nom) AS conseiller_nom
            FROM demandes d
            JOIN utilisateurs u ON d.utilisateur_id = u.id
            LEFT JOIN utilisateurs cons ON u.conseiller_id = cons.id
            WHERE 1=1
        `;

        const values = [];

        // Filtre par catégorie de demande (RIB, Épargne, Carte, Opposition, PIN)
        const typesValides = ['OUVERTURE_EPARGNE', 'DEMANDE_RIB', 'CARTE_VIRTUELLE', 'OPPOSITION_CARTE', 'RECALCUL_PIN'];
        if (category && category !== 'ALL' && typesValides.includes(category)) {
            values.push(category);
            query += ` AND d.type_demande::text = $${values.length}`;
        }

        // Filtre par statut (EN_ATTENTE, EN_INSTRUCTION, APPROUVEE, REJETEE)
        const statutsValides = ['EN_ATTENTE', 'EN_INSTRUCTION', 'APPROUVEE', 'REJETEE'];
        if (status && status !== 'ALL' && statutsValides.includes(status)) {
            values.push(status);
            query += ` AND d.statut::text = $${values.length}`;
        }

        // Filtre par recherche textuelle (nom, email ou référence)
        if (searchQuery && searchQuery.trim() !== '') {
            values.push(`%${searchQuery.trim()}%`);
            query += ` AND (
                (u.prenom || ' ' || u.nom) ILIKE $${values.length} OR
                u.email ILIKE $${values.length} OR
                d.reference ILIKE $${values.length}
            )`;
        }

        query += ` ORDER BY d.date_demande DESC`;

        const result = await db.query(query, values);

        // Transformation simple en JavaScript pour rendre les libellés faciles à afficher
        const demandes = [];
        for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows[i];

            // Libellé en français du type de demande
            let typeTexte = row.type_demande;
            if (row.type_demande === 'DEMANDE_RIB') typeTexte = 'Demande de RIB';
            if (row.type_demande === 'OUVERTURE_EPARGNE') typeTexte = "Compte d'Épargne";
            if (row.type_demande === 'CARTE_VIRTUELLE') typeTexte = 'Carte Virtuelle';
            if (row.type_demande === 'OPPOSITION_CARTE') typeTexte = 'Opposition Carte';
            if (row.type_demande === 'RECALCUL_PIN') typeTexte = 'Recalcul Code PIN';

            // Libellé en français du statut
            let statutTexte = row.statut;
            if (row.statut === 'EN_ATTENTE') statutTexte = 'En attente';
            if (row.statut === 'EN_INSTRUCTION') statutTexte = 'En cours';
            if (row.statut === 'APPROUVEE') statutTexte = 'Approuvée';
            if (row.statut === 'REJETEE') statutTexte = 'Rejetée';

            demandes.push({
                id: row.id,
                reference: row.reference,
                rawType: row.type_demande,
                typeLibelle: typeTexte,
                rawStatus: row.statut,
                statutLibelle: statutTexte,
                payload: row.payload_json,
                motifRejet: row.motif_rejet,
                reponseConseiller: row.reponse_conseiller,
                dateDemande: row.date_demande_fr,
                dateTraitement: row.date_traitement_fr,
                clientName: row.client_nom,
                clientEmail: row.client_email,
                clientId: 'CLI-' + row.client_id,
                advisorName: row.conseiller_nom || 'Non assigné'
            });
        }

        return demandes;
    },

    // 2. Récupérer toutes les réclamations avec conseiller en charge et statut
    async findAllReclamations(filters = {}) {
        const { category, status, searchQuery } = filters;

        // Requête SQL simple
        let query = `
            SELECT 
                r.id,
                r.reference,
                r.sujet,
                r.description,
                r.priorite,
                r.statut,
                r.reponse_conseiller,
                TO_CHAR(r.date_depot, 'DD/MM/YYYY HH24:MI') AS date_depot_fr,
                TO_CHAR(r.date_cloture, 'DD/MM/YYYY HH24:MI') AS date_cloture_fr,
                (u.prenom || ' ' || u.nom) AS client_nom,
                u.email AS client_email,
                u.id AS client_id,
                (cons.prenom || ' ' || cons.nom) AS conseiller_nom,
                cons.email AS conseiller_email
            FROM reclamations r
            JOIN utilisateurs u ON r.utilisateur_id = u.id
            LEFT JOIN utilisateurs cons ON u.conseiller_id = cons.id
            WHERE 1=1
        `;

        const values = [];

        // Filtre par priorité (URGENTE, HAUTE, MOYENNE, FAIBLE)
        const prioritesValides = ['URGENTE', 'HAUTE', 'MOYENNE', 'FAIBLE'];
        if (category && category !== 'ALL' && prioritesValides.includes(category)) {
            values.push(category);
            query += ` AND r.priorite::text = $${values.length}`;
        }

        // Filtre par statut (OUVERTE, EN_COURS, RESOLUE, REJETEE)
        const statutsValides = ['OUVERTE', 'EN_COURS', 'RESOLUE', 'REJETEE'];
        if (status && status !== 'ALL' && statutsValides.includes(status)) {
            values.push(status);
            query += ` AND r.statut::text = $${values.length}`;
        }

        // Filtre de recherche textuelle
        if (searchQuery && searchQuery.trim() !== '') {
            values.push(`%${searchQuery.trim()}%`);
            query += ` AND (
                (u.prenom || ' ' || u.nom) ILIKE $${values.length} OR
                r.sujet ILIKE $${values.length} OR
                r.reference ILIKE $${values.length}
            )`;
        }

        query += ` ORDER BY r.date_depot DESC`;

        const result = await db.query(query, values);

        // Transformation simple en JavaScript
        const reclamations = [];
        for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows[i];

            // Libellé de priorité
            let prioriteTexte = 'Faible';
            if (row.priorite === 'URGENTE') prioriteTexte = 'Urgente';
            if (row.priorite === 'HAUTE') prioriteTexte = 'Haute';
            if (row.priorite === 'MOYENNE') prioriteTexte = 'Moyenne';

            // Libellé de statut
            let statutTexte = row.statut;
            if (row.statut === 'OUVERTE') statutTexte = 'Ouverte';
            if (row.statut === 'EN_COURS') statutTexte = 'En cours';
            if (row.statut === 'RESOLUE') statutTexte = 'Résolue';
            if (row.statut === 'REJETEE') statutTexte = 'Rejetée';

            reclamations.push({
                id: row.id,
                reference: row.reference,
                sujet: row.sujet,
                description: row.description,
                rawPriority: row.priorite,
                prioriteLibelle: prioriteTexte,
                rawStatus: row.statut,
                statutLibelle: statutTexte,
                reponseConseiller: row.reponse_conseiller,
                dateDepot: row.date_depot_fr,
                dateCloture: row.date_cloture_fr,
                clientName: row.client_nom,
                clientEmail: row.client_email,
                clientId: 'CLI-' + row.client_id,
                advisorName: row.conseiller_nom || 'Non assigné',
                advisorEmail: row.conseiller_email
            });
        }

        return reclamations;
    },

    // 3. Calculer les statistiques globales et blocages (> 24h)
    async getGlobalMetrics() {
        // Récupérer toutes les demandes et réclamations pour compter facilement
        const resDemandes = await db.query(`SELECT type_demande, statut, date_demande FROM demandes`);
        const resReclamations = await db.query(`SELECT statut, date_depot FROM reclamations`);

        const allDemandes = resDemandes.rows;
        const allReclamations = resReclamations.rows;

        const maintenant = new Date();
        const limite24h = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

        // Compteurs pour les demandes
        let demandesTraitees = 0;
        let demandesEnAttente = 0;
        let demandesBlocages = 0;
        let countRib = 0;
        let countEpargne = 0;
        let countCartes = 0;
        let countOppositions = 0;
        let countPin = 0;

        for (let i = 0; i < allDemandes.length; i++) {
            const d = allDemandes[i];

            // Compter par type de démarche
            if (d.type_demande === 'DEMANDE_RIB') countRib++;
            if (d.type_demande === 'OUVERTURE_EPARGNE') countEpargne++;
            if (d.type_demande === 'CARTE_VIRTUELLE') countCartes++;
            if (d.type_demande === 'OPPOSITION_CARTE') countOppositions++;
            if (d.type_demande === 'RECALCUL_PIN') countPin++;

            // Compter par état
            if (d.statut === 'APPROUVEE' || d.statut === 'REJETEE') {
                demandesTraitees++;
            } else {
                demandesEnAttente++;

                // Vérifier si la demande dépasse 24h (blocage de service)
                const ageMs = maintenant - new Date(d.date_demande);
                if (ageMs > limite24h) {
                    demandesBlocages++;
                }
            }
        }

        // Compteurs pour les réclamations
        let reclamationsResolues = 0;
        let reclamationsEnCours = 0;
        let reclamationsBlocages = 0;

        for (let i = 0; i < allReclamations.length; i++) {
            const r = allReclamations[i];

            if (r.statut === 'RESOLUE' || r.statut === 'REJETEE') {
                reclamationsResolues++;
            } else {
                reclamationsEnCours++;

                // Vérifier si la réclamation dépasse 24h
                const ageMs = maintenant - new Date(r.date_depot);
                if (ageMs > limite24h) {
                    reclamationsBlocages++;
                }
            }
        }

        // Calcul du taux global de traitement
        const totalDossiers = allDemandes.length + allReclamations.length;
        const totalTraites = demandesTraitees + reclamationsResolues;
        let tauxTraitement = 100;
        if (totalDossiers > 0) {
            tauxTraitement = Math.round((totalTraites / totalDossiers) * 100);
        }

        return {
            totalDemandes: allDemandes.length,
            demandesTraitees: demandesTraitees,
            demandesEnAttente: demandesEnAttente,
            demandesBlocages: demandesBlocages,
            demandesRib: countRib,
            demandesEpargne: countEpargne,
            demandesCartes: countCartes,
            demandesOppositions: countOppositions,
            demandesPin: countPin,
            totalReclamations: allReclamations.length,
            reclamationsResolues: reclamationsResolues,
            reclamationsEnCours: reclamationsEnCours,
            reclamationsBlocages: reclamationsBlocages,
            tauxTraitementGlobal: tauxTraitement,
            totalBlocages: demandesBlocages + reclamationsBlocages
        };
    }
};

module.exports = requestRepository;

