export function parseAcceptLanguage(header: string): string | null {
    if (!header) return null;
  
    // Split the header into individual language entries
    const languages = header.split(",").map(entry => {
      const parts = entry.trim().split(";");
  
      // The language code is the first part
      const rawCode = parts[0].trim();
      const code = rawCode.split("-")[0];
  
      // Parse the quality factor if provided, otherwise default to 1.0
      let quality = 1.0;
      if (parts.length > 1 && parts[1].startsWith("q=")) {
        const qValue = parseFloat(parts[1].split("=")[1]);
        if (!isNaN(qValue)) {
          quality = qValue;
        }
      }
      return { code, quality };
    });
  
    // Sort languages by quality in descending order
    languages.sort((a, b) => b.quality - a.quality);
  
    // Return the code of the highest quality language
    return languages[0].code || null;
  }