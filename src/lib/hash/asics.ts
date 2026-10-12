/** ASIC catalog. Prices are estimates for the devnet test, not live quotes. */
export interface AsicModel {
  id: string;
  model: string;
  th: number;
  watts: number;
  price: number;
  stock: number;
  note: string;
}

export const DEPLOY_FEE = 100; // flat USD per ASIC for shipping + install

export const ASICS: AsicModel[] = [
  { id: "s19xp", model: "Antminer S19 XP", th: 141, watts: 3010, price: 1400, stock: 12, note: "Air-cooled. Good fit for small solar sites." },
  { id: "s21", model: "Antminer S21", th: 200, watts: 3500, price: 3200, stock: 8, note: "Air-cooled. Runs well on battery overnight." },
  { id: "s21xp", model: "Antminer S21 XP", th: 270, watts: 3645, price: 5500, stock: 5, note: "Air-cooled. Best TH per watt without water." },
  { id: "s23hyd", model: "Antminer S23 Hyd", th: 580, watts: 5510, price: 11000, stock: 2, note: "Water-cooled. Needs a large site and a dry cooler." },
];

export const jth = (a: AsicModel) => a.watts / a.th;
export const asicById = (id: string) => ASICS.find((a) => a.id === id)!;
/** Mining capacity a site supports: 150 TH per 8 kW of solar. */
export const capacityTh = (solarKw: number) => (solarKw * 150) / 8;
