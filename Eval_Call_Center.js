// Importer le module ioredis
const Redis = require('ioredis');

// Créer une instance de Redis
const redis = new Redis();

async function main() {

    // Création des appels grâce à la fonction creerAppel()
    await creerAppel(1, "2024-09-30 14:10", "+33912345678", "Terminé", 200, "Jean Durand", "Appel urgent");
    await creerAppel(2, "2024-09-30 14:20", "+33987654322", "Terminé", 150, "Luc Martin", "Appel standard");
    await creerAppel(3, "2024-09-30 14:25", "+33912349876", "Terminé", 400, "Sophie Dupont", "Demande de suivi");
    await creerAppel(4, "2024-09-30 14:30", "+33912348765", "Non affecté", 0, "", "Problème technique");
    await creerAppel(5, "2024-09-30 14:35", "+33965432109", "Non pris en compte", 0, "", "Appel d'information");
    await creerAppel(6, "2024-09-30 14:40", "+33987651234", "Non affecté", 0, "", "Réclamation");
    await creerAppel(7, "2024-09-30 14:45", "+33912345432", "Non affecté", 0, "", "Appel non urgent");
    await creerAppel(8, "2024-09-30 14:50", "+33998765432", "Non affecté", 0, "", "Demande d'assistance");
    await creerAppel(9, "2024-09-30 14:55", "+33911223344", "Non pris en compte", 0, "", "Demande d'informations complémentaires");
    await creerAppel(10, "2024-09-30 15:00", "+33999887766", "Non affecté", 0, "", "Appel de confirmation");
    await creerAppel(11, "2024-09-30 15:05", "+33923456789", "Non affecté", 0, "", "Demande de suivi");
    await creerAppel(12, "2024-09-30 15:10", "+33934567890", "Non affecté", 0, "", "Problème de facturation");
    await creerAppel(13, "2024-09-30 15:15", "+33945678901", "Non affecté", 0, "", "Demande d'informations produit");
    await creerAppel(14, "2024-09-30 15:20", "+33956789012", "Non affecté", 0, "", "Réclamation de service");
    await creerAppel(15, "2024-09-30 15:25", "+33967890123", "Non affecté", 0, "", "Appel de confirmation");
    await creerAppel(16, "2024-09-30 15:30", "+33978901234", "Non affecté", 0, "", "Demande d'assistance technique");
    await creerAppel(17, "2024-09-30 15:35", "+33989012345", "Non affecté", 0, "", "Problème de connexion");
    await creerAppel(18, "2024-09-30 15:40", "+33990123456", "Non affecté", 0, "", "Demande de rappel");
    await creerAppel(19, "2024-09-30 15:45", "+33901234567", "Non affecté", 0, "", "Demande de remboursement");

    // Création des opérateurs grâce à la fonction creerOperateur()
    await creerOperateur(1, "Durand", "Jean");
    await creerOperateur(2, "Leroy", "Marie");
    await creerOperateur(3, "Martin", "Luc");
    await creerOperateur(4, "Dupont", "Sophie");
    await creerOperateur(5, "Garnier", "Pierre");

    // Affectation d'un appel à chaque opérateur
    await affecterAppels();

    // Affectation d'un appel à Jean Durand uniquement
    await affecterAppel("Jean Durand");

    // On met fin a un appel ce qui permet de mofdifer son statut de en cours a terminé, 
    await finAppel(4,200);
    await finAppel(13,200);

    // Affichage des appels en cours
    await afficherAppelsEnCours();

    // Affichage des appels non-affectés    
    await afficherAppelsNonAffectes()

    // Appeler la fonction dans le code principal
    await afficherAppelsEnCoursParOperateur();

    // Effacer les données de la DB
    // await redis.flushdb();

    console.log("Tous les appels et opérateurs ont été créés et les affectations sont faites.");
}



