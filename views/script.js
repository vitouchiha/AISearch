"use strict";

const manifestBaseUrl = "{{ROOT_URL}}";
const enableCaptcha = {{ENABLE_CAPTCHA}};

// Cache DOM elements
const elements = {
  googleKeyInput: document.getElementById("googleKey"),
  openaiKeyInput: document.getElementById("openaiKey"),
  claudeKeyInput: document.getElementById("claudeKey"),
  deepseekKeyInput: document.getElementById("deepseekKey"),

  featherlessKeyInput: document.getElementById("featherlessKey"),
  featherlessModelSelect: document.getElementById("featherlessModel"),
  customModelContainer: document.getElementById('customModelContainer'),
  featherlessCustomModel: document.getElementById('featherlessCustomModel'),

  tmdbKeyInput: document.getElementById("tmdbKey"),
  rpdbKeyInput: document.getElementById("rpdbKey"),
  defaultGoogleKeyCheckbox: document.getElementById("defaultGoogleKey"),
  defaultTmdbKeyCheckbox: document.getElementById("defaultTmdbKey"),
  installButton: document.getElementById("install-button"),
  updateKeysButton: document.getElementById("update-keys-button"),
  urlDisplayBox: document.getElementById("url-display-box"),
  urlDisplay: document.getElementById("url-display"),
  traktAuthButton: document.getElementById("trakt-auth-button"),
  traktStatus: document.getElementById("trakt-status"),

  optOutTrending: document.getElementById("optOutTrending"),
  optOutTraktLists: document.getElementById("optOutTraktLists"),
  optOutTraktCatalogs: document.getElementById("optOutTraktCatalogs"),
};

let selectedProvider = "google";
let traktTokens = getTokens();

/* Utility Functions */

// Validates if a string is a UUID
function isValidUUID(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// Retrieves the userId from the URL or localStorage; generates one if missing/invalid.
function getUserId() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length && pathParts[0].startsWith("user:")) {
    const urlUserId = pathParts[0].slice(5);
    if (isValidUUID(urlUserId)) {
      localStorage.setItem("userId", urlUserId);
      return urlUserId;
    } else {
      console.warn("Invalid userId in URL:", urlUserId);
    }
  }
  const userId = localStorage.getItem("userId") || undefined;
  return userId;
}

