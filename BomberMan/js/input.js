import { TILE_PROPS } from './grid.js';
import { TILE_TYPE } from './grid.js';
import { scheduleTask, createBombSprite, destroyBombSprite } from './game.js';
import { triggerExplosion } from './GameItems/explosion.js';

export function bindArrowKeys(player, gridApi, options = {}) {
 
  // options: { repeatOnHold: boolean, repeatInterval: ms, activeBombs: array, loadedAssets: object }
  const repeatOnHold = !!options.repeatOnHold;
  const repeatInterval = options.repeatInterval || 180;
  const activeBombs = options.activeBombs;
  const loadedAssets = options.loadedAssets;
  const heldDirections = new Set();

  function getDirFromKey(rawKey) {
    const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
    if (key === 'arrowup' || key === 'w') return 'up';
    if (key === 'arrowdown' || key === 's') return 'down';
    if (key === 'arrowleft' || key === 'a') return 'left';
    if (key === 'arrowright' || key === 'd') return 'right';
    return null;
  }

  function attemptMove(direction) {
    if (player.isDead) return;
    if (!direction) return;
    if (player.isMoving) return; // wait until current move finishes

      const ox = player.x;           // old coords
      const oy = player.y;


    let nx = player.x;
    let ny = player.y;
    if (direction === 'up') ny = Math.max(0, player.y - 1);
    else if (direction === 'down') ny = Math.min(gridApi.rows - 1, player.y + 1);
    else if (direction === 'left') nx = Math.max(0, player.x - 1);
    else if (direction === 'right') nx = Math.min(gridApi.cols - 1, player.x + 1);
    if (nx === ox && ny === oy) return;
    if (!isWalkable(nx, ny)) return;

    // Capture original type at old position before moving
    const oldType = gridApi.getType(ox, oy);
    // Move the player sprite
    player.moveTo(gridApi, nx, ny);

  }


function isWalkable(x, y) {
    // 1. Safety check (same as before)
    if (y < 0 || y >= gridApi.map.length || x < 0 || x >= gridApi.map[y].length) {
        return false;
    }
    const rawCode = gridApi.map[y][x];

    // 3. TRANSLATE that number to the word (EMPTY, wall, box)
    const code2type = {
        0: TILE_TYPE.EMPTY,
        1: TILE_TYPE.wall,
        2: TILE_TYPE.box,
        3: TILE_TYPE.playerspawn,
        4: TILE_TYPE.powerup,
        5: TILE_TYPE.player1spot,
        6: TILE_TYPE.bomb,
    };
    
    const stringType = code2type[rawCode];

    // 4. Look up that word in your TILE_PROPS
    const props = TILE_PROPS[stringType];
    // console.log(`Trying to move to (${x}, ${y}) - Type: ${stringType}`, props);
    if (props && props.walkable === true) {
        return true;
    }

    // If we don't recognize it or it's not walkable
    // console.log("Blocked at:", x, y, "Type name:", stringType);
    return false;
}


  window.addEventListener('keydown', (e) => { // is for the movement keys, not the bomb key (space) which is handled in game.js
    const direction = getDirFromKey(e.key);
    if (!direction) return;
      heldDirections.add(direction); 
  });

  window.addEventListener('keyup', (e) => {
    const direction = getDirFromKey(e.key);
    if (!direction) return;

    // Remove it from our list
    heldDirections.delete(direction); 
  });



function processMovement() {
    // We prioritize movement order. 
    // If they hold multiple keys, which one wins? Usually up/down.
    
    if (heldDirections.has('up')) {
        attemptMove('up');
    } else if (heldDirections.has('down')) {
        attemptMove('down');
    } else if (heldDirections.has('left')) {
        attemptMove('left');
    } else if (heldDirections.has('right')) {
        attemptMove('right');
    }
}
window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
          e.preventDefault();

          if (player.isDead) return;
        
          // 1. Try to place the bomb and catch the data
          const bombData = player.placeBomb();


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

                  triggerExplosion(gridApi, bombData.x, bombData.y, 5, loadedAssets);
                  console.log(`Bomb at (${bombData.x}, ${bombData.y}) exploded. Removed from activeBombs.`);

              });
              
              
          } else {
              console.log("No bomb placed. activeBombs exists?", !!activeBombs);
          }
      }
  });


  
  return processMovement; 

}