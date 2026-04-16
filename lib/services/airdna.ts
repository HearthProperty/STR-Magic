import type { MarketMetrics } from "@/lib/types";
import { fetchAirDNAMarketMetrics as coreFetchAirDNAMarketMetrics } from "@/lib/evaluate";

/**
 * AirDNA Service
 * Unifies access to AirDNA-derived market metrics. This wrapper isolates
 * the rest of the app from vendor details and makes swapping providers easy.
 */
export async function fetchAirDNAMarketMetrics(address: string): Promise<MarketMetrics> {
    return coreFetchAirDNAMarketMetrics(address);
}


