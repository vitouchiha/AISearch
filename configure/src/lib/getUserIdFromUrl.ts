export const getUserIdFromUrl = (): string => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      // Match anything between "/user:" and the next slash.
      const match = path.match(/\/user:([^/]+)/);
      return match ? match[1] : "";
    }
    return "";
  };