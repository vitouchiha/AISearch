export function parseAcceptLanguage(header: string): string | null {
    if (!header) return null;
 
    const languages = header.split(",").map(entry => {
      const parts = entry.trim().split(";");

      const rawCode = parts[0].trim();
      const code = rawCode.split("-")[0];

      let quality = 1.0;
      if (parts.length > 1 && parts[1].startsWith("q=")) {
        const qValue = parseFloat(parts[1].split("=")[1]);
        if (!isNaN(qValue)) quality = qValue;
      }
      return { code, quality };
    });

    languages.sort((a, b) => b.quality - a.quality);

    return languages[0].code || null;
  }