import { TILE_TYPE, TILE_PROPS } from '../grid.js'; 
import { findBombAt, scheduleTask } from '../game.js';


export function triggerExplosion(gridApi, startX, startY, radius = 1) {
    const tilesOnFire = [];
    const playerPos = gridApi.getPlayerCoords();
    let playerHit = false; 

    // 1. Add the center
    tilesOnFire.push({ x: startX, y: startY });

    // 2. Define the directions array HERE (or keep it outside)
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
            
            // 1. Absolute Blockers
            if (tileType === TILE_TYPE.wall) break; 
            
            // 2. Destructibles (Boxes & Bombs)
            if (tileType === TILE_TYPE.box || tileType === TILE_TYPE.bomb) {
                hitTiles.push({ x: checkX, y: checkY });
                
                // If it's a bomb, trigger it!
                if (tileType === TILE_TYPE.bomb) {
                    const bomb = findBombAt(checkX, checkY);
                    if (bomb) {
                        bomb.fuse = 0; // This triggers the chain reaction
                    }
                }
                break; // Fire stops here because it hit something
            }
            
            // 3. Pass-through tiles
            if (tileType === TILE_TYPE.EMPTY || tileType === TILE_TYPE.powerup || tileType === TILE_TYPE.explosion) {
                hitTiles.push({ x: checkX, y: checkY });
                // We do NOT break here; fire continues to the next tile
            } else {
                break; // Stop on anything else
            }
        }
        return hitTiles;
    }

    // 4. Run the helper for each direction and add to main list
    for (const dir of directions) {
        const hits = CalcFireDirection(dir);
        tilesOnFire.push(...hits); // The ... adds all items from hits into tilesOnFire
    }

    // --- Draw the Fire ---
    for (const tile of tilesOnFire) {
        gridApi.setType(tile.x, tile.y, TILE_TYPE.explosion);
    }
    // Check if player is in explosion
    
    for (const tile of tilesOnFire) {
    if (playerPos && tile.x === playerPos.x && tile.y === playerPos.y) {
        console.log("Player is in the fire!");
        playerHit = true; // mark for death on cleanup
    }
}



    // --- Cleanup ---
    scheduleTask(500, () => {
        for (const tile of tilesOnFire) {
            // Only set back to empty if it is currently still fire
            if (gridApi.isType(tile.x, tile.y, TILE_TYPE.explosion)) {
                gridApi.setType(tile.x, tile.y, TILE_TYPE.EMPTY);
            }
        }
        if (playerHit && typeof gridApi.killPlayer === 'function') {
            gridApi.killPlayer();
        }
    });
}