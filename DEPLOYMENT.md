# AI-Powered Task Manager Deployment Guide

This document provides step-by-step instructions to configure and deploy the AI-Powered Task Manager web application locally and to production on **Render** with **MongoDB Atlas**.

---

## 🛠️ Prerequisites

You will need the following accounts and API credentials:
1. **Google Cloud Account**: To configure Google OAuth 2.0.
2. **MongoDB Atlas Account**: For a managed cloud database.
3. **Google AI Studio Account**: To obtain a Gemini API key.
4. **Render Account**: For cloud hosting.

---

## 🌐 Local Development Setup

1. **Extract/Clone Project**: Ensure all files are placed in your working directory.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   - Copy `.env.example` to a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and fill in the configuration options (see below for getting keys).
4. **Run the Application**:
   - Start the server:
     ```bash
     npm start
     ```
   - Open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 🔑 Key Configuration Steps

### 1. MongoDB Atlas Connection
- Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Create a free Shared Cluster.
- Under **Security → Network Access**, add IP address `0.0.0.0/0` (allows connections from Render instances).
- Under **Security → Database Access**, create a user with read/write privileges.
- Click **Connect** on your cluster, select **Drivers**, copy the connection string, replace `<password>` with your database user password, and set it as `MONGODB_URI` in `.env`.

### 2. Google OAuth 2.0 Credentials
- Log in to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project.
- Search for and select **OAuth consent screen**:
  - Choose **External** user type.
  - Complete the required application info (email, app name).
  - Add scopes: `.../auth/userinfo.profile` and `.../auth/userinfo.email`.
- Go to **Credentials → Create Credentials → OAuth client ID**:
  - Application Type: **Web application**.
  - **Authorized JavaScript origins**:
    - Local: `http://localhost:5000`
    - Production: `https://your-app-name.onrender.com`
  - **Authorized redirect URIs**:
    - Local: `http://localhost:5000/api/auth/google/callback`
    - Production: `https://your-app-name.onrender.com/api/auth/google/callback`
  - Click Save. Copy the generated **Client ID** and **Client Secret** into your `.env` variables.

### 3. Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/).
- Click **Get API Key**.
- Create a new key and copy it into the `GEMINI_API_KEY` slot in `.env`.

### 4. JWT Secret Keys
- Generate two cryptographically strong random strings (e.g., using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) and set them to `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` respectively.

---

## 🚀 Deploying to Render (Unified Service)

Render will serve both the backend APIs and host the static files:

1. **Commit Code to GitHub**:
   Initialize a Git repository, commit your code files (excluding `.env` and `node_modules` via `.gitignore`), and push it to GitHub.
2. **Create Render Web Service**:
   - Log in to [Render](https://render.com).
   - Click **New + → Web Service**.
   - Connect your GitHub repository.
3. **Configure Service Settings**:
   - **Name**: Choose a unique name (e.g., `my-ai-taskmanager`).
   - **Environment**: `Node`
   - **Region**: Select region closest to your users.
   - **Branch**: `main` (or default branch)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. **Configure Environment Variables**:
   - Click **Advanced → Add Environment Variable** and specify values:
     - `MONGODB_URI`: Your MongoDB Atlas connection string.
     - `PORT`: `5000` (Render binds this port automatically)
     - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
     - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
     - `GOOGLE_CALLBACK_URL`: `https://your-app-name.onrender.com/api/auth/google/callback` *(Ensure this matches your actual Render subdomain)*
     - `JWT_ACCESS_SECRET`: Your secret access key string.
     - `JWT_REFRESH_SECRET`: Your secret refresh key string.
     - `CLIENT_URL`: `https://your-app-name.onrender.com`
     - `GEMINI_API_KEY`: Your Gemini API key from AI Studio.
     - `NODE_ENV`: `production`
5. **Deploy**:
   - Click **Create Web Service**. Render will install packages, compile dependencies, spin up the server, and serve the application at your custom `onrender.com` URL.
