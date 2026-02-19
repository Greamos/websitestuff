export const assets = {
  player: {
    // spritesheet-only configuration (legacy per-direction images removed)
    bomb: 'assets/player/bomb.png',
    explosion: 'assets/player/explosion.gif',

    // --- Spritesheet configuration (V2) ---
    // Use `bomberman_sheet_V2.png` — frames are 49×49 px.
    // The Player class falls back to legacy images when `spritesheet` is absent.
    spritesheet: 'assets/bomberman_sheet_V2.png',
    frameWidth: 49,
    frameHeight: 49,
    // IMPORTANT: detected grid offset (source pixels). Inspector found a 1px left gutter and 27px top gutter.
    // These are used by the Player rendering code so background-position lines up with inspector grid.
    sheetOffsetX: 1,
    sheetOffsetY: 27,
    // renderScale (zoom multiplier) and small display nudges (pixels) — change these here for quick visual tweaks
    // - renderScale: 1 = use element size; 1.2 = 20% larger, 0.9 = 10% smaller
    // - renderOffsetX/Y: display-pixel nudge added after calculated offsets (useful to remove a 1px misalignment)
    renderScale: 1.3,
    renderOffsetX: 0,
    renderOffsetY: 3,
    // globalFrameTrim: trim (in source pixels) applied to every frame on each side (0 = off)
    // forceGlobalFrameTrim: when true, globalFrameTrim overrides any per-frame frameBoxes
    // Use a small positive number (1-4) to remove the blue gutter; negative values are ignored.
    globalFrameTrim: 7,
    forceGlobalFrameTrim: true,
    // optional fps for sprite animations
    fps: 16,
    // animations exported from the inspector (per-frame frameBoxes removed — using globalFrameTrim)
    animations: {
      "walk": {
        "left": { "row": 3, "start": 0, "count": 5 },
        "up": { "row": 2, "start": 0, "count": 5 },
        "right": { "row": 1, "start": 0, "count": 5 },
        "down": { "row": 0, "start": 0, "count": 5 }
      },
      "walkEnd": {
        "down": { "row": 0, "start": 4, "count": 1 },
        "right": { "row": 1, "start": 4, "count": 1 },
        "up": { "row": 2, "start": 4, "count": 1 },
        "left": { "row": 3, "start": 4, "count": 1 }
      },
      "liftIdle": {
        "down": { "row": 0, "start": 5, "count": 1 },
        "right": { "row": 1, "start": 5, "count": 1 },
        "up": { "row": 2, "start": 5, "count": 1 },
        "left": { "row": 3, "start": 5, "count": 1 }
      },
      "liftWalk": {
        "left": { "row": 3, "start": 6, "count": 5 },
        "up": { "row": 2, "start": 6, "count": 5 },
        "right": { "row": 1, "start": 6, "count": 5 },
        "down": { "row": 0, "start": 6, "count": 5 }
      },
      "throw2": {
        "down": { "row": 0, "start": 11, "count": 1 },
        "right": { "row": 1, "start": 11, "count": 1 },
        "up": { "row": 2, "start": 11, "count": 1 },
        "left": { "row": 3, "start": 11, "count": 1 }
      },
      "punch2": {
        "down": { "row": 0, "start": 12, "count": 1 },
        "right": { "row": 1, "start": 12, "count": 1 },
        "up": { "row": 2, "start": 12, "count": 1 },
        "left": { "row": 3, "start": 12, "count": 1 }
      },
      "push2": {
        "down": { "row": 0, "start": 13, "count": 1 },
        "right": { "row": 1, "start": 13, "count": 1 },
        "up": { "row": 2, "start": 13, "count": 1 },
        "left": { "row": 3, "start": 13, "count": 1 }
      },
      "jumpwarp2": {
        "down": { "row": 0, "start": 14, "count": 1 },
        "right": { "row": 1, "start": 14, "count": 1 },
        "up": { "row": 2, "start": 14, "count": 1 },
        "left": { "row": 3, "start": 14, "count": 1 }
      },
      "stun2": {
        "down": { "row": 3, "start": 15, "count": 1 },
        "right": { "row": 1, "start": 15, "count": 1 },
        "up": { "row": 2, "start": 15, "count": 1 }
      },
      "bombercart": {
        "right": { "row": 1, "start": 16, "count": 2 },
        "up": { "row": 2, "start": 16, "count": 2 },
        "left": { "row": 3, "start": 16, "count": 2 }
      },
      "idle": {
        "down": { "row": 0, "start": 2, "count": 1 },
        "right": { "row": 1, "start": 2, "count": 1 },
        "up": { "row": 2, "start": 2, "count": 1 },
        "left": { "row": 3, "start": 2, "count": 1 }
      }
    },   
  }

}


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