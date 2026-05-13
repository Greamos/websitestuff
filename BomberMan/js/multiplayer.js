//https://dev.joinplayroom.com/Y5S529aaN1UQIwqHsAd9/configuration


import * as Playroom from "https://esm.sh/playroomkit";
import { playerv2 } from './PlayerV2.js';
import { findAllSpawns } from './grid.js'; 

export const remotePlayers = {};

export async function initMultiplayer(gridApi, assets, options = {}) {
    const hueValues = [0, 120, 240, 60];
    const handledPlayerIds = new Set(); // Prevent duplicate handling

    await Playroom.insertCoin({ gameId: "Y5S529aaN1UQIwqHsAd9", matchmaking: true });

    const getSpawnForPlayer = (playerId) => {
        const currentMap = gridApi.map || [];
        const allSpawns = findAllSpawns(currentMap);
        
        if (allSpawns.length === 0) {
            return { point: {x: 1, y: 1}, hue: hueValues[0] };
        }

        // Deterministic spawn: hash the player ID so ALL clients always
        // pick the same spawn for a given player, regardless of join order/timing.
        let hash = 0;
        for (let i = 0; i < playerId.length; i++) {
            hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
            hash |= 0; // Convert to 32-bit int
        }
        const absHash = Math.abs(hash);

        const spawnIdx = absHash % allSpawns.length;
        const hueIdx = absHash % hueValues.length;

        return {
            point: allSpawns[spawnIdx],
            hue: hueValues[hueIdx]
        };
    };

    return new Promise((resolve) => {
        const handlePlayerJoin = (state) => {
            // Skip if we've already handled this player ID
            if (handledPlayerIds.has(state.id)) {
                console.log("Player already handled, skipping:", state.id);
                return;
            }
            handledPlayerIds.add(state.id);
            console.log("Player joined:", state.id);

            const { point: spawnPoint, hue: playerHue } = getSpawnForPlayer(state.id);

            // Reset death state from any previous session (prevents immediate re-death)
            state.setState("isDead", false, true);

            // Create the player object
            const p = new playerv2(state.id, assets.player.idle, {
                loadedAssets: assets.loaded,
                myNetState: state,
                hue: playerHue
            });
            p.place(gridApi, spawnPoint.x, spawnPoint.y);

            state.onQuit(() => {
                p.die();
                delete remotePlayers[state.id];
                handledPlayerIds.delete(state.id); // Allow re-handling on reconnect
            });

            // Identify Local Player
            const me = Playroom.myPlayer();
            if (me && state.id === me.id) {
                resolve({ myNetState: me, player: p });
            } else {
                remotePlayers[state.id] = { state, object: p };
            }
        };

        Playroom.onPlayerJoin(handlePlayerJoin);
    });
}