/** Miner economics. The protocol picks the miners; users only bond the project's ASIC curve. */
export const TH_COST = 16; // USD per TH, estimate from current Antminer S21 pricing
export const DEPLOY_FEE = 100; // USD per project ASIC deployment

/** Mining capacity a site's solar supports: 150 TH per 8 kW. */
export const capacityTh = (solarKw: number) => (solarKw * 150) / 8;
