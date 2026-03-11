import * as Playroom from "https://esm.sh/playroomkit";
import { Player } from './player.js';

export const remotePlayers = {};

export async function initMultiplayer(gridApi, assets, spawnPoint) {
    console.log("1. Starting initialization...");

    // 1. Initialize the library
    await Playroom.Multiplayer(); 
    
    // 2. THIS IS THE STEP YOU ARE MISSING!
    // If the overlay doesn't appear, you MUST call this to join the room.
    console.log("2. Calling insertCoin()...");
    await Playroom.insertCoin(); 

    console.log("3. Joined! Now waiting for players...");

    return new Promise((resolve) => {
        const handlePlayerJoin = (state) => {
            console.log("4. Player joined/found:", state.id); 
            
            const p = new Player(state.id, assets.player.idle, { loadedAssets: assets.loaded });
            p.place(gridApi, spawnPoint.x, spawnPoint.y);

            const me = Playroom.myPlayer();
            
            if (me && state.id === me.id) {
                resolve(me);
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