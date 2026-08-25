# Qui Paie ? 💳💸

**🌐 En ligne ici : [https://qui-paie1.vercel.app/](https://qui-paie1.vercel.app/)**

Une application web simple pour décider aléatoirement qui doit payer l'addition, développée avec **React** et **Vite**.

## 🚀 Fonctionnalités

- Interface utilisateur réactive et moderne (React + Vite)
- Animations festives (canvas-confetti)
- Icônes avec Lucide React
- Déploiement facilité via Vercel ou Docker

## 🛠️ Prérequis

- [Node.js](https://nodejs.org/) (version 18+ recommandée)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (optionnel, pour le déploiement conteneurisé)

## 📦 Installation et lancement local

1. Installez les dépendances :
   ```bash
   npm install
   ```

2. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

3. Ouvrez votre navigateur sur l'adresse indiquée (généralement `http://localhost:5173`).

## 🐳 Déploiement avec Docker

Le projet inclut une configuration Docker (Dockerfile & docker-compose.yml) basée sur Nginx pour servir l'application statique.

1. Construisez et lancez le conteneur :
   ```bash
   docker-compose up --build -d
   ```

2. L'application sera accessible sur le port défini (ex: `http://localhost:8080`).

## ☁️ Déploiement sur Vercel

Le projet contient déjà un fichier `vercel.json`. Il vous suffit d'importer ce dépôt sur votre tableau de bord [Vercel](https://vercel.com/) pour un déploiement continu automatisé.

## 📜 Scripts disponibles

- `npm run dev` : Lance le serveur de développement avec rechargement à chaud (HMR).
- `npm run build` : Compile l'application pour la production dans le dossier `dist`.
- `npm run preview` : Prévisualise l'application compilée localement.
