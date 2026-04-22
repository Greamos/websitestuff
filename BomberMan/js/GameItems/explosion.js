import { TILE_TYPE } from '../grid.js'; 
import { findBombAt, scheduleTask } from '../game.js';
import { ExplosionSprite } from './explosion-sprite.js';
import { setState } from "https://esm.sh/playroomkit";


export const RememberSpotMap = new Map();
export function triggerExplosion(gridApi, startX, startY, radius = 1, loadedAssets = null) {
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

            const tileType = gridApi.getType(checkX, checkY);

            if (tileType === TILE_TYPE.wall) break;

            const nextTile = gridApi.getType(checkX + dir.dx, checkY + dir.dy);
            const isTip = (i === radius) || (nextTile === TILE_TYPE.wall) || (nextTile === undefined);

            if (tileType === TILE_TYPE.box) {
    // 1. Add it to the fire list so the sprite appears!
    hitTiles.push({ x: checkX, y: checkY, stage: 'directional', dirName: dir.name }); 

    // 2. Set the tile to explosion visually
    gridApi.setType(checkX, checkY, TILE_TYPE.explosion);

    // 3. Put the FUTURE type into the RememberSpotMap
    // When the explosion cleanup runs, it will see this and set it to playerspawn
    RememberSpotMap.set(`${checkX},${checkY}`, TILE_TYPE.playerspawn);

    console.log("Box hit! Fire started. Scheduled to become spawn point.");

    // 4. Stop the beam from going FURTHER (but the box itself is now fire)
    break; 
}
            if (tileType === TILE_TYPE.bomb) {
                const bomb = findBombAt(checkX, checkY);
                if (bomb && bomb.task) bomb.task.time = 250;
                break; 
            }
            
            if (tileType === TILE_TYPE.playerspawn || tileType === TILE_TYPE.player1spot) { //HIER POWER UP STUFF TOEVOEGEENNNN!!//

                console.log("this is data", gridApi.getType(checkX, checkY));

                RememberSpotMap.set(`${checkX},${checkY}`, gridApi.getType(checkX, checkY)); // store original type before explosion
                console.log("remember spot", RememberSpotMap);
                hitTiles.push({ x: checkX, y: checkY, stage: 'directional', dirName: dir.name });
                break; 
            }
            

            if (tileType === TILE_TYPE.EMPTY || tileType === TILE_TYPE.powerup || tileType === TILE_TYPE.explosion) {
                hitTiles.push({ x: checkX, y: checkY, stage: isTip ? 'directional' : 'middle', dirName: dir.name });
                if (nextTile === TILE_TYPE.box) continue;
            } else {

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

    // 2. SMART CENTER LOGIC
    // Check which axes have fire
    const hasVertical = fireResults.up.length > 0 || fireResults.down.length > 0;
    const hasHorizontal = fireResults.left.length > 0 || fireResults.right.length > 0;

    let centerStage = 'center'; // Default to the Cross (Row 0)
    let centerDir = null;

    // If it's ONLY vertical fire, use the vertical beam (Row 1 rotated)
    if (hasVertical && !hasHorizontal) {
        centerStage = 'middle';
        centerDir = 'up'; 
    } 
    // If it's ONLY horizontal fire, use the horizontal beam (Row 1)
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
        gridApi.setType(tile.x, tile.y, TILE_TYPE.explosion);
    }

    // Check if player hit
    const allTiles = [{x: startX, y: startY}, ...tilesOnFire];
    for (const tile of allTiles) {
        if (playerPos && tile.x === playerPos.x && tile.y === playerPos.y) playerHit = true;
    }

    // Cleanup
    scheduleTask(1100, () => {      // bug! player spawn gets cleaned.. is that here? //
        for (const sprite of explosionSprites) sprite.destroy();
        let mapChanged = false;
        for (const tile of allTiles) {
           if (gridApi.isType(tile.x, tile.y, TILE_TYPE.explosion)) {
    const coordKey = `${tile.x},${tile.y}`;
    
    // Check if THIS specific coordinate was a spawn point
    if (RememberSpotMap.has(coordKey)) {
        const originalType = RememberSpotMap.get(coordKey);
        gridApi.setType(tile.x, tile.y, originalType);
        RememberSpotMap.delete(coordKey); // Clear it after restoring
        console.log("Restored special tile:", originalType);
    } else {
        // Otherwise, it was just a normal floor/box, set to empty
        gridApi.setType(tile.x, tile.y, TILE_TYPE.EMPTY);
    }
    mapChanged = true;
}
        }
        if (mapChanged) setState("map", gridApi.map, true); // this updates map for everyone, which is important if boxes were destroyed
        if (playerHit && typeof gridApi.killPlayer === 'function') gridApi.killPlayer(); // kils player if they were hit
    });
}