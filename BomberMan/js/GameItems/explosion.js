import { TILE_TYPE } from '../grid.js'; 
import { findBombAt, scheduleTask } from '../game.js';
import { ExplosionSprite } from './explosion-sprite.js';
import { setState, isHost, RPC } from "https://esm.sh/playroomkit";

// Keep this export so other files (like player.js) don't break
export const RememberSpotMap = new Map();

export function triggerExplosion(gridApi, startX, startY, radius = 1, loadedAssets = null) {
    // This local map belongs ONLY to this specific explosion instance.
    // This prevents overlapping bombs from "forgetting" what they hit.
    const LocalExplosionMemory = new Map();
    const tilesOnFire = [];

    const playerPos = gridApi.getPlayerCoords();
    let playerHit = false; 

    const directions = [
        { name: 'up',    dx: 0,  dy: -1 },
        { name: 'down',  dx: 0,  dy: 1 },
        { name: 'left',  dx: -1, dy: 0 },
        { name: 'right', dx: 1,  dy: 0 }
    ];

    // Helper to calculate fire for one direction
    function CalcFireDirection(dir) {
        const hitTiles = [];
    
        for (let i = 1; i <= radius; i++) {
            const checkX = startX + (i * dir.dx);
            const checkY = startY + (i * dir.dy);
            const coordKey = `${checkX},${checkY}`;

            const tileType = gridApi.getType(checkX, checkY);

            // 1. Stop at permanent walls
            if (tileType === TILE_TYPE.wall) break;

            // 2. Remember the original tile before it turns into fire
            // Only remember if we haven't seen this tile yet and it's not already fire
            if (!LocalExplosionMemory.has(coordKey) && tileType !== TILE_TYPE.explosion) {
                LocalExplosionMemory.set(coordKey, tileType);
            }

            const nextTile = gridApi.getType(checkX + dir.dx, checkY + dir.dy);
            const isTip = (i === radius) || (nextTile === TILE_TYPE.wall) || (nextTile === undefined);

            // 3. Handle Boxes
            if (tileType === TILE_TYPE.box) {
                hitTiles.push({ x: checkX, y: checkY, stage: 'directional', dirName: dir.name }); 
                gridApi.setType(checkX, checkY, TILE_TYPE.explosion);

                // Mark specifically that a box was destroyed here
                LocalExplosionMemory.set(coordKey, "BOX_DESTROYED");

                console.log(`Box hit at (${checkX}, ${checkY})`);
                break; // Stop the beam
            }

            // 4. Handle Chain Reactions (Bomb triggers bomb)
            if (tileType === TILE_TYPE.bomb) {
                const bomb = findBombAt(checkX, checkY);
                if (bomb && bomb.task) bomb.task.time = 250; // Explode soon
                break; 
            }
            
            // 5. Special Tiles (Spawns, Powerups)
            if (tileType === TILE_TYPE.playerspawn || tileType === TILE_TYPE.player1spot || tileType === TILE_TYPE.powerup) {
                hitTiles.push({ x: checkX, y: checkY, stage: 'directional', dirName: dir.name });
                gridApi.setType(checkX, checkY, TILE_TYPE.explosion);
                break; 
            }
            
            // 6. Empty space / Ongoing explosion
            if (tileType === TILE_TYPE.EMPTY || tileType === TILE_TYPE.explosion) {
                hitTiles.push({ x: checkX, y: checkY, stage: isTip ? 'directional' : 'middle', dirName: dir.name });
                gridApi.setType(checkX, checkY, TILE_TYPE.explosion);
                if (nextTile === TILE_TYPE.box) continue;
            }
        }
        return hitTiles;
    }

    // 1. Calculate fire for all 4 directions
    const fireResults = { up: [], down: [], left: [], right: [] };
    for (const dir of directions) {
        fireResults[dir.name] = CalcFireDirection(dir);
        tilesOnFire.push(...fireResults[dir.name]);
    }

    // 2. Center Logic
    const hasVertical = fireResults.up.length > 0 || fireResults.down.length > 0;
    const hasHorizontal = fireResults.left.length > 0 || fireResults.right.length > 0;

    let centerStage = 'center'; 
    let centerDir = null;

    if (hasVertical && !hasHorizontal) {
        centerStage = 'middle';
        centerDir = 'up'; 
    } 
    else if (hasHorizontal && !hasVertical) {
        centerStage = 'middle';
        centerDir = 'right';
    }

    const explosionSprites = [];
    
    // 3. Create Center Sprite
    const centerSprite = new ExplosionSprite(startX, startY, centerDir, centerStage, { loadedAssets, gridApi });
    centerSprite.render(gridApi);
    explosionSprites.push(centerSprite);
    gridApi.setType(startX, startY, TILE_TYPE.explosion);

    // 4. Create Directional Sprites
    for (const tile of tilesOnFire) {
        const sprite = new ExplosionSprite(tile.x, tile.y, tile.dirName, tile.stage, { loadedAssets, gridApi });
        sprite.render(gridApi);
        explosionSprites.push(sprite);
    }

    // 5. Check if local player was hit
    const allTiles = [{x: startX, y: startY}, ...tilesOnFire];
    for (const tile of allTiles) {
        if (playerPos && tile.x === playerPos.x && tile.y === playerPos.y) playerHit = true;
    }

    // 6. Cleanup Logic
    scheduleTask(1100, () => {
        for (const sprite of explosionSprites) sprite.destroy();
        
        let mapChanged = false;

        for (const tile of allTiles) {
            const coordKey = `${tile.x},${tile.y}`;
            
            // CRITICAL BUG FIX: Only clean up if the tile is STILL an explosion.
            // If another bomb already cleaned this tile and put a powerup there, 
            // we should not touch it!
            if (gridApi.getType(tile.x, tile.y) !== TILE_TYPE.explosion) {
                continue; 
            }

            // Restore logic
            if (LocalExplosionMemory.has(coordKey)) {
                const originalType = LocalExplosionMemory.get(coordKey);

                if (originalType === "BOX_DESTROYED") {
                    // Only the Host decides what drops from a box to prevent desyncs
                    if (isHost()) {
                        const dropsPowerup = Math.random() < 0.35; // 35% chance
                        const finalType = dropsPowerup ? TILE_TYPE.powerup : TILE_TYPE.EMPTY;
                        
                        gridApi.setType(tile.x, tile.y, finalType);
                        // Tell everyone else what we decided
                        RPC.call("updateTile", { x: tile.x, y: tile.y, type: finalType });
                    }
                } else {
                    // Restore spawn points, empty grass, or whatever was there
                    gridApi.setType(tile.x, tile.y, originalType);
                }
            } else {
                // Default fallback: Grass
                gridApi.setType(tile.x, tile.y, TILE_TYPE.EMPTY);
            }
            mapChanged = true;
        }

        // Only the host needs to save the permanent room map state
        if (mapChanged && isHost()) {
            setState("map", gridApi.map, true);
        }
        
        if (playerHit && typeof gridApi.killPlayer === 'function') {
            gridApi.killPlayer();
        }
    });
}