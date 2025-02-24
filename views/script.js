const manifestBaseUrl = "{{ROOT_URL}}";
const elements = {
  googleKeyInput: document.getElementById("googleKey"),
  openaiKeyInput: document.getElementById("openaiKey"),
  deepseekKeyInput: document.getElementById("deepseekKey"),
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
};

// Default provider is Google
let selectedProvider = "google";
let traktTokens = getTokens();

// Provider selection buttons
document.querySelectorAll('.provider-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    selectedProvider = this.getAttribute('data-provider');
    // Visual feedback: remove active ring from all and add to selected
    document.querySelectorAll('.provider-btn').forEach(b => {
      b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
    });
    this.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');

    // Toggle provider-specific configuration panels
    document.querySelectorAll('.provider-config').forEach(config => {
      if (config.getAttribute('data-provider-config') === selectedProvider) {
        config.classList.remove('hidden');
      } else {
        config.classList.add('hidden');
      }
    });
    updateUI();
  });
});

function generateUserId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function isValidUUID(uuid) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}
function getUserId() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && pathParts[0].startsWith("user:")) {
    const urlUserId = pathParts[0].slice(5);
    if (isValidUUID(urlUserId)) {
      localStorage.setItem("userId", urlUserId);
      return urlUserId;
    } else {
      console.warn("Invalid userId in URL:", urlUserId);
    }
  }
  let userId = localStorage.getItem("userId");
  if (!userId || !isValidUUID(userId)) {
    userId = generateUserId();
    localStorage.setItem("userId", userId);
  }
  return userId;
}
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

  const response = await fetch(`${manifestBaseUrl}/api/store-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, ...keys }),
  });

  if (!response.ok) throw new Error("Failed to store keys");
  return userId;
}

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

function storeApiKeys(apiKeys) {
  // Save all keys including googleKey and openaiKey
  sessionStorage.setItem("apiKeys", JSON.stringify(apiKeys));
}
function loadApiKeys() {
  const stored = sessionStorage.getItem("apiKeys");
  if (stored) {
    const { googleKey, openaiKey, deepseekKey, tmdbKey, rpdbKey } = JSON.parse(stored);
    if (googleKey) elements.googleKeyInput.value = googleKey;
    if (openaiKey) elements.openaiKeyInput.value = openaiKey;
    if (deepseekKey) elements.deepseekKeyInput.value = deepseekKey;
    if (tmdbKey) elements.tmdbKeyInput.value = tmdbKey;
    if (rpdbKey) elements.rpdbKeyInput.value = rpdbKey;
  }
}

function isValidGeminiApiKey(key) {
  return typeof key === "string" && /^AIza[a-zA-Z0-9_-]{35,39}$/.test(key);
}
function isValidOpenaiKey(key) {
  return typeof key === "string" && key.trim() !== "";
}

function getKeys() {
  let googleKey = "";
  let openaiKey = "";
  let deepseekKey = "";
  if (selectedProvider === "google") {
    googleKey = elements.defaultGoogleKeyCheckbox.checked
      ? "default"
      : elements.googleKeyInput.value.trim();
  } else if (selectedProvider === "openai") {
    openaiKey = elements.openaiKeyInput.value.trim();
  } else if (selectedProvider === "deepseek") {
    deepseekKey = elements.deepseekKeyInput.value.trim();
  }
  const tmdbKey = elements.defaultTmdbKeyCheckbox.checked
    ? "default"
    : elements.tmdbKeyInput.value.trim();
  const rpdbKey = elements.rpdbKeyInput.value.trim();
  const traktKey = traktTokens["access_token"];
  const traktRefresh = traktTokens["refresh_token"];
  const traktExpiresAt = traktTokens["expires_at"];
  return { selectedProvider, googleKey, openaiKey, deepseekKey, tmdbKey, rpdbKey, traktKey, traktRefresh, traktExpiresAt };
}

function generateManifestUrl(userId) {
  let url = `${manifestBaseUrl}/user:${userId}/manifest.json`;
  const params = [];
  if (elements.optOutTrending && elements.optOutTrending.checked) {
    params.push("trending=false");
  }
  if (params.length > 0) {
    url += "?" + params.join("&");
  }
  return url;
}

function updateTraktStatus() {
  if (traktTokens["access_token"]) {
    elements.traktStatus.textContent = "Connected";
    elements.traktStatus.classList.add("text-green-400");
    elements.traktAuthButton.textContent = "Disconnect Trakt.tv";
  } else {
    elements.traktStatus.textContent = "Not connected";
    elements.traktStatus.classList.remove("text-green-400");
    elements.traktAuthButton.textContent = "Connect Trakt.tv";
  }
}

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

function updateUI() {
  const keys = getKeys();
  
  if (selectedProvider === "google") {
    // Enable/disable Google key input based on checkbox
    elements.googleKeyInput.disabled = elements.defaultGoogleKeyCheckbox.checked;
    if (elements.defaultGoogleKeyCheckbox.checked) {
      elements.googleKeyInput.value = "default";
    }
    const isGoogleKeyValid = keys.googleKey === "default" || isValidGeminiApiKey(keys.googleKey);
    elements.installButton.disabled = !isGoogleKeyValid;
  } else if (selectedProvider === "openai") {
    // For OpenAI, simply ensure a key is provided
    elements.installButton.disabled = !isValidOpenaiKey(keys.openaiKey);
  } else if (selectedProvider === "deepseek") {
    elements.installButton.disabled = !isValidOpenaiKey(keys.deepseekKey);
  }
  // TMDB key handling
  elements.tmdbKeyInput.disabled = elements.defaultTmdbKeyCheckbox.checked;
  if (elements.defaultTmdbKeyCheckbox.checked) {
    elements.tmdbKeyInput.value = "default";
  }
}

// Input event listeners to update UI and store keys in sessionStorage
elements.googleKeyInput.addEventListener("input", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.openaiKeyInput.addEventListener("input", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.deepseekKeyInput.addEventListener("input", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.tmdbKeyInput.addEventListener("input", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.rpdbKeyInput.addEventListener("input", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.defaultGoogleKeyCheckbox.addEventListener("change", () => {
  updateUI();
  storeApiKeys(getKeys());
});
elements.defaultTmdbKeyCheckbox.addEventListener("change", () => {
  updateUI();
  storeApiKeys(getKeys());
});

elements.traktAuthButton.addEventListener("click", () => {
  if (traktTokens["access_token"]) {
    clearTokens();
    updateTraktStatus();
    updateUI();
  } else {
    window.location.href = `${manifestBaseUrl}/auth/login`;
  }
});

elements.installButton.addEventListener("click", async () => {
  const keys = getKeys();
  if (selectedProvider === "google") {
    if (keys.googleKey === "default" || isValidGeminiApiKey(keys.googleKey)) {
      try {
        const userId = await storeKeys(keys);
        storeApiKeys(keys);
        const url = generateManifestUrl(userId);
        elements.urlDisplay.textContent = url;
        elements.urlDisplayBox.classList.remove("hidden");

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          alert("Installation URL copied to clipboard!");
        } else {
          alert("Installation URL is now visible below.");
        }
      } catch (error) {
        alert("Failed to store keys. Please try again.");
        console.error(error);
      }
    } else {
      alert("Please enter a valid Google API key to install the addon.");
    }
  } else if (selectedProvider === "openai") {
    if (isValidOpenaiKey(keys.openaiKey)) {
      try {
        const userId = await storeKeys(keys);
        storeApiKeys(keys);
        const url = generateManifestUrl(userId);
        elements.urlDisplay.textContent = url;
        elements.urlDisplayBox.classList.remove("hidden");

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          alert("Installation URL copied to clipboard!");
        } else {
          alert("Installation URL is now visible below.");
        }
      } catch (error) {
        alert("Failed to store keys. Please try again.");
        console.error(error);
      }
    } else {
      alert("Please enter a valid OpenAI API key to install the addon.");
    }
  } else if (selectedProvider === "deepseek") {
    if (isValidOpenaiKey(keys.deepseekKey)) {
      try {
        const userId = await storeKeys(keys);
        storeApiKeys(keys);
        const url = generateManifestUrl(userId);
        elements.urlDisplay.textContent = url;
        elements.urlDisplayBox.classList.remove("hidden");

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          alert("Installation URL copied to clipboard!");
        } else {
          alert("Installation URL is now visible below.");
        }
      } catch (error) {
        alert("Failed to store keys. Please try again.");
        console.error(error);
      }
    } else {
      alert("Please enter a valid Deepseek API key to install the addon.");
    }
  }
});

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

window.addEventListener("load", () => {
  loadApiKeys();
  handleAuthCallback();
});