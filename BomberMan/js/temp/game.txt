import { Player } from './player.js';
import { bindArrowKeys } from './input.js';
import { assets, preloadAssets } from './assets.js';
import level1 from '../maps/Level1.js';
import {
  createGrid,
  buildFromMap,
  exportMap,     // for that console.log
  findSpawn,    // for the spawn coordinate
  TILE_TYPE,
 
} from './grid.js';
import { startTick } from './tick.js';


const GRID_ID = 'game-grid';

let hbTimer = 0;
let hbState = true;
const ActiveBombArr = []; // Global array to track active bombs collision stuff
const TaskQueue = []; // Global task queue for sequential actions


export function scheduleTask(ms, callback) {
  TaskQueue.push({
    time: ms,
    onComplete:callback
  });
}

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

  bindArrowKeys(player, gridApi, { repeatOnHold: true, repeatInterval: 180, activeBombs : ActiveBombArr });

window.__game = { gridApi, player, assetsLoaded: loaded };

// Start the tick
startTick((deltaTime) => {
    // EVERYTHING that needs deltaTime must be inside these curly braces!

    // 1. Update the MS display
    const msElement = document.getElementById('ms-display');
    if (msElement) {
        msElement.innerText = deltaTime.toFixed(2) + "ms";
    }

    // 2. Accumulate time for the light flip
    hbTimer += deltaTime;

    if (hbTimer > 500) { 
        hbTimer = 0;     
        hbState = !hbState; 

        const l1 = document.getElementById('light-1');
        const l2 = document.getElementById('light-2');

        if (l1 && l2) { // Safety check
            if (hbState) {
                l1.classList.add('active');
                l2.classList.remove('active');
            } else {
                l1.classList.remove('active');
                l2.classList.add('active');
            }
        }
    }


    for (let i = TaskQueue.length - 1; i >= 0; i--) { //task scheduler loop //
        const task = TaskQueue[i];
        task.time -= deltaTime;

        if (task.time <= 0) {
            task.onComplete();
            TaskQueue.splice(i, 1); // Remove the completed task
        }
    }
    
});
});
