import { Player } from './player.js';
import { bindArrowKeys } from './input.js';
import { assets, preloadAssets } from './assets.js';
import level1 from '../maps/Level1.js';
import {
  createGrid,
  buildFromMap,
  exportMap,     // for that console.log
  findSpawn,     // for the spawn coordinate
  TILE_TYPE      // only if you use it to clear the spawn tile
} from './grid.js';

const GRID_ID = 'game-grid';

document.addEventListener('DOMContentLoaded', async () => {
  const gridApi = createGrid(GRID_ID, 10, 10);
  const gameMap = level1.map(row => row.slice());
  gridApi.map = gameMap;  // Use Gamemap for updates over the map! 
  buildFromMap(gridApi, gameMap);

  // const mapData = exportMap(gridApi);
  console.log(gameMap);

  const loaded = await preloadAssets(assets);      // <‑‑ do this before you use `loaded`

  const player = new Player('p1', assets.player.idle, { loadedAssets: loaded });

  const spawn = findSpawn(level1);
  if (spawn) {
      player.moveTo(gridApi, spawn.x, spawn.y);
      // gridApi.setType(spawn.x, spawn.y, TILE_TYPE.EMPTY);
  }

  bindArrowKeys(player, gridApi, { repeatOnHold: true, repeatInterval: 180 });

  window.__game = { gridApi, player, assetsLoaded: loaded };
});
