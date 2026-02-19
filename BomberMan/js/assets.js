export const assets = {
  player: {
    // legacy single-image paths kept for backwards compatibility
    idle: 'assets/player/idle.png',
    walk: {
      up: 'assets/player/north.gif',
      upright: 'assets/player/norteast.gif',
      down: 'assets/player/south.gif',
      downright: 'assets/player/south-east.gif',
      left: 'assets/player/west.gif',
      upleft: 'assets/player/north-west.gif',
      right: 'assets/player/east.gif',
      downleft: 'assets/player/south-west.gif',
    },
    bomb: 'assets/player/bomb.png',
    explosion: 'assets/player/explosion.gif',

    // --- Spritesheet configuration (V2) ---
    // Use `bomberman_sheet V2.png` — frames are 48×48 px.
    // The Player class falls back to legacy images when `spritesheet` is absent.
    spritesheet: 'assets/bomberman_sheet V2.png',
    frameWidth: 48,
    frameHeight: 48,
    // optional fps for sprite animations
    fps: 10,
    // animations: arrays of frame-indices (left→right, top→bottom) OR
    // shorthand objects like { row, start, count } — Player will normalize both.
    // Adjust the indices/rows to match your actual sheet layout if needed.
    animations: {
      idle: [0],
      walk: {
        down: { row: 0, start: 0, count: 3 },
        left: { row: 0, start: 3, count: 3 },
        right: { row: 0, start: 6, count: 3 },
        up: { row: 0, start: 9, count: 3 },
        upleft: { row: 1, start: 0, count: 3 },
        upright: { row: 1, start: 3, count: 3 },
        downleft: { row: 1, start: 6, count: 3 },
        downright: { row: 1, start: 9, count: 3 }
      }
    }
  }
};

// Preload helper: collects all string paths from the asset object,
// loads them as Image objects and returns a Promise that resolves
// to a lookup map { path: Image }
export function preloadAssets(assetObj) {
  const paths = new Set();

  function collect(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      paths.add(obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(collect);
      return;
    }
    if (typeof obj === 'object') {
      Object.values(obj).forEach(collect);
    }
  }

  collect(assetObj || assets);

  const promises = [];
  const loaded = {};

  paths.forEach((p) => {
    promises.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        loaded[p] = img;
        resolve({ path: p, img });
      };
      img.onerror = () => {
        // still resolve so one missing image doesn't block everything
        console.warn('Failed to load image:', p);
        loaded[p] = null;
        resolve({ path: p, img: null });
      };
      img.src = p;
    }));
  });

  return Promise.all(promises).then(() => loaded);
}