Player animation TODOs

- Confirm player assets in `assets/player/`
  - Ensure filenames use a clear, consistent pattern (e.g. `idle.png`, `walk-up.gif`, `walk-right.gif`, `walk-left.gif`, `walk-down.gif`) and avoid parentheses or spaces.

- Preload GIFs/frames into memory
  - Decide whether to use single animated GIFs per direction (easy) or frame arrays/sprite sheets (more control).
  - Create an `assets` loader module that accepts an explicit list or map of asset keys → paths.
  - Preload by creating `Image` objects for each path and resolving Promises when `onload`/`onerror` fire.
  - Store loaded `Image` objects in a central lookup (e.g., `assets.images['player.walk.right'] = Image`).

- Design animation map for `Player` (idle/walk dirs)
  - Define keys for each state and direction (e.g. `idle`, `walk.up`, `walk.down`, `walk.left`, `walk.right`).
  - Map those keys to the preloaded Image or arrays of frames.

- Add `startWalk(direction)` / `stopWalk()` to `Player`
  - `startWalk(direction)` switches the `player.img.src` to the correct GIF or starts a frame loop.
  - `stopWalk()` switches to the idle image and stops any frame timers.

- Implement frame switching or GIF swap strategy
  - GIF swap: set `img.src` to the direction GIF for continuous looping while moving.
  - Frame loop: iterate through frame URLs at a chosen frame rate; use `requestAnimationFrame` or `setInterval`.
  - Ensure preloaded frames are used to avoid flicker.

- Hook `input.js` to call start/stop during movement
  - On keydown: call `player.startWalk(direction)` and initiate move.
  - On keyup or when movement completes: call `player.stopWalk()`.
  - Debounce repeated keydown events if you want one-tile-per-press behavior.

- Test in browser and fix paths / preload issues
  - Use DevTools Network tab to confirm files load and watch for 404s.
  - From console, inspect the assets lookup to ensure Image objects are present.

- Optional: smooth movement with CSS transform or canvas
  - For smoother in-between-tile motion, animate the player's position (translate) instead of instantaneous cell swaps.

Notes about preloading and where to put it

- Why preloading matters
  - Preloading ensures animations start immediately without flicker or visible frame loading delays.

- Where to implement the preloader
  - Create a small module, e.g. `js/assets.js` (or `js/assetLoader.js`).
  - Export a `preload(list)` function that returns a Promise which resolves to a map of keys → loaded Image objects.

- How to feed the preloader
  - Browsers cannot list directory contents from the client; you must provide an explicit list of filenames.
  - Make a simple map in `game.js` or `assets.js` that names all player-related assets, e.g.:
    - `{'player.idle': 'assets/player/idle.png', 'player.walk.right': 'assets/player/walk-right.gif', ...}`

- When to call the preloader
  - In `js/game.js` before you create or place the player, call `await preload(assetMap)` so assets are ready.
  - After preload resolves, pass the assets map into the `Player` constructor or into `player.initAssets(...)`.

- How to store/use loaded assets
  - Keep a lookup on a central `assets` object and let `Player` reference `assets['player.walk.right']` when changing `img.src` or swapping frames.

Testing checklist

- Put the GIFs/frames in `assets/player/` and rename to simple, consistent names.
- Add an explicit asset map in `game.js` and call the preloader.
- Verify in DevTools Network that images are fetched at page load.
- Check `window.__game` or `assets` object in console to confirm loaded images.

If you want, I can now:

- (A) scaffold `js/assets.js` and wire it into `game.js` (I will not paste implementation code unless you ask), or
- (B) walk you step-by-step through writing the preloader yourself, describing each line before you type it.

Which do you prefer?
