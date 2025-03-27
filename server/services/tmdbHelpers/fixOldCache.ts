import type { Meta } from "../../config/types/meta.ts";

export function isOldCacheStructure(obj: any): boolean {
  return (
    obj &&
    ("showName" in obj || "year" in obj) &&
    !("name" in obj && "released" in obj)
  );
}

export function convertOldToNewStructure(oldData: any, type: string): Meta {
  return {
    id: oldData.id || "",
    poster: oldData.poster || oldData.img || null,
    name: oldData.showName || oldData.name || "",
    type,
    released: oldData.year ? String(oldData.year).split("-")[0] : "",
    posterShape: "poster",
    language: oldData.language || "",
    country: oldData.country || "",
    background: oldData.background || "",
    description: oldData.description || "",
    runtime: oldData.runtime || "",
    genres: oldData.genres || [],
    website: oldData.website || "",
  };
}