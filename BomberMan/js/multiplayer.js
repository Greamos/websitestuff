import * as Playroom from "https://esm.sh/playroomkit";
import { Player } from './player.js';

export const remotePlayers = {};

export async function initMultiplayer(gridApi, assets, spawnPoint) {
    await Playroom.Multiplayer(); 
    await Playroom.insertCoin(); 

    return new Promise((resolve) => {
        const handlePlayerJoin = (state) => {
            console.log("Player joined/found:", state.id); 
            
            const p = new Player(state.id, assets.player.idle, { loadedAssets: assets.loaded });
            p.place(gridApi, spawnPoint.x, spawnPoint.y);

            const me = Playroom.myPlayer();
            
            if (me && state.id === me.id) {
                // IT IS YOU! Resolve the promise so game.js can continue
                resolve(me);
            } else {
                // IT IS A GHOST! Save it for the sync loop
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