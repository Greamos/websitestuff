import * as Playroom from "https://esm.sh/playroomkit";
import { Player } from './player.js';

export const remotePlayers = {};

export async function initMultiplayer(gridApi, assets, spawnPoint) {
    console.log("1. Starting initialization...");
    await Playroom.Multiplayer(); 
    
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
                resolve(me); // This is you
            } else {
                // This is a GHOST
                remotePlayers[state.id] = { state, object: p };

                // Instant Listener! (Notice the closed brackets at the end)
    state.onAfterStateChange(() => {
        const targetPos = state.getState("pos");
        if (targetPos) {
            // This now runs the millisecond the packet arrives!
            p.moveTo(gridApi, targetPos.x, targetPos.y, true);
        }
    });
}

            state.onQuit(() => {
                p.die();
                delete remotePlayers[state.id];
            });
        };

        Playroom.onPlayerJoin(handlePlayerJoin);
    });
}