import { TILE_TYPE, TILE_PROPS } from '../grid.js'; 
import { findBombAt, scheduleTask } from '../game.js';
import { setState, isHost } from "https://esm.sh/playroomkit";


export function triggerExplosion(gridApi, startX, startY, radius = 1) {
    const tilesOnFire = [];
    const playerPos = gridApi.getPlayerCoords();
    let playerHit = false; 

    // 1. Add the center (The tile the bomb was actually on)
    tilesOnFire.push({ x: startX, y: startY });

    const directions = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];

    // 3. Define the helper
    function CalcFireDirection(dir) {
        const hitTiles = [];
        for (let i = 1; i <= radius; i++) {
            const checkX = startX + (i * dir.dx);
            const checkY = startY + (i * dir.dy);
            
            const tileType = gridApi.getType(checkX, checkY);
            
            // A. Stop immediately if we hit a permanent wall
            if (tileType === TILE_TYPE.wall) break; 
            
            // B. If we hit a BOX: Add it to the fire list (to destroy it) and STOP
            if (tileType === TILE_TYPE.box) {
                hitTiles.push({ x: checkX, y: checkY });
                break; 
            }

            // C. THE FIX: If we hit another BOMB
            if (tileType === TILE_TYPE.bomb) {
                const bomb = findBombAt(checkX, checkY);

                        console.log("DEBUG 2: Fire hit a bomb tile. Found bomb object?", !!bomb, "Does it have a task?", bomb ? !!bomb.task : "N/A");

                if (bomb && bomb.task) {
                    // set timer for the bombs to explode if exploded by another bomb's fire.
                    bomb.task.time = 250; 

                            
                }
                break; 
            }
            
            // D. If it's a pass-through tile (Empty, Powerup, or already Fire)
            if (tileType === TILE_TYPE.EMPTY || tileType === TILE_TYPE.powerup || tileType === TILE_TYPE.explosion) {
                hitTiles.push({ x: checkX, y: checkY });
            } else {
                // Stop if we hit anything else (like a player spot)
                break; 
            }
        }
        return hitTiles;
    }

    // 4. Run the helper for each direction and add to main list
    for (const dir of directions) {
        const hits = CalcFireDirection(dir);
        tilesOnFire.push(...hits); 
    }

    // --- Draw the Fire ---
    for (const tile of tilesOnFire) {
        gridApi.setType(tile.x, tile.y, TILE_TYPE.explosion);
    }

    // Check if player is in explosion
    for (const tile of tilesOnFire) {
        if (playerPos && tile.x === playerPos.x && tile.y === playerPos.y) {
            console.log("Player is in the fire!");
            playerHit = true; 
        }
    }

    // --- Cleanup ---
     scheduleTask(500, () => {
        // 1. Declare the variable correctly (lowercase)
        let mapChanged = false;

        for (const tile of tilesOnFire) {
            if (gridApi.isType(tile.x, tile.y, TILE_TYPE.explosion)) {
                gridApi.setType(tile.x, tile.y, TILE_TYPE.EMPTY);
                // 2. We set it to true so we know something changed
                mapChanged = true; 
            }
        }

        // 3. MOVE THIS OUTSIDE THE LOOP (The Sync Logic)
        // We only tell the network ONCE after all tiles are cleared
        if (mapChanged && isHost()) {
            console.log("Map updated! Saving to Playroom state...");
            setState("map", gridApi.map, true);
        }

        // 4. Handle player death
        if (playerHit && typeof gridApi.killPlayer === 'function') {
            gridApi.killPlayer();
        }
    });
}