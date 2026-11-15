export const TILE = Object.freeze({
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  STAIRS_DOWN: 3,
  STAIRS_UP: 4,
  SHOP: 5,
  TREASURE: 6,
  EVENT: 7,
  BOSS: 8,
});

export function isWalkableTile(tile) {
  return tile !== TILE.WALL;
}
