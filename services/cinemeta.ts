import { TMDBDetails } from "../config/types/types.ts";

export const fetchCinemeta = async (type: string, id: string): Promise<TMDBDetails | null> => {
    try {
        const response = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
        const data = await response.json();
        return {
            id: data?.meta?.id,
            poster: data?.meta?.poster,
            showName: data?.meta?.name,
            year: data?.meta?.released,
            type: data?.meta?.type,
        } as TMDBDetails;

    } catch (error) {
        console.error('Error fetching Cinemeta poster:', error);
        return null;
    }
};