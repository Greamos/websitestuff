import * as Playroom from "https://esm.sh/playroomkit";
import { Player } from './player.js';
import { findAllSpawns } from './grid.js'; 

export const remotePlayers = {};

export async function initMultiplayer(gridApi, assets) {
    await Playroom.insertCoin(); 
    const joinedOrder = [];

    return new Promise((resolve) => {
        const handlePlayerJoin = (state) => {
            console.log("Player joined:", state.id); 

            // 1. Get spawns safely
            const currentMap = gridApi.map || [];
            const allSpawns = findAllSpawns(currentMap);
            
            // 2. Track order
            if (!joinedOrder.includes(state.id)) { joinedOrder.push(state.id); }
            const playerIndex = joinedOrder.indexOf(state.id);
            
            // 3. Pick corner (TL, BR, TR, BL)
            const cornerOrder = [0, 3, 1, 2]; 
            const spawnPoint = allSpawns.length > 0 
                ? allSpawns[cornerOrder[playerIndex % allSpawns.length]] 
                : {x: 1, y: 1}; // Fallback if map fails

            // assigning a color for the player based on their join order (can be used in the Player class to tint the sprite)
            const hueValues = [0, 120, 240, 60];
            const playerHue = hueValues[playerIndex % hueValues.length];


            // 4. Create Player
            const p = new Player(state.id, assets.player.idle, { loadedAssets: assets.loaded , myNetState: state, hue: playerHue});
            p.place(gridApi, spawnPoint.x, spawnPoint.y);

            // 5. Identify Local Player
            const me = Playroom.myPlayer();
            if (me && state.id === me.id) {
                resolve({ myNetState: me, player: p });
            } else {
                remotePlayers[state.id] = { state, object: p };
            }

            state.onQuit(() => {
                p.die();
                delete remotePlayers[state.id];
            });
        };

        Playroom.onPlayerJoin(handlePlayerJoin);
    });
}