# 🚀 AISearch README

Welcome to the AI Stremio Search development environment! This guide will help
you run the project in DEV mode, explain what DEV_MODE does, and walk you
through the local setup requirements.

---

## 📖 Table of Contents

- [Run DEV](#run-dev)
- [What Does DEV_MODE Do?](#what-does-dev_mode-do)
- [Local Setup Requirements](#local-setup-requirements)
- [Using Docker Compose](#using-docker-compose)
- [Environment Variables](#environment-variables)

---

## 🔧 Run DEV

To start the project in DEV mode, execute the following commands in your
terminal:

```shell
export DEV_MODE=true
deno task dev
```

> **Note:** `DEV_MODE` is automatically set when the project is opened in a
> devcontainer.

---

## 🛠 What Does DEV_MODE Do?

`DEV_MODE` enables several development-specific features, such as:

- **Debug Logging:** Provides detailed `console.log` outputs for easier
  troubleshooting.
- **Local Environment File Usage:** Loads variables from your `.env` file for
  local development.
- **Enhanced Developer Experience:** Better error messages and real-time
  feedback.

---

## 📋 Local Setup Requirements

To run the project locally, you need the following services and API keys:

- **Upstash Redis**: Required for caching and fast data access.
- **Upstash Vector Database**: For vector-based search and storage.
- **TMDB API Key**: Get yours from [TMDB](https://www.themoviedb.org/).
- **AI Studio API Key**: Obtain your API key from AI Studio.
- **Trakt Client ID and Secret**: Obtain client ID and Secret from trakt.tv

Ensure you fill in your `.env` file with the required keys.

---

## 🐳 Using Docker Compose

To start all necessary services for local deployment, run:

```shell
docker-compose up -d
```

This command will start all services in detached mode.

---

## 🌱 Environment Variables

**Redis can no longer be disabled.**

Your `.env` file should contain the following keys:

### Generate Encryption Key

Use the command below to generate a secure 32-byte encryption key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```dotenv
ROOT_URL="http://localhost:3003" # USED FOR CONFIGURATION PAGE
ENCRYPTION_KEY=""
GEMINI_API_KEY=""
TMDB_API_KEY=""
OMDB_API_KEY=""
RPDB_FREE_API_KEY=""
TRAKT_CLIENT_ID=
TRAKT_CLIENT_SECRET=
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
UPSTASH_VECTOR_REST_URL=""
UPSTASH_VECTOR_REST_TOKEN=""

## EVERYTHING BELOW THIS LINE IS OPTIONAL.
GOOGLE_MODEL="gemini-2.0-pro-exp-02-05"
OPENAI_MODEL="o4-mini"
SEARCH_COUNT=20
PORT=3003
CLOUDFLARED_TOKEN=""
DEV_MODE=false 
SEMANTIC_PROXIMITY=0.95 # Defaults to 0.95 max value of 1.00
RESET_VECTOR_CRON="0 0 1 * *"
```

---

Happy coding! 🎉