// Retrieves a JWT token from sessionStorage or fetches one from the API
async function storeKeys(keys) {
  const userId = getUserId();
  let token = sessionStorage.getItem("jwtToken");

  if (!token) {
    const tokenResponse = await fetch(`${manifestBaseUrl}/api/generate-token`);
    if (!tokenResponse.ok) throw new Error("Failed to fetch token");
    const tokenData = await tokenResponse.json();
    token = tokenData.token;
    sessionStorage.setItem("jwtToken", token);
  }

  let recaptchaToken;
  
  // Wrap the execute call in grecaptcha.ready()
  if (enableCaptcha) {
    recaptchaToken = await new Promise((resolve, reject) => {
      window.grecaptcha.enterprise.ready(() => {
        window.grecaptcha.enterprise.execute('{{CAPTCHA_SITE_KEY}}', { action: 'store_keys' })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  const response = await fetch(`${manifestBaseUrl}/api/store-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, recaptchaToken, ...keys }),
  });

  if (!response.ok) throw new Error("Failed to store keys");

  return response.json().then((data) => {
    // Store userId in localStorage only if it doesn't already exist
    if (!localStorage.getItem("userId")) {
      localStorage.setItem("userId", data.userId);
    }
    return data.userId;
  });
}

// Trakt token handling
function storeTokens(tokens) {
  sessionStorage.setItem("traktTokens", JSON.stringify(tokens));
}

function getTokens() {
  const stored = sessionStorage.getItem("traktTokens");
  return stored ? JSON.parse(stored) : { access_token: null, refresh_token: null, expires_at: null };
}

function clearTokens() {
  sessionStorage.removeItem("traktTokens");
  traktTokens = { access_token: null, refresh_token: null, expires_at: null };
}

// API Keys storage in sessionStorage
function storeApiKeys(apiKeys) {
  sessionStorage.setItem("apiKeys", JSON.stringify(apiKeys));
}

function loadApiKeys() {
  const stored = sessionStorage.getItem("apiKeys");
  if (stored) {
    const { googleKey, openaiKey, deepseekKey, claudeKey, tmdbKey, rpdbKey, featherlessKey, featherlessModel } = JSON.parse(stored);
    if (googleKey) elements.googleKeyInput.value = googleKey;
    if (claudeKey) elements.claudeKeyInput.value = claudeKey;
    if (openaiKey) elements.openaiKeyInput.value = openaiKey;
    if (deepseekKey) elements.deepseekKeyInput.value = deepseekKey;
    if (tmdbKey) elements.tmdbKeyInput.value = tmdbKey;
    if (rpdbKey) elements.rpdbKeyInput.value = rpdbKey;

    if (featherlessKey) elements.featherlessKeyInput.value = featherlessKey;

    if (featherlessModel.length > 0) {
      const select = elements.featherlessModelSelect;
      const optionExists = Array.from(select.options).some(option => option.value === featherlessModel);
      if (optionExists) {
        select.value = featherlessModel;
      } else {
        select.value = "custom";
        document.getElementById("featherlessCustomModel").value = featherlessModel;
        document.getElementById("customModelContainer").classList.remove("hidden");
      }
    }
  }
}

// Key validation functions
function isValidGeminiApiKey(key) {
  return typeof key === "string" && /^AIza[a-zA-Z0-9_-]{35,39}$/.test(key);
}

function isValidOpenaiKey(key) {
  return typeof key === "string" && key.trim() !== "";
}

/* Core Functions */

// Retrieves keys from UI based on selected provider and checkboxes
function getKeys() {
  let googleKey = "", openaiKey = "", claudeKey = "", deepseekKey = "", featherlessKey = "", featherlessModel = "";
  if (selectedProvider === "google") {
    googleKey = elements.defaultGoogleKeyCheckbox.checked
      ? "default"
      : elements.googleKeyInput.value.trim();
  } else if (selectedProvider === "openai") {
    openaiKey = elements.openaiKeyInput.value.trim();
  } else if (selectedProvider === "claude") {
    claudeKey = elements.claudeKeyInput.value.trim();
  } else if (selectedProvider === "deepseek") {
    deepseekKey = elements.deepseekKeyInput.value.trim();
  } else if (selectedProvider === "featherless") {
    featherlessKey = elements.featherlessKeyInput.value.trim();
    featherlessModel = elements.featherlessModelSelect.value === "custom"
      ? elements.featherlessCustomModel.value.trim()
      : elements.featherlessModelSelect.value;
  }
  const tmdbKey = elements.defaultTmdbKeyCheckbox.checked
    ? "default"
    : elements.tmdbKeyInput.value.trim();
  const rpdbKey = elements.rpdbKeyInput.value.trim();
  const { access_token: traktKey, refresh_token: traktRefresh, expires_at: traktExpiresAt } = traktTokens;
  const traktCreateLists = !elements.optOutTraktLists.checked;
  const optOutTrending = !elements.optOutTrending.checked;
  const optOutTraktCatalogs = !elements.optOutTraktCatalogs.checked;

  return { selectedProvider, googleKey, openaiKey, claudeKey, deepseekKey, featherlessKey, featherlessModel, tmdbKey, rpdbKey, traktKey, traktCreateLists, traktRefresh, traktExpiresAt, optOutTrending, optOutTraktCatalogs };
}

// Builds the manifest URL using the userId and optional parameters
function generateManifestUrl(userId) {
  let url = `${manifestBaseUrl}/user:${userId}`;
  url += '/manifest.json';
  
  return url;
}

// Updates Trakt connection status in the UI
function updateTraktStatus() {
  if (traktTokens.access_token) {
    elements.traktStatus.textContent = "Connected";
    elements.traktStatus.classList.add("text-green-400");
    elements.traktAuthButton.textContent = "Disconnect Trakt.tv";
  } else {
    elements.traktStatus.textContent = "Not connected";
    elements.traktStatus.classList.remove("text-green-400");
    elements.traktAuthButton.textContent = "Connect Trakt.tv";
  }
}

// Handles authentication callback by parsing URL parameters
async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const access_token = urlParams.get("access_token");
  const refresh_token = urlParams.get("refresh_token");
  const expires_at = urlParams.get("expires_at");

  if (access_token && refresh_token && expires_at) {
    traktTokens = { access_token, refresh_token, expires_at };
    storeTokens(traktTokens);
    await storeKeys(getKeys());
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    traktTokens = getTokens();
  }
  updateTraktStatus();
  updateUI();
}

// Updates UI elements based on current state and provider selection
function updateUI() {
  const keys = getKeys();

  if (selectedProvider === "google") {
    elements.googleKeyInput.disabled = elements.defaultGoogleKeyCheckbox.checked;
    if (elements.defaultGoogleKeyCheckbox.checked) {
      elements.googleKeyInput.value = "default";
    }
    const isGoogleKeyValid = keys.googleKey === "default" || isValidGeminiApiKey(keys.googleKey);
    elements.installButton.disabled = !isGoogleKeyValid;
  } else if (selectedProvider === "openai") {
    elements.installButton.disabled = !isValidOpenaiKey(keys.openaiKey);
  } else if (selectedProvider === "claude") {
    elements.installButton.disabled = !isValidOpenaiKey(keys.claudeKey);
  } else if (selectedProvider === "deepseek") {
    elements.installButton.disabled = !isValidOpenaiKey(keys.deepseekKey);
  } else if (selectedProvider === "featherless") {
    elements.installButton.disabled = !isValidOpenaiKey(keys.featherlessKey);
  }

  // TMDB key handling
  elements.tmdbKeyInput.disabled = elements.defaultTmdbKeyCheckbox.checked;
  if (elements.defaultTmdbKeyCheckbox.checked) {
    elements.tmdbKeyInput.value = "default";
  }
}

/* Provider Key Validation Helpers */

function validateProviderKey(provider, keys) {
  switch (provider) {
    case "google":
      return keys.googleKey === "default" || isValidGeminiApiKey(keys.googleKey);
    case "openai":
      return isValidOpenaiKey(keys.openaiKey);
    case "claude":
      return isValidOpenaiKey(keys.claudeKey);
    case "deepseek":
      return isValidOpenaiKey(keys.deepseekKey);
    case "featherless":
      return isValidOpenaiKey(keys.featherlessKey);
    default:
      return false;
  }
}

function getProviderErrorMessage(provider) {
  switch (provider) {
    case "google":
      return "Please enter a valid Google API key to install the addon.";
    case "openai":
      return "Please enter a valid OpenAI API key to install the addon.";
    case "claude":
      return "Please enter a valid Claude API key to install the addon.";
    case "deepseek":
      return "Please enter a valid Deepseek API key to install the addon.";
    case "featherless":
      // NEW: Error message for Featherless
      return "Please enter a valid Featherless API key to install the addon.";
    default:
      return "Invalid provider key.";
  }
}

// Processes installation: validates key, stores data, and displays the manifest URL.
async function processInstallation() {
  const keys = getKeys();
  if (!validateProviderKey(selectedProvider, keys)) {
    alert(getProviderErrorMessage(selectedProvider));
    return;
  }

  try {
    const userId = await storeKeys(keys);
    storeApiKeys(keys);
    const url = generateManifestUrl(userId);
    displayUrl(url);
  } catch (error) {
    alert("Failed to store keys. Please try again.");
    console.error(error);
  }
}

// Displays the manifest URL and attempts to copy it to the clipboard.
async function displayUrl(url) {
  elements.urlDisplay.textContent = url;
  elements.urlDisplayBox.classList.remove("hidden");

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    alert("Installation URL copied to clipboard!");
  } else {
    alert("Installation URL is now visible below.");
  }
}

/* Event Listeners */

elements.featherlessModelSelect.addEventListener('change', () => {
  if (elements.featherlessModelSelect.value === 'custom') {
    elements.customModelContainer.classList.remove('hidden');
  } else {
    elements.customModelContainer.classList.add('hidden');
  }
});

// Provider selection buttons
document.querySelectorAll(".provider-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    selectedProvider = this.getAttribute("data-provider");

    // Update active state
    document.querySelectorAll(".provider-btn").forEach((b) =>
      b.classList.remove("ring-2", "ring-offset-2", "ring-blue-500")
    );
    this.classList.add("ring-2", "ring-offset-2", "ring-blue-500");

    // Toggle provider-specific config panels
    document.querySelectorAll(".provider-config").forEach((config) => {
      config.classList.toggle(
        "hidden",
        config.getAttribute("data-provider-config") !== selectedProvider
      );
    });
    updateUI();
  });
});

// Group input event listeners to update UI and persist API keys
[
  elements.googleKeyInput,
  elements.openaiKeyInput,
  elements.deepseekKeyInput,
  elements.claudeKeyInput,
  elements.tmdbKeyInput,
  elements.rpdbKeyInput,
  // NEW: Add Featherless inputs
  elements.featherlessKeyInput,
  elements.featherlessModelSelect
].forEach((input) => {
  input.addEventListener("input", () => {
    updateUI();
    storeApiKeys(getKeys());
  });
});

// Group change event listeners for checkboxes
[
  elements.defaultGoogleKeyCheckbox,
  elements.defaultTmdbKeyCheckbox,
  elements.optOutTraktLists,
  elements.optOutTrending,
  elements.optOutTraktCatalogs,
].forEach((el) => {
  el.addEventListener("change", () => {
    updateUI();
    storeApiKeys(getKeys());
  });
});

// Trakt authentication
elements.traktAuthButton.addEventListener("click", () => {
  if (traktTokens.access_token) {
    clearTokens();
    updateTraktStatus();
    updateUI();
  } else {
    window.location.href = `${manifestBaseUrl}/auth/login`;
  }
});

// Install and update keys actions
elements.installButton.addEventListener("click", processInstallation);

elements.updateKeysButton.addEventListener("click", async () => {
  const keys = getKeys();
  try {
    await storeKeys(keys);
    storeApiKeys(keys);
    alert("Keys updated successfully!");
    updateUI();
  } catch (error) {
    alert("Failed to update keys. Please try again.");
    console.error(error);
  }
});

// Load stored API keys and handle any auth callback on page load
window.addEventListener("load", () => {
  loadApiKeys();
  handleAuthCallback();
});

// I hate vanilla javascript... I HATE IT!!!