import { useState, useEffect } from "react";

function useKeyStatus(providerName: string, apiKey: string) {
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "error">("idle");

  const normalizedProvider = providerName.toLowerCase();

  useEffect(() => {
    if (!apiKey) {
      setStatus("idle");
      return;
    }

    setStatus("checking");

    const timer = setTimeout(() => {
      // Construct payload key in lowercase: e.g., "claudeKey"
      const payload = { [normalizedProvider + "Key"]: apiKey };
      fetch("/api/key/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          // Check if the aggregated response for the provider is valid.
          if (data && data[normalizedProvider] && data[normalizedProvider].status === "valid") {
            setStatus("valid");
          } else {
            setStatus("error");
          }
        })
        .catch(() => {
          setStatus("error");
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [apiKey, providerName, normalizedProvider]);

  return status;
}

export default useKeyStatus;