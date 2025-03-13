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

- **Upstash Redis**: Required for caching and fast data access. (optional -- you can now self host this using redis.)
- **Upstash Vector Database**: For vector-based search and storage. (optional)
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

Use the command below to generate a secure 32-byte encryption key, tokens and secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```dotenv
ROOT_URL="http://localhost:3000" # USED FOR CONFIGURATION PAGE
PORT=3000
JWT_SECRET="can-be-anything-you-want"
ENCRYPTION_KEY=""

GEMINI_API_KEY=""
TMDB_API_KEY=""
OMDB_API_KEY=""
RPDB_FREE_API_KEY=""
TRAKT_CLIENT_ID=
TRAKT_CLIENT_SECRET=
CAPTCHA_SITE_KEY=
CAPTCHA_SECRET_KEY=

UPSTASH_REDIS_REST_URL="" # LOCAL HOSTING: THIS IS: http://serverless-redis-http
UPSTASH_REDIS_REST_TOKEN="" # LOCAL HOSTING: THIS CAN BE ANYTHING.
```

---

Happy coding! 🎉
