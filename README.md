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

Your `.env` file should contain the following keys:

```dotenv
GEMINI_API_KEY=""
TMDB_API_KEY=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
UPSTASH_VECTOR_REST_URL=""
UPSTASH_VECTOR_REST_TOKEN=""
AI_MODEL="gemini-2.0-pro-exp-02-05" # This can be any google model that vercel supports
SEARCH_COUNT=20
PORT=3003
CLOUDFLARED_TOKEN=""
```

Don't forget to edit the `manifestBaseUrl` variable in `/static/configure.html`
to point to your local or deployed server URL. This is important because it
ensures that the application can correctly locate and load the manifest file for
proper configuration.

---

Happy coding! 🎉
