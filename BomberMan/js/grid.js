import { SPRITE_CONFIG } from './assets.js';

export const TILE_TYPE = { // for getting data on grid

    EMPTY: 'empty',
    wall: 'wall',
    walltop: 'walltop',
    bomb: 'bomb',
    explosion: 'explosion',
    powerup: 'powerup',
    box: 'box',
    player: 'player',
    playerspawn: 'playerspawn',
    player1spot: 'player1spot',
  };

  export const TILE_PROPS = {
    [TILE_TYPE.EMPTY]: { walkable: true, },
    [TILE_TYPE.wall]: { walkable: false, breakable: false },
    [TILE_TYPE.box]: { walkable: false, breakable: true },
    [TILE_TYPE.bomb]: { walkable: false, breakable: false },
    [TILE_TYPE.walltop] : {walkable: false, breakable: false},
    [TILE_TYPE.explosion]: { walkable: true, breakable: false, damage: true },
    [TILE_TYPE.powerup]: { walkable: true, breakable: false, powerup: true },
    [TILE_TYPE.player]: { walkable: false, breakable: false, player: true },
    [TILE_TYPE.playerspawn]: { walkable: true, breakable: false, spawn: true },
    [TILE_TYPE.player1spot]: { walkable: true, breakable: false,},
  };


  const TILE_TO_SPRITE = {
  [TILE_TYPE.EMPTY]: 'grass',
  [TILE_TYPE.wall]: 'Wallside',
  [TILE_TYPE.walltop]: 'Wallnormal',
  [TILE_TYPE.box]: 'Box',
  [TILE_TYPE.playerspawn]: 'Spawnpoint',
  [TILE_TYPE.player1spot]: 'Spawnpoint',
  [TILE_TYPE.powerup]: 'powerup',
  [TILE_TYPE.bomb]: 'grass',      // Logically a bomb, but visually grass, to fix background of bomb / explosion //
  [TILE_TYPE.explosion]: 'grass',
};


export function createGrid(containerId, rows = 10, cols = 10) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`No element with id ${containerId}`);
  container.innerHTML = '';

    container.style.gridTemplateColumns = `repeat(${cols}, 48px) `;
    container.style.gridTemplateRows = `repeat(${rows}, 48px) `;

