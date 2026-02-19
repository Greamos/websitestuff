import { createGrid } from './grid.js';
import { Player } from './player.js';
import { bindArrowKeys } from './input.js';
import { assets, preloadAssets } from './assets.js';

const GRID_ID = 'game-grid';

document.addEventListener('DOMContentLoaded', async () => {
  const gridApi = createGrid(GRID_ID, 10, 10);

  // preload assets (returns lookup path -> Image)
  const loaded = await preloadAssets(assets);

  // create a player and place at 0,0 (use provided bomberman image)
  // we still pass the path; preloading warmed the browser cache and
  // `loaded` allows access to Image objects if needed.
  const player = new Player('p1', assets.player.idle);
  player.place(gridApi, 0, 0);

  // allow moving with arrow keys; enable repeat-on-hold (true/false)
  bindArrowKeys(player, gridApi, { repeatOnHold: true, repeatInterval: 180 });

  // expose for console/debugging
  window.__game = { gridApi, player, assetsLoaded: loaded };
});
