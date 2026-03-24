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
import { initMultiplayer, remotePlayers } from './multiplayer.js';


const GRID_ID = 'game-grid';

let hbTimer = 0;
let hbState = true;
export const ActiveBombArr = []; // Global array to track active bombs collision stuff
const TaskQueue = []; // Global task queue for sequential actions


export function scheduleTask(ms, callback) {
  const newTask = {
    time: ms,
    onComplete: callback
  };
  TaskQueue.push(newTask);
  return newTask; 
}

// Lightweight API to read current player coordinates
export function getPlayerCoords() {
  const p = (typeof window !== 'undefined' && window.__game && window.__game.player) || null;
  if (!p || p.x == null || p.y == null) return null;
  return { x: p.x, y: p.y, id: p.id };
}

export function findBombAt(x, y) {
    return ActiveBombArr.find(b => b.x === x && b.y === y);
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("A: Initializing Grid...");
  const gridApi = createGrid(GRID_ID, 10, 10);
  const gameMap = level1.map(row => row.slice());
  gridApi.map = gameMap;  // Use Gamemap for updates over the map! 
  buildFromMap(gridApi, gameMap);

  const loaded = await preloadAssets(assets);      // <‑‑ do this before you use `loaded`
  const spawn = findSpawn(level1);


console.log("B: Calling initMultiplayer...");

      const myNetState = await initMultiplayer(gridApi, { player: assets.player, loaded: loaded }, spawn);
      console.log("I am connected as:", myNetState.id);
        if (!myNetState) {
    console.error("CRITICAL: Multiplayer failed to return a player object!");
}
       const player = new Player('p1', assets.player.idle, { loadedAssets: loaded });
  if (spawn) {
      player.moveTo(gridApi, spawn.x, spawn.y);
  }
 

//   bindArrowKeys(player, gridApi, { repeatOnHold: true, repeatInterval: 180, activeBombs : ActiveBombArr });
  const updateMovement = bindArrowKeys(player, gridApi, { activeBombs: ActiveBombArr });

window.__game = { gridApi, player, assetsLoaded: loaded };


// Start the tick

let lastNetx = null;
let lastNety = null;

    startTick((deltaTime) => {
        // 0. Update player movement
        updateMovement(); 

        // 1. Sync position (Only if network is ready)
        if (myNetState && typeof myNetState.setState === 'function') {
            myNetState.setState("pos", { x: player.x, y: player.y }, false);

            lastNetX = player.x;
            lastNetY = player.y;
        }

        // 2. Sync remote players (ALWAYS run this)
        for (const id in remotePlayers) { 
            const { state, object } = remotePlayers[id];
            const targetPos = state.getState("pos");
            
            if (targetPos) {

                if (object.x !== targetPos.x || object.y !== targetPos.y) { // Only move if there's a position change

                object.moveTo(gridApi, targetPos.x, targetPos.y, true); // Force move to ensure sync
                }
            }
        }

        
        
        // 3. Update the MS display
        const msElement = document.getElementById('ms-display');
        if (msElement) msElement.innerText = deltaTime.toFixed(2) + "ms";

        // 4. Update the light flip
        hbTimer += deltaTime;
        if (hbTimer > 500) { 
            hbTimer = 0;     
            hbState = !hbState; 
            // ... (keep your existing light logic)
        }

        // 5. Task queue
        for (let i = TaskQueue.length - 1; i >= 0; i--) {
            const task = TaskQueue[i];
            task.time -= deltaTime;
            if (task.time <= 0) {
                task.onComplete();
                TaskQueue.splice(i, 1);
            }
        }
    });
});
