export const assets = {
  player: {
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
    explosion: 'assets/player/explosion.gif'
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