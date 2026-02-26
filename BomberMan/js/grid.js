export const TILE_TYPE = { // for getting data on grid

    EMPTY: 'empty',
    wall: 'wall',
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
    [TILE_TYPE.explosion]: { walkable: true, breakable: false, damage: true },
    [TILE_TYPE.powerup]: { walkable: true, breakable: false, powerup: true },
    [TILE_TYPE.player]: { walkable: false, breakable: false, player: true },
    [TILE_TYPE.playerspawn]: { walkable: true, breakable: false, spawn: true },
    [TILE_TYPE.player1spot]: { walkable: true, breakable: false,},
  };

export function createGrid(containerId, rows = 10, cols = 10) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`No element with id ${containerId}`);
  container.innerHTML = '';

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
  },
  type2code: {
    [TILE_TYPE.EMPTY]: 0,
    [TILE_TYPE.wall]: 1,
    [TILE_TYPE.box]: 2,
    [TILE_TYPE.playerspawn]: 3,
    [TILE_TYPE.powerup]: 4,
    [TILE_TYPE.player1spot]: 5,
    [TILE_TYPE.bomb]: 6,
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
    if (!cell) return;              // out‑of‑bounds guard

    cell.dataset.type = type;
    cell.title = `(${x},${y}) ${type}`
               + (TILE_PROPS[type].walkable ? ' ✔' : ' ✖')
               + (TILE_PROPS[type].breakable ? ' – breakable' : '');
                  
    // remove any of the tile‑<type> classes that might already be there
    Object.values(TILE_TYPE).forEach(t =>
      cell.classList.remove(`tile-${t}`)
    );
    if (type) cell.classList.add(`tile-${type}`);

    // keep numeric map (gridApi.map) in sync if present
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



export function setWall(gridApi) {
  gridApi.setType ? gridApi.setType(1, 0, TILE_TYPE.wall)
                  : (gridApi.getCell(1, 0).dataset.type = TILE_TYPE.wall);
}
