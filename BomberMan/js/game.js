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
  // pass `loaded` so Player can consume preloaded spritesheet image for background-position math
  const player = new Player('p1', assets.player.idle, { loadedAssets: loaded });
  player.place(gridApi, 0, 0);

  // allow moving with arrow keys; enable repeat-on-hold (true/false)
  bindArrowKeys(player, gridApi, { repeatOnHold: true, repeatInterval: 180 });

  // expose for console/debugging
  window.__game = { gridApi, player, assetsLoaded: loaded };
});
