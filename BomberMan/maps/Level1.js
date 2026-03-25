// codes:
//   0 = empty
//   1 = permanent wall
//   2 = box (breakable)
//   3 = player spawn
//   4 = power‑up (rarely placed directly, usually found in boxes)

export default [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Top Border
  [1, 3, 0, 2, 2, 2, 2, 0, 3, 1], // Row 1: Spawns + Safety area
  [1, 0, 1, 2, 1, 2, 1, 2, 0, 1], // Row 2: Pillars + Boxes
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 3: Solid boxes
  [1, 2, 1, 2, 1, 4, 1, 2, 1, 1], // Row 4: Pillars + rare Powerup (4)
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 5: Solid boxes
  [1, 2, 1, 2, 1, 2, 1, 2, 1, 1], // Row 6: Pillars
  [1, 0, 1, 2, 1, 2, 1, 2, 0, 1], // Row 7: Pillars
  [1, 3, 0, 2, 2, 2, 2, 0, 3, 1], // Row 8: Spawns + Safety area
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Bottom Border
];