// Fonction pour créer un appel avec vérification d'unicité
async function creerAppel(id, heure, numero_origine, statut, duree, operateur, description) {
    // Vérification de l'existence de l'appel
    // Ce bloc permet d'éviter par exemple d'avoir plusieurs fois le même appel dans la liste d'appel en cours
    const appelExistant = await redis.hgetall(`call:${id}`);
    if (appelExistant && appelExistant.numero_origine === numero_origine) {
        console.log(`L'appel avec le numéro ${numero_origine} existe déjà.`);
        return; // Ne pas créer l'appel s'il existe déjà
    }
    // Incrémenter le compteur d'appels et créer l'appel
    await redis.multi()
        .incr("call:id")
        .hset(`call:${id}`, "id", id, "heure", heure, "numero_origine", numero_origine, "statut", statut, "duree", duree, "operateur", operateur, "description", description)
        .lpush(statut === "Terminé" ? "appels:termine" : statut === "Non affecté" ? "appels:non_affectes" : "appels:non_pris_en_compte", `call:${id}`)
        .exec();
}



// Fonction pour créer un opérateur
async function creerOperateur(id, nom, prenom) {
    // Incrémenter le compteur d'opérateurs et créer l'opérateur
    await redis.multi()
        .incr("operator:id")
        .hset(`operator:${id}`, "id", id, "nom", nom, "prenom", prenom)
        .exec();
}



// Fonction pour affecter un appel non-assigné à chaque opérateur, limité à 2 appels max par opérateur
async function affecterAppels() {
    const operatorNames = ["Jean Durand", "Marie Leroy", "Luc Martin", "Sophie Dupont", "Pierre Garnier"];
    for (let operator of operatorNames) {
        // Compter le nombre d'appels en cours pour cet opérateur
        const appelsOperateur = await redis.lrange(`appels:en_cours:${operator}`, 0, -1);
        if (appelsOperateur.length >= 2) {
            console.log(`L'opérateur ${operator} a déjà 2 appels en cours. Aucun nouvel appel ne peut être affecté.`);
            continue; // Passer à l'opérateur suivant si la limite est atteinte
        }
        // Récupérer un appel non affecté
        const affectations = await redis.multi()
            .rpop("appels:non_affectes")
            .exec();
        const callId = affectations[0][1]; // Récupérer l'ID de l'appel
        if (callId) {
            // Affecter l'appel à l'opérateur
            await redis.multi()
                .lpush("appels:en_cours", callId) // Ajouter l'appel à la liste globale des appels en cours
                .lpush(`appels:en_cours:${operator}`, callId) // Ajouter l'appel à la liste des appels de l'opérateur
                .hset(callId, "statut", "En Cours", "operateur", operator) // Mettre à jour le statut et l'opérateur
                .exec();
        }
    }
}



// Fonction pour affecter un appel non-assigné à un opérateur, limité à 2 appels max par opérateur
async function affecterAppel(operator) {
    // Compter le nombre d'appels en cours pour cet opérateur
    const appelsOperateur = await redis.lrange(`appels:en_cours:${operator}`, 0, -1);
    if (appelsOperateur.length >= 2) {
        console.log(`L'opérateur ${operator} a déjà 2 appels en cours. Aucun nouvel appel ne peut être affecté.`);
        return; // Sortir de la fonction si la limite est atteinte
    }
    // Récupérer un appel non affecté
    const affectations = await redis.multi()
        .rpop("appels:non_affectes")
        .exec();
    const callId = affectations[0][1]; // Récupérer l'ID de l'appel
    if (callId) {
        // Affecter l'appel à l'opérateur
        await redis.multi()
            .lpush("appels:en_cours", callId) // Ajouter l'appel à la liste globale des appels en cours
            .lpush(`appels:en_cours:${operator}`, callId) // Ajouter l'appel à la liste des appels de l'opérateur
            .hset(callId, "statut", "En Cours", "operateur", operator) // Mettre à jour le statut et l'opérateur
            .exec();
    }
}



// Fonction pour afficher les appels en cours
async function afficherAppelsEnCours() {
    const appelsEnCours = await redis.lrange("appels:en_cours", 0, -1); // Récupérer tous les appels en cours
    console.log("Appels en cours :");    
    for (let callId of appelsEnCours) {
        const callData = await redis.hgetall(callId); // Récupérer les détails de l'appel
        console.log(`ID: ${callData.id}, Heure: ${callData.heure}, Numéro: ${callData.numero_origine}, Statut: ${callData.statut}, Durée: ${callData.duree}, Opérateur: ${callData.operateur}, Description: ${callData.description}`);
    }
}



// Fonction pour afficher les appels non-affectés
async function afficherAppelsNonAffectes() {
    const appelsNonAffectes = await redis.lrange("appels:non_affectes", 0, -1); // Récupérer tous les appels non-affectés
    console.log("Appels non-affectés :");   
    for (let callId of appelsNonAffectes) {
        const callData = await redis.hgetall(callId); // Récupérer les détails de l'appel
        console.log(`ID: ${callData.id}, Heure: ${callData.heure}, Numéro: ${callData.numero_origine}, Statut: ${callData.statut}, Durée: ${callData.duree}, Opérateur: ${callData.operateur}, Description: ${callData.description}`);
    }
}



// Fonction pour afficher les appels en cours par opérateur
async function afficherAppelsEnCoursParOperateur() {
    const appelsEnCours = await redis.lrange("appels:en_cours", 0, -1); // Récupérer tous les appels en cours
    const operateursAppels = {}; // Objet pour stocker les appels par opérateur    
    // Parcourir chaque appel en cours
    for (let callId of appelsEnCours) {
        const callData = await redis.hgetall(callId); // Récupérer les détails de l'appel
        const operateur = callData.operateur;
        if (!operateursAppels[operateur]) {
            operateursAppels[operateur] = []; // Initialiser un tableau pour cet opérateur
        }
        // Ajouter l'appel à l'opérateur
        operateursAppels[operateur].push({
            id: callData.id,
            heure: callData.heure,
            numero: callData.numero_origine,
            statut: callData.statut,
            duree: callData.duree,
            description: callData.description
        });
    }
    // Afficher les appels par opérateur
    console.log("Appels en cours par opérateur :");
    for (let operateur in operateursAppels) {
        console.log(`Opérateur : ${operateur}`);
        operateursAppels[operateur].forEach(appel => {
            console.log(`ID: ${appel.id}, Heure: ${appel.heure}, Numéro: ${appel.numero}, Statut: ${appel.statut}, Durée: ${appel.duree}, Description: ${appel.description}`);
        });
    }
}



// Fonction pour terminer un appel en cours
async function finAppel(id, duree) {
    // Créer l'identifiant de l'appel à partir de l'ID passé
    const callId = `call:${id}`;
    // Récupérer les détails de l'appel
    const callData = await redis.hgetall(callId);
    if (!callData || callData.statut !== "En Cours") {
        console.log(`L'appel avec l'ID ${callId} n'est pas en cours ou n'existe pas.`);
        return; // Sortir si l'appel n'existe pas ou n'est pas en cours
    }    
    const operateur = callData.operateur; // Récupérer le nom de l'opérateur
    // Supprimer l'appel de la liste des appels en cours
    await redis.lrem("appels:en_cours", 0, callId);
    await redis.lrem(`appels:en_cours:${operateur}`, 0, callId); // Retirer aussi de la liste des appels de l'opérateur
    // Mettre à jour le statut de l'appel en "Terminé"
    await redis.hset(callId, "statut", "Terminé", "duree", duree);
    // Ajouter l'appel à la liste des appels terminés
    await redis.lpush("appels:termine", callId);
    // Décrementer le nombre d'appels en cours pour cet opérateur
    const appelsOperateur = await redis.lrange(`appels:en_cours:${operateur}`, 0, -1);
    console.log(`L'appel avec l'ID ${callId} a été terminé.`);
}



// Exécution de la fonction principale
main()
    .then(() => redis.quit()) // Fermer la connexion Redis après l'exécution
    .catch(err => {
        console.error("Erreur :", err);
        redis.quit();
    });
