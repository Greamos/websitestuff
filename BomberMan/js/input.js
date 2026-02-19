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
    let nx = player.x;
    let ny = player.y;
    if (direction === 'up') ny = Math.max(0, player.y - 1);
    else if (direction === 'down') ny = Math.min(gridApi.rows - 1, player.y + 1);
    else if (direction === 'left') nx = Math.max(0, player.x - 1);
    else if (direction === 'right') nx = Math.min(gridApi.cols - 1, player.x + 1);
    if (nx === player.x && ny === player.y) return;
    if (!isWalkable(nx, ny)) return;
    player.moveTo(gridApi, nx, ny);
  }

  function isWalkable(x, y) {
    const cell = gridApi.getCell(x, y);
    if (!cell) return false;
    return TILE_PROPS[cell.dataset.type]?.walkable === true;
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

  window.addEventListener('keyup', (e) => {
    const direction = getDirFromKey(e.key);
    if (!direction) return;
    if (activeKey === direction) {
      activeKey = null;
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
    }
  });
}