const api = {
  // DOM element that contains the whole grid
  container,
  rows,
  cols,
  // numeric<->string tile mappings used as single source of truth
  code2type: {
    0: TILE_TYPE.EMPTY,
    1: TILE_TYPE.wall,
    2: TILE_TYPE.box,
    3: TILE_TYPE.playerspawn,
    4: TILE_TYPE.powerup,
    5: TILE_TYPE.player1spot,
    6: TILE_TYPE.bomb,
    7: TILE_TYPE.walltop, 
  },
  type2code: {
    [TILE_TYPE.EMPTY]: 0,
    [TILE_TYPE.wall]: 1,
    [TILE_TYPE.box]: 2,
    [TILE_TYPE.playerspawn]: 3,
    [TILE_TYPE.powerup]: 4,
    [TILE_TYPE.player1spot]: 5,
    [TILE_TYPE.bomb]: 6,
    [TILE_TYPE.walltop]: 7,
  },
  // return the <div> for the given x,y coordinates (or null if off‑grid)
  getCell(x, y) {
    return container.querySelector(
      `.grid-item[data-x="${x}"][data-y="${y}"]`
    );
  },

  // read the current type string stored in data-type
getType(x, y) {
    const cell = api.getCell(x, y);
    return cell ? cell.dataset.type : null;
  },

  // set the type on a cell and toggle a matching CSS class
  setType(x, y, type = TILE_TYPE.EMPTY) {
    const cell = api.getCell(x, y);
    if (!cell) return;

    cell.dataset.type = type;
    cell.title = `(${x},${y}) ${type}`
               + (TILE_PROPS[type]?.walkable ? ' ✔' : ' ✖')
               + (TILE_PROPS[type]?.breakable ? ' – breakable' : '');
                  
    // Manage CSS classes
    Object.values(TILE_TYPE).forEach(t => cell.classList.remove(`tile-${t}`));
    if (type) cell.classList.add(`tile-${type}`);

    // --- SPRITE LOGIC ---
    const spriteName = TILE_TO_SPRITE[type];
    const sprite = SPRITE_CONFIG[spriteName];
    const scale = 3.0; 

    // Reset base styles
    cell.style.imageRendering = 'pixelated';
    cell.style.backgroundColor = 'transparent';
    cell.style.border = 'none';
    cell.style.backgroundSize = `384px 48px`; // 128 * 3

    if (sprite) {
      // If we found a specific sprite (Wall, Box, Grass, Powerup, etc.)
      cell.style.backgroundImage = `url('${sprite.spritesheet}')`;
      
      const posX = -(sprite.sheetOffsetX * scale);
      const posY = -(sprite.sheetOffsetY * scale);
      cell.style.backgroundPosition = `${posX}px ${posY}px`;
    } else {
      // DEFAULT: If no sprite is found (Bomb/Explosion), use Grass background
      // Assuming Grass is at Offset 16 in your 128px spritemap
      const grassX = -(16 * scale); 
      cell.style.backgroundImage = `url('assets/SpriteMap.png')`;
      cell.style.backgroundPosition = `${grassX}px 0px`;
    }

    // Sync numeric map if present
    if (api.map && api.map[y] && typeof api.map[y][x] !== 'undefined') {
      const code = api.type2code && api.type2code[type];
      if (typeof code !== 'undefined') api.map[y][x] = code;
    }
  },

  // helpers built on getType
  isType(x, y, type) {
    return api.getType(x, y) === type;
  },

  isWalkable(x, y) {
    const t = api.getType(x, y);
    return TILE_PROPS[t]?.walkable === true;
  },

  // clear a cell and put an image in it (uses a URL or an object with .src)  is helper function can be called
  setTile(x, y, content) {
    const cell = api.getCell(x, y);
    if (!cell) return;

    cell.innerHTML = '';    // wipe previous contents
    if (!content) return;

    const img = document.createElement('img');
    img.src = typeof content === 'string' ? content : content.src;
    img.alt = `tile-${x}-${y}`;
    cell.appendChild(img);
  },

  // remove anything inside a cell
  clearTile(x, y) {
    const cell = api.getCell(x, y);
    if (!cell) return;
    cell.innerHTML = '';
  },

  
  getPlayerCoords() {
    const p = (typeof window !== 'undefined' && window.__game && window.__game.player) || null;
    if (!p || p.x == null || p.y == null) return null;
    return { x: p.x, y: p.y, id: p.id };
  },

  // Kill the current player instance (if available). Safe no-op if missing.
  killPlayer() {
    const p = (typeof window !== 'undefined' && window.__game && window.__game.player) || null;
    if (p && typeof p.die === 'function' && !p.isDead) {
      p.die();
    }
  }
};

  // build cells ( THE GRIDDDDDDDD )
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-item');
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.dataset.index = y * cols + x;
      cell.dataset.type = TILE_TYPE.EMPTY;  // default type so walkable checks work
      container.appendChild(cell);
    }
  }

  return api;
}

export function exportMap(gridApi) {
  const maparray = [];

  for (let y = 0; y < gridApi.rows; y += 1) {      // outer loop = rows
    const row = [];
    for (let x = 0; x < gridApi.cols; x += 1) {    // inner loop = cols
      // call the API just as you would call a Blueprint function node
      row.push(gridApi.getType(x, y) || TILE_TYPE.EMPTY);
    }
    maparray.push(row);
  }

  return maparray;
}

export function buildFromMap(gridApi, map) {
  const code2type = (gridApi && gridApi.code2type) || {
    0: TILE_TYPE.EMPTY,
    1: TILE_TYPE.wall,
    2: TILE_TYPE.box,
    3: TILE_TYPE.playerspawn,
    4: TILE_TYPE.powerup,
    5: TILE_TYPE.player1spot,
    6: TILE_TYPE.bomb,
    7: TILE_TYPE.walltop,
  };
  console.log('building from map:');
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      const type = map[y] && map[y][x];
      gridApi.setType(x, y, code2type[type] || TILE_TYPE.EMPTY);
    }
  }
}

export function findSpawn(map) { // find spawn point in map and return coordinates as {x,y}
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      if (map[y][x] === 3) return { x, y };
    }
  }
  return null;
}

export function findAllSpawns(map) { 
  if (!map) return []; // Add this safety check!
  const points = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 3) points.push({ x, y });
    }
  }
  return points;
}

export function setWall(gridApi) {
  gridApi.setType ? gridApi.setType(1, 0, TILE_TYPE.wall)
                  : (gridApi.getCell(1, 0).dataset.type = TILE_TYPE.wall);
}
