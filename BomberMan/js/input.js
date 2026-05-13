// import { TILE_PROPS, TILE_TYPE  } from './grid.js'; // DEAD: only used by old isWalkable()
import { scheduleTask, createBombSprite, destroyBombSprite,} from './game.js';
import { SummonEffect, EFFECT_TYPES } from './GameItems/powerup.js';
import { triggerExplosion } from './GameItems/explosion.js';
// import { RPC } from "https://esm.sh/playroomkit"; // DEAD: only used by old attemptMove()

export function bindArrowKeys(player, gridApi, options = {}) {
 
  // options: { activeBombs: array, loadedAssets: object }
  const activeBombs = options.activeBombs;
  const loadedAssets = options.loadedAssets;

  // ===== DEAD CODE: Old grid-based movement system =====
  // Replaced by PlayerV2.update() pixel-level movement in the tick loop.
  // Keeping commented out for reference until cleanup is confirmed.
  //
  // const repeatOnHold = !!options.repeatOnHold;
  // const repeatInterval = options.repeatInterval || 180;
  // const heldDirections = new Set();
  //
  // function getDirFromKey(rawKey) { ... }
  // function attemptMove(direction) { ... }
  // function isWalkable(x, y) { ... }
  // window.addEventListener('keydown', ...)  // heldDirections.add
  // window.addEventListener('keyup', ...)    // heldDirections.delete
  // function processMovement() { ... }
  // ======================================================
window.addEventListener('keydown', (e) => {
    if (e.key === 'p') { // Press 'P' to increase fire
        player.bombRadius += 1;
        console.log("New radius:", player.bombRadius);
    }
});


window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
          e.preventDefault();

          if (player.isDead) return;
        
          // 1. Try to place the bomb and catch the data
          const locationcheck = gridApi.getType(player.x, player.y);
          const bombData = player.placeBomb();
            console.log(locationcheck);

          // 2. ONLY proceed if the bomb was successfully placed
          if (bombData) {
              console.log('Adding bomb to activeBombs list:', bombData);
              activeBombs.push(bombData);
              
              // Create bomb sprite
              createBombSprite(bombData.x, bombData.y, gridApi, loadedAssets);

                bombData.task = scheduleTask(3000, () => { // bomb stuff

                  const index = activeBombs.indexOf(bombData);
                  if (index !== -1) {
                      activeBombs.splice(index, 1);
                  }
                  
                  // Destroy bomb sprite
                  destroyBombSprite(bombData.x, bombData.y);

                  if (player.myNetState) {
                    player.myNetState.setState("bomb", null);
                }   

                  triggerExplosion(gridApi, bombData.x, bombData.y, bombData.radius, loadedAssets);
                  console.log(`Bomb at (${bombData.x}, ${bombData.y}) exploded. Removed from activeBombs. (${bombData.radius} radius explosion)`);

              });
              
              
          } else {
              console.log("No bomb placed. activeBombs exists?", !!activeBombs);
          }
      }
  });


  window.addEventListener('keydown', (e) => { //TEMP TO CHECK
      if (e.code === 'KeyE') {
          e.preventDefault();

        console.log("E key pressed");
        SummonEffect(EFFECT_TYPES.FIRE_UP, player, gridApi, options.loadedAssets);
      }
  });
        

            // return processMovement; // DEAD: old grid movement, replaced by PlayerV2.update() in tick loop
        }

