import { TILE_PROPS } from './grid.js';
import { TILE_TYPE } from './grid.js';
import { scheduleTask } from './game.js';

export function bindArrowKeys(player, gridApi, options = {}) {
 
 
 
  // options: { repeatOnHold: boolean, repeatInterval: ms }
  const repeatOnHold = !!options.repeatOnHold;
  const repeatInterval = options.repeatInterval || 180;
  const activeBombs = options.activeBombs;

  let activeKey = null;
  let repeatTimer = null;

  function getDirFromKey(rawKey) {
    const key = rawKey.length === 1 ? rawKey.toLowerCase() : rawKey;
    if (key === 'arrowup' || key === 'w') return 'up';
    if (key === 'arrowdown' || key === 's') return 'down';
    if (key === 'arrowleft' || key === 'a') return 'left';
    if (key === 'arrowright' || key === 'd') return 'right';
    return null;
  }

  function attemptMove(direction) {
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
    console.log(`Trying to move to (${x}, ${y}) - Type: ${stringType}`, props);
    if (props && props.walkable === true) {
        return true;
    }

    // If we don't recognize it or it's not walkable
    console.log("Blocked at:", x, y, "Type name:", stringType);
    return false;
}

  window.addEventListener('keydown', (e) => {
    const direction = getDirFromKey(e.key);
    if (!direction) return;
    e.preventDefault();

    if (!repeatOnHold) {
      attemptMove(direction);
      return;
    }

    // repeat-on-hold behavior
    if (activeKey && activeKey !== direction) {
      // different key pressed while holding another
      // clear previous
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
      activeKey = null;
    }

    if (!activeKey) {
      activeKey = direction;
      attemptMove(direction);
      repeatTimer = setInterval(() => attemptMove(direction), repeatInterval);
    }
  });

  window.addEventListener('keydown', (e) => {
    const direction = getDirFromKey(e.key);
      if (!direction) return;
      if (activeKey === direction) {
        activeKey = null;
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
    }
  });

 window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();

        // 1. Try to place the bomb and catch the data
        const bombData = player.placeBomb();

        // 2. ONLY proceed if the bomb was successfully placed
        if (bombData && activeBombs) {
            console.log('Adding bomb to activeBombs list:', bombData);
            
            // Add to the solid objects list (so people can't walk through it)
            activeBombs.push(bombData);

            // 3. Schedule the explosion task
            // This stays "packaged" here and runs in 3 seconds
            scheduleTask(3000, () => {
                console.log('Task Triggered: Clearing bomb at', bombData.x, bombData.y);
                
                // Clear visual on the grid
                gridApi.setType(bombData.x, bombData.y, TILE_TYPE.EMPTY);

                // Remove from the solid objects list
                const index = activeBombs.indexOf(bombData);
                if (index !== -1) {
                    activeBombs.splice(index, 1);
                }
            });
            
        } else {
            // This runs if player.placeBomb() returned null (e.g., standing on a wall)
            console.log("No bomb placed. activeBombs exists?", !!activeBombs);
        }
    }
});}