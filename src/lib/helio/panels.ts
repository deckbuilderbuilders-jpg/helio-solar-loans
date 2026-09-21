/**
 * Panel primitives. One Helio Panel = 400 W DC of underwriting capacity = $400 USDC.
 * Panels are minted in the shop, then burned (permanently) into a project to mint a Project Share.
 */
import { PANEL_PRICE_USDC, PANEL_WATTS_DC } from "./constants";
import type { ProjectSpecs } from "./takeout";
import { computeTakeout } from "./takeout";

/** Funding target = kW_DC × $1.00/W. */
export function fundingTarget(kwDc: number): number {
  return kwDc * 1000;
}

/** Panels required = ceil(kW_DC × 1000 / 400). */
export function panelsRequired(kwDc: number): number {
  return Math.ceil((kwDc * 1000) / PANEL_WATTS_DC);
}

export interface Underwrite {
  fundingTarget: number;
  panelsRequired: number;
  panelCost: number;
  takeout: number;
  takeoutPerPanel: number;
  tailToShares: number;
  tailPerPanel: number;
  /** Takeout + share of tail, per panel, against the $400 mint price. */
  totalPerPanel: number;
  multiple: number;
}

export function underwrite(specs: ProjectSpecs, originatorTailBps: number): Underwrite {
  const t = computeTakeout(specs);
  const target = fundingTarget(specs.kwDc);
  const panels = panelsRequired(specs.kwDc);
  const tailToShares = (t.recTail * (10_000 - originatorTailBps)) / 10_000;
  const takeoutPerPanel = t.takeout / panels;
  const tailPerPanel = tailToShares / panels;
  return {
    fundingTarget: target,
    panelsRequired: panels,
    panelCost: panels * PANEL_PRICE_USDC,
    takeout: t.takeout,
    takeoutPerPanel,
    tailToShares,
    tailPerPanel,
    totalPerPanel: takeoutPerPanel + tailPerPanel,
    multiple: (takeoutPerPanel + tailPerPanel) / PANEL_PRICE_USDC,
  };
}
