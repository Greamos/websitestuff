import { getState, setState, isHost } from "https://esm.sh/playroomkit"; 
import { Player } from './player.js';
import { Bomb } from './bomb.js';
import { bindArrowKeys } from './input.js';
import { assets, preloadAssets } from './assets.js';
import level1 from '../maps/Level1.js';
import {
  createGrid,
  buildFromMap,
  findAllSpawns,
  TILE_TYPE,
} from './grid.js';
import { startTick } from './tick.js';
import { initMultiplayer, remotePlayers } from './multiplayer.js';
import { triggerExplosion } from './GameItems/explosion.js';

const GRID_ID = 'game-grid';

// --- PERSISTENCE TRACKING ---
let lastNetX = null; 
let lastNetY = null;
const lastBombIds = {};
let mapSyncTimer = 0; // Timer for checking the room map

// --- GAME STATE ---
let hbTimer = 0;
let hbState = true;
export const ActiveBombArr = []; 
const activeBombSprites = new Map(); // Maps 'x,y' key to Bomb sprite instance
const TaskQueue = []; 

export function scheduleTask(ms, callback) {
  const newTask = { time: ms, onComplete: callback };
  TaskQueue.push(newTask);
  return newTask; 
}

export function getPlayerCoords() {
  const p = (typeof window !== 'undefined' && window.__game && window.__game.player) || null;
  if (!p || p.x == null || p.y == null) return null;
  return { x: p.x, y: p.y, id: p.id };
}

export function findBombAt(x, y) {
    return ActiveBombArr.find(b => b.x === x && b.y === y);
}

export function createBombSprite(x, y, gridApi, loadedAssets) {
  const key = `${x},${y}`;
  if (activeBombSprites.has(key)) {
    console.warn(`Bomb sprite already exists at (${x}, ${y})`);
    return;
  }
  
  const bomb = new Bomb(x, y, { gridApi, loadedAssets, duration: 3000 });
  bomb.render(gridApi);
  activeBombSprites.set(key, bomb);
}

export function destroyBombSprite(x, y) {
  const key = `${x},${y}`;
  const bomb = activeBombSprites.get(key);
  if (bomb) {
    bomb.destroy();
    activeBombSprites.delete(key);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Create the Grid API
    const gridApi = createGrid(GRID_ID, 10, 10);
    gridApi.map = level1.map(row => row.slice());
    // 2. Preload Assets
    const loaded = await preloadAssets(assets);

    // 3. Connect to Multiplayer
    console.log("Connecting to Playroom...");
    const { myNetState, player } = await initMultiplayer(gridApi, { player: assets.player, loaded: loaded });
    
    // 4. PERSISTENT MAP LOGIC: Load from Room State
    const savedMap = getState("map");
    let gameMap;

    if (savedMap) {
        console.log("Found saved map! Loading current world state...");
        gameMap = savedMap;
    } else {
        console.log("No saved map found. Using original Level 1.");
        gameMap = level1.map(row => row.slice());
        
        // Host sets the initial state for the room
        if (isHost()) {
            setState("map", gameMap, true);
        }
    }

    // 5. Build Visuals
    gridApi.map = gameMap;
    buildFromMap(gridApi, gameMap);

    // 6. Bind Inputs
    const updateMovement = bindArrowKeys(player, gridApi, { activeBombs: ActiveBombArr, loadedAssets: loaded });

    // Global reference for debugging
    window.__game = { gridApi, player, assetsLoaded: loaded, myNetState }; 

    // 7. Start the Loop
    startTick((deltaTime) => {
        if (!player) return; 

        // 0. Update local player movement
        updateMovement(); 

        // 1. UPLOAD (Your position to others)
        if (myNetState && (player.x !== lastNetX || player.y !== lastNetY)) {
            myNetState.setState("pos", { x: player.x, y: player.y }, false);
            lastNetX = player.x; lastNetY = player.y;
        }

        // 2. DOWNLOAD (Sync other players)
        for (const id in remotePlayers) {
            const { state, object } = remotePlayers[id];
            
            // A. Sync Death
            const isRemoteDead = state.getState("isDead");
            if (isRemoteDead) {
                if (!object.isDead) object.die();
                continue; 
            }

            // B. Sync Movement
            const targetPos = state.getState("pos");
            if (targetPos && (object.x !== targetPos.x || object.y !== targetPos.y)) {
                object.moveTo(gridApi, targetPos.x, targetPos.y, true);
            }

            // C. Sync Bombs
            const remoteBomb = state.getState("bomb");
            if (remoteBomb) {
                // This will only print if you use an INCOGNITO window for the second player!
                console.log(`Network Data Found for Player ${id}:`, remoteBomb.id);

                if (remoteBomb.id !== lastBombIds[id]) {
                    console.log("!!! NEW REMOTE BOMB DETECTED !!!");
                    lastBombIds[id] = remoteBomb.id;
                    
                    gridApi.setType(remoteBomb.x, remoteBomb.y, TILE_TYPE.bomb);
                    ActiveBombArr.push({x: remoteBomb.x, y: remoteBomb.y});
                    
                    // Create bomb sprite
                    createBombSprite(remoteBomb.x, remoteBomb.y, gridApi, loaded);

                    scheduleTask(3000, () => {
                        triggerExplosion(gridApi, remoteBomb.x, remoteBomb.y, 1, loaded);
                        destroyBombSprite(remoteBomb.x, remoteBomb.y);
                        const index = ActiveBombArr.findIndex(b => b.x === remoteBomb.x && b.y === remoteBomb.y);
                        if (index !== -1) ActiveBombArr.splice(index, 1);
                    });
                }
            }
        }



                // 4. Update the MS display
                const msElement = document.getElementById('ms-display');
                if (msElement) msElement.innerText = deltaTime.toFixed(2) + "ms";

                // 5. Heartbeat Light Logic
                hbTimer += deltaTime;
                if (hbTimer > 500) { 
                    hbTimer = 0;     
                    hbState = !hbState; 
                    const l1 = document.getElementById('light-1');
                    const l2 = document.getElementById('light-2');
                    if (l1 && l2) {
                        if (hbState) { l1.classList.add('active'); l2.classList.remove('active'); }
                        else { l1.classList.remove('active'); l2.classList.add('active'); }
                    }
                }

                // 6. Task queue (Explosions timer)
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
