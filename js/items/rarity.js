export const RARITIES = Object.freeze([
  { id: "common", label: "Common", labelPt: "Comum", color: "#b9c2b8", weight: 0.52, multiplier: 1, attributes: 1, glow: 0.25 },
  { id: "uncommon", label: "Uncommon", labelPt: "Incomum", color: "#79d69a", weight: 0.26, multiplier: 1.45, attributes: 2, glow: 0.42 },
  { id: "rare", label: "Rare", labelPt: "Raro", color: "#79bdf0", weight: 0.14, multiplier: 2.05, attributes: 3, glow: 0.62 },
  { id: "epic", label: "Epic", labelPt: "Épico", color: "#cf91f2", weight: 0.06, multiplier: 2.8, attributes: 4, glow: 0.82 },
  { id: "legendary", label: "Legendary", labelPt: "Lendário", color: "#ffc45f", weight: 0.02, multiplier: 3.8, attributes: 5, glow: 1 }
]);

export function getRarity(id) {
  return RARITIES.find((rarity) => rarity.id === id) ?? RARITIES[0];
}
