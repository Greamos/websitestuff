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
  const gridApi = createGrid(GRID_ID, 10, 10);
  const gameMap = level1.map(row => row.slice());
  gridApi.map = gameMap;  // Use Gamemap for updates over the map! 
  buildFromMap(gridApi, gameMap);

  const loaded = await preloadAssets(assets);      // <‑‑ do this before you use `loaded`
   const spawn = findSpawn(level1);
//   if (spawn) {
//       player.moveTo(gridApi, spawn.x, spawn.y);
//   }
//   const player = new Player('p1', assets.player.idle, { loadedAssets: loaded }); // old way: new Player('p1', loaded.player.idle);
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
startTick((deltaTime) => {
    // EVERYTHING that needs deltaTime must be inside these curly braces!

    // 0. Update player movement based on input
    updateMovement(); 


    if (myNetState && typeof myNetState.setState === 'function') {
    myNetState.setState("pos", { x: player.x, y: player.y }); // multiplayer position sync
        } else {


    for (const id in remotePlayers) {
        if (id === myNetState.id) continue; // Skip yourself

        const { state, object } = remotePlayers[id];
        const targetPos = state.getState("pos");
        
        if (targetPos) {
            // Use your existing moveTo logic to move the "ghost" player
            object.moveTo(gridApi, targetPos.x, targetPos.y);
        }
    }
    

    // 1. Update the MS display (stoplight)
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
        
        task.time -= deltaTime; // task scheduler is for things that need to happen in sequence, but not necessarily every tick. like bomb explosions and stuff. you can call it from anywhere in the code with scheduleTask(ms, callback)

        if (task.time <= 0) {
            console.log("Blowing up task at:", task.onComplete);
            task.onComplete();
            TaskQueue.splice(i, 1); // Remove the completed task
        }
    }
    
}});
});
