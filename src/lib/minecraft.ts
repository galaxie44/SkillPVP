/** Double coffre : 6 lignes × 9 slots × 64 items */
export const ITEMS_PER_ROW = 9 * 64;
export const ROWS_PER_DC = 6;
export const DOUBLE_CHEST_CAPACITY = ROWS_PER_DC * ITEMS_PER_ROW;

export interface ChestBreakdown {
  fullDc: number;
  lignes: number;
}

export function quantityToChestBreakdown(quantity: number): ChestBreakdown {
  if (quantity <= 0) return { fullDc: 0, lignes: 0 };

  const fullDc = Math.floor(quantity / DOUBLE_CHEST_CAPACITY);
  const remainder = quantity % DOUBLE_CHEST_CAPACITY;

  if (remainder === 0) return { fullDc, lignes: 0 };

  const lignes = Math.min(
    ROWS_PER_DC,
    Math.ceil(remainder / ITEMS_PER_ROW)
  );

  return { fullDc, lignes };
}

/** Ex: "5 DC & 3 lignes", "28 DC", "2 lignes" */
export function formatChestStorage(quantity: number): string {
  const { fullDc, lignes } = quantityToChestBreakdown(quantity);

  if (fullDc === 0 && lignes === 0) return "0 DC";
  if (fullDc > 0 && lignes === 0) {
    return fullDc === 1 ? "1 DC" : `${fullDc} DC`;
  }
  if (fullDc === 0 && lignes > 0) {
    return lignes === 1 ? "1 ligne" : `${lignes} lignes`;
  }
  const ligneLabel = lignes === 1 ? "1 ligne" : `${lignes} lignes`;
  const dcLabel = fullDc === 1 ? "1 DC" : `${fullDc} DC`;
  return `${dcLabel} & ${ligneLabel}`;
}

export function formatQuantityWithChests(quantity: number): string {
  return `${quantity.toLocaleString("fr-FR")} (${formatChestStorage(quantity)})`;
}
