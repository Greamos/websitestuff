import { TILE_TYPE } from '../grid.js'; 
import { findBombAt, scheduleTask } from '../game.js';
import { ExplosionSprite } from './explosion-sprite.js';
import { setState, isHost, RPC } from "https://esm.sh/playroomkit";

// Keep this export so other files (like player.js) don't break
export const RememberSpotMap = new Map();

// Fire wave delay in ms between each distance ring (classic Bomberman uses ~100-150ms)
const FIRE_WAVE_DELAY = 100;

export function triggerExplosion(gridApi, startX, startY, radius = 1, loadedAssets = null) {
    // This local map belongs ONLY to this specific explosion instance.
    // This prevents overlapping bombs from "forgetting" what they hit.
    const LocalExplosionMemory = new Map();

    const directions = [
        { name: 'up',    dx: 0,  dy: -1 },
        { name: 'down',  dx: 0,  dy: 1 },
        { name: 'left',  dx: -1, dy: 0 },
        { name: 'right', dx: 1,  dy: 0 }
    ];

    // =============================================
    // PHASE 1: Survey — calculate which tiles burn WITHOUT mutating the grid.
    // Each beam is an array of tile descriptors, index 0 = distance 1, index 1 = distance 2, etc.
    // =============================================
    const dirBeams = { up: [], down: [], left: [], right: [] };

    for (const dir of directions) {
        const beam = dirBeams[dir.name];

        for (let i = 1; i <= radius; i++) {
            const checkX = startX + (i * dir.dx);
            const checkY = startY + (i * dir.dy);
            const coordKey = `${checkX},${checkY}`;
            const tileType = gridApi.getType(checkX, checkY);

            // Stop at permanent walls or off-grid
            if (tileType === TILE_TYPE.wall || tileType === undefined) break;

            // Remember original tile (once) for cleanup
            if (!LocalExplosionMemory.has(coordKey) && tileType !== TILE_TYPE.explosion) {
                LocalExplosionMemory.set(coordKey, tileType);
            }

            const nextTile = gridApi.getType(checkX + dir.dx, checkY + dir.dy);
            const isTip = (i === radius) || (nextTile === TILE_TYPE.wall) || (nextTile === undefined);

            let stage = isTip ? 'directional' : 'middle';
            let stopsBeam = false;

            if (tileType === TILE_TYPE.box) {
                stage = 'directional';
                LocalExplosionMemory.set(coordKey, "BOX_DESTROYED");
                stopsBeam = true;
            } else if (tileType === TILE_TYPE.bomb) {
                const bomb = findBombAt(checkX, checkY);
                if (bomb && bomb.task) bomb.task.time = 250; // Chain reaction: explode soon
                stopsBeam = true;
            } else if (tileType === TILE_TYPE.playerspawn || tileType === TILE_TYPE.player1spot) {
                // Spawn points stop the beam (they're structural); powerups do NOT stop it
                stopsBeam = true;
            }

            beam.push({ x: checkX, y: checkY, stage, dirName: dir.name });

            if (stopsBeam) break;
        }
    }

    // How many waves? Center + longest beam
    const maxBeamLen = Math.max(0, ...Object.values(dirBeams).map(b => b.length));

    // Build a flat list of all tiles for cleanup (deduplicated)
    const allTiles = [{ x: startX, y: startY }];
    for (const dir of directions) {
        for (const t of dirBeams[dir.name]) {
            if (!allTiles.some(a => a.x === t.x && a.y === t.y)) {
                allTiles.push({ x: t.x, y: t.y });
            }
        }
    }

    // =============================================
    // PHASE 2: Center tile — always wave 0 (immediate)
    // =============================================
    const hasVertical = dirBeams.up.length > 0 || dirBeams.down.length > 0;
    const hasHorizontal = dirBeams.left.length > 0 || dirBeams.right.length > 0;

    let centerStage = 'center';
    let centerDir = null;
    if (hasVertical && !hasHorizontal) { centerStage = 'middle'; centerDir = 'up'; }
    else if (hasHorizontal && !hasVertical) { centerStage = 'middle'; centerDir = 'right'; }

    gridApi.setType(startX, startY, TILE_TYPE.explosion);
    const centerSprite = new ExplosionSprite(startX, startY, centerDir, centerStage, { loadedAssets, gridApi });
    centerSprite.render(gridApi);

    // waveSprites[waveIdx] = { sprites: [...], tiles: [{x,y}, ...] }
    // wave 0 = center, wave 1 = distance 1 ring, etc.
    const waveSprites = [{ sprites: [centerSprite], tiles: [{ x: startX, y: startY }] }];

    // Check center hit immediately
    const playerPos = gridApi.getPlayerCoords();
    if (playerPos && startX === playerPos.x && startY === playerPos.y) {
        if (typeof gridApi.killPlayer === 'function') gridApi.killPlayer();
    }

    // =============================================
    // PHASE 3: Schedule waves — each distance ring fires after a delay (spread outward)
    // =============================================
    for (let wave = 0; wave < maxBeamLen; wave++) {
        const waveTiles = [];
        for (const dir of directions) {
            const beam = dirBeams[dir.name];
            if (wave < beam.length) {
                waveTiles.push(beam[wave]);
            }
        }

        if (waveTiles.length === 0) continue;

        const waveIdx = wave + 1; // wave 1 = distance 1, wave 2 = distance 2, etc.
        const waveDelay = waveIdx * FIRE_WAVE_DELAY;

        // Pre-allocate the wave slot so we can push sprites into it from the callback
        waveSprites[waveIdx] = { sprites: [], tiles: waveTiles.map(t => ({ x: t.x, y: t.y })) };

        scheduleTask(waveDelay, () => {
            for (const tile of waveTiles) {
                gridApi.setType(tile.x, tile.y, TILE_TYPE.explosion);
                const sprite = new ExplosionSprite(tile.x, tile.y, tile.dirName, tile.stage, { loadedAssets, gridApi });
                sprite.render(gridApi);
                waveSprites[waveIdx].sprites.push(sprite);

                // Check if player is standing on this tile right as the fire arrives
                const currentPos = gridApi.getPlayerCoords();
                if (currentPos && tile.x === currentPos.x && tile.y === currentPos.y) {
                    if (typeof gridApi.killPlayer === 'function') gridApi.killPlayer();
                }
            }
        });
    }

    // =============================================
    // PHASE 4: Cleanup — fire shrinks in reverse waves (outermost first, center last)
    // Fire stays at full size for 1100ms, then recedes at FIRE_WAVE_DELAY per ring.
    // =============================================

    /** Restores a single tile to its original (or default) type */
    function restoreTile(tx, ty) {
        const key = `${tx},${ty}`;
        if (gridApi.getType(tx, ty) !== TILE_TYPE.explosion) return false;

        if (LocalExplosionMemory.has(key)) {
            const original = LocalExplosionMemory.get(key);
            if (original === "BOX_DESTROYED") {
                if (isHost()) {
                    const dropsPowerup = Math.random() < 0.35;
                    const finalType = dropsPowerup ? TILE_TYPE.powerup : TILE_TYPE.EMPTY;
                    gridApi.setType(tx, ty, finalType);
                    RPC.call("updateTile", { x: tx, y: ty, type: finalType });
                }
            } else {
                gridApi.setType(tx, ty, original);
            }
        } else {
            gridApi.setType(tx, ty, TILE_TYPE.EMPTY);
        }
        return true;
    }

    // Time until the fire starts shrinking (full fire visible for this duration)
    const fullFirePause = 1100;
    const totalWaves = waveSprites.length; // includes center (wave 0)
    // When does each wave start shrinking? Wave (totalWaves-1) at fullFirePause, then each inner wave +FIRE_WAVE_DELAY later
    const shrinkStart = maxBeamLen * FIRE_WAVE_DELAY + fullFirePause;

    for (let w = totalWaves - 1; w >= 0; w--) {
        const reverseWave = (totalWaves - 1) - w; // 0 = outermost, 1 = next, ..., last = center
        const shrinkDelay = shrinkStart + reverseWave * FIRE_WAVE_DELAY;

        scheduleTask(shrinkDelay, () => {
            const wave = waveSprites[w];
            if (!wave) return;

            // Destroy sprites for this wave
            for (const sprite of wave.sprites) {
                sprite.destroy();
            }

            // Restore tiles for this wave
            let mapChanged = false;
            for (const tile of wave.tiles) {
                if (restoreTile(tile.x, tile.y)) mapChanged = true;
            }

            if (mapChanged && isHost()) {
                setState("map", gridApi.map, true);
            }
        });
    }
}