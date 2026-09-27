# Image de base Node.js LTS légère
FROM node:20-alpine

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie de l'ensemble du projet
COPY . .

# Port exposé pour l'application HosBank
EXPOSE 3000

# Commande de démarrage avec rechargement à chaud (--watch)
CMD ["npm", "run", "dev"]
