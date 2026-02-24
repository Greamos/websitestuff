import { TILE_PROPS } from './grid.js';
import { TILE_TYPE } from './grid.js';

export function bindArrowKeys(player, gridApi, options = {}) {
 
 
 
  // options: { repeatOnHold: boolean, repeatInterval: ms }
  const repeatOnHold = !!options.repeatOnHold;
  const repeatInterval = options.repeatInterval || 180;

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
    player.moveTo(gridApi, nx, ny);

    if (gridApi.map)  {
      gridApi.map[oy][ox] = 0;  // clear old cell in map data
      gridApi.map[ny][nx] = 5;  // set new cell in map data to player1spot code (5)
    }
    gridApi.setType(ox, oy, TILE_TYPE.EMPTY);
    gridApi.setType(nx, ny, TILE_TYPE.player1spot);
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
    };
    
    const stringType = code2type[rawCode];

    // 4. Look up that word in your TILE_PROPS
    const props = TILE_PROPS[stringType];

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
      console.log('spacebar pressed - you can trigger bomb planting here!');
      player.placeBomb(gridApi);
    }
});
}
