import { assets } from './assets.js';

export class Player {
  // options: { moveDuration: number (ms), loadedAssets: { [path]: Image } }
  constructor(id, spriteUrl, options = {}) {
    this.id = id;
    this.spriteUrl = spriteUrl;
    this.x = null;
    this.y = null;
    this.img = null; // DOM element (either <img> or <div> when using spritesheet)
    this.direction = 'idle';
    this.facing = 'down'; // last-facing direction (used for directional idle frames)
    this.isWalking = false;
    this.isMoving = false;
    this.moveDuration = options.moveDuration || 380; // movement animation duration

    // spritesheet support
    this.loadedAssets = options.loadedAssets || null; // map from preloadAssets()
    // only enable spritesheet mode if a spritesheet path exists AND the image was preloaded successfully
    this.useSpritesheet = !!(assets && assets.player && assets.player.spritesheet && options.loadedAssets && options.loadedAssets[assets.player.spritesheet]);
    this._spriteMeta = null; // computed cols/rows/disp sizes
    this._animTimer = null;
    this._animIndex = 0;
  }

  place(gridApi, x, y) {
    this.x = x;
    this.y = y;
    this.gridApi = gridApi;

    // create or reuse DOM element
    if (!this.img) {
      if (this.useSpritesheet) {
        const div = document.createElement('div');
        div.dataset.playerId = this.id;
        div.className = 'player-sprite';
        div.style.setProperty('--move-duration', `${this.moveDuration}ms`);
        // set sheet as background; exact frame is controlled by background-position
        div.style.backgroundImage = `url(${assets.player.spritesheet})`;
        div.style.backgroundRepeat = 'no-repeat';
        this.img = div;
        gridApi.container.appendChild(this.img);
        // compute background-size / columns after element has layout
        this._initSpriteMetadata();
        // set initial frame (idle)
        this._setSpriteToIdle();
      } else {
        const img = document.createElement('img');
        img.src = this.spriteUrl;
        img.alt = `player-${this.id}`;
        img.dataset.playerId = this.id;
        img.className = 'player-sprite';
        img.style.setProperty('--move-duration', `${this.moveDuration}ms`);
        this.img = img;
        gridApi.container.appendChild(this.img);
      }
    } else {
      // ensure transition duration stays in sync if changed
      this.img.style.setProperty('--move-duration', `${this.moveDuration}ms`);
      if (this.useSpritesheet && !this._spriteMeta) this._initSpriteMetadata();
    }

    // position it at the center of the target cell
    const cell = gridApi.getCell(x, y);
    const gridRect = gridApi.container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const left = cellRect.left - gridRect.left + cellRect.width / 2;
    const top = cellRect.top - gridRect.top + cellRect.height / 2;
    this.img.style.left = `${left}px`;
    this.img.style.top = `${top}px`;
  }

  _initSpriteMetadata() {
    // compute columns/rows from loaded image and element size
    try {
      const sheetPath = assets.player.spritesheet;
      const sheetImg = this.loadedAssets && this.loadedAssets[sheetPath];
      const frameW = assets.player.frameWidth || 20;
      const frameH = assets.player.frameHeight || 40;

      // if preloaded sheet not available, gracefully fall back to image-per-direction mode
      if (!sheetImg || !sheetImg.width || !sheetImg.height) {
        console.warn('Spritesheet not preloaded or invalid — falling back to legacy image mode');
        this.useSpritesheet = false;
        this._spriteMeta = null;
        return;
      }

      const cols = Math.floor(sheetImg.width / frameW);
      const rows = Math.floor(sheetImg.height / frameH);

      // base display size (element size before applying renderScale)
      const baseDispW = this.img.clientWidth || parseInt(getComputedStyle(this.img).width, 10) || frameW;
      const baseDispH = this.img.clientHeight || parseInt(getComputedStyle(this.img).height, 10) || frameH;

      // allow a config scale multiplier from assets (zoom-in/out)
      const renderScale = (assets && assets.player && (assets.player.renderScale || 1)) || 1;
      const dispW = Math.round(baseDispW * renderScale);
      const dispH = Math.round(baseDispH * renderScale);

      // if scaled, set explicit element size so visual matches mapping
      if (renderScale !== 1) {
        this.img.style.width = `${dispW}px`;
        this.img.style.height = `${dispH}px`;
      }

      // compute scale (display px per source-frame px)
      const scaleX = dispW / frameW;
      const scaleY = dispH / frameH;

      // read optional source offsets from assets (pixels inside source image)
      const srcOffX = (assets && assets.player && (assets.player.sheetOffsetX || 0)) || 0;
      const srcOffY = (assets && assets.player && (assets.player.sheetOffsetY || 0)) || 0;

      // allow small display nudges from assets (pixels)
      const renderNudgeX = (assets && assets.player && (assets.player.renderOffsetX || 0)) || 0;
      const renderNudgeY = (assets && assets.player && (assets.player.renderOffsetY || 0)) || 0;

      // convert source offsets to display pixels for background-position correction and add nudges
      const dispOffX = Math.round((srcOffX * scaleX + renderNudgeX) * 100) / 100;
      const dispOffY = Math.round((srcOffY * scaleY + renderNudgeY) * 100) / 100;

      this._spriteMeta = { cols, rows, frameW, frameH, dispW, dispH, baseDispW, baseDispH, renderScale, scaleX, scaleY, srcOffX, srcOffY, dispOffX, dispOffY, renderNudgeX, renderNudgeY };

      if (cols && rows) {
        // scale the full sheet so one source-frame maps to the element's display size
        this.img.style.backgroundSize = `${cols * dispW}px ${rows * dispH}px`;
        // keep the default background-size so individual frames can temporarily override it
        this._spriteMeta = Object.assign(this._spriteMeta || {}, { defaultBackgroundSize: `${cols * dispW}px ${rows * dispH}px` });
      }
    } catch (err) {
      // silent fallback — sprite rendering will still attempt to work
      console.warn('Failed to init sprite metadata', err);
      this._spriteMeta = null;
    }
  }

    _setSpriteFrameByIndex(index) {
    if (!this._spriteMeta) return;
    const meta = this._spriteMeta;
    if (!meta) return;
    const { cols, dispW, dispH, scaleX = 1, scaleY = 1, dispOffX = 0, dispOffY = 0 } = meta;
    const col = index % cols;
    const row = Math.floor(index / cols);

    // normal top-left of the source-frame in display px
    const frameOriginX = dispOffX + col * dispW;
    const frameOriginY = dispOffY + row * dispH;

    // support globalFrameTrim (configured in assets.player) — can override per-frame frameBoxes
    const fbMap = (assets && assets.player && assets.player.frameBoxes) || {};
    const globalTrim = (assets && assets.player && Number(assets.player.globalFrameTrim)) || 0;
    const forceGlobal = !!(assets && assets.player && assets.player.forceGlobalFrameTrim);

    // helper to build a frameBox from a trim value (source px)
    const makeTrimFb = (trim) => {
      const srcW = meta.frameW, srcH = meta.frameH;
      const t = Math.max(0, Math.min(Math.floor(trim), Math.floor(Math.min(srcW, srcH) / 2) - 0));
      return { x: t, y: t, w: Math.max(1, srcW - t*2), h: Math.max(1, srcH - t*2) };
    };

    let fb = null;
    if (forceGlobal && globalTrim > 0) {
      fb = makeTrimFb(globalTrim);
    } else if (fbMap[index]) {
      fb = fbMap[index];
    } else if (globalTrim > 0) {
      fb = makeTrimFb(globalTrim);
    }

    if (fb && fb.w > 0 && fb.h > 0) {
      // scale the *cropped* source box so it fills the element display (prevents transparent gutters)
      const sX = dispW / fb.w;           // display px per source-px for cropped box
      const sY = dispH / fb.h;
      // new background-size for the whole sheet so one source-px maps to sX/sY
      const bgSizeX = Math.round(meta.cols * meta.frameW * sX);
      const bgSizeY = Math.round(meta.rows * meta.frameH * sY);
      this.img.style.backgroundSize = `${bgSizeX}px ${bgSizeY}px`;

      // source-pixel position of the cropped box within the sheet (includes sheetOffset)
      const srcPixelX = meta.srcOffX + col * meta.frameW + fb.x;
      const srcPixelY = meta.srcOffY + row * meta.frameH + fb.y;

      // map source-pixel -> background-position using sX/sY and snap to integers
      // include any display nudges from assets.player.renderOffsetX/Y
      const x = Math.round(srcPixelX * sX + (meta.renderNudgeX || 0));
      const y = Math.round(srcPixelY * sY + (meta.renderNudgeY || 0));
      this.img.style.backgroundPosition = `-${x}px -${y}px`;
    } else {
      // restore default background-size and use normal mapping
      if (meta.defaultBackgroundSize) this.img.style.backgroundSize = meta.defaultBackgroundSize;
      const srcPixelX = meta.srcOffX + col * meta.frameW;
      const srcPixelY = meta.srcOffY + row * meta.frameH;
      const x = Math.round(srcPixelX * meta.scaleX + (meta.renderNudgeX || 0));
      const y = Math.round(srcPixelY * meta.scaleY + (meta.renderNudgeY || 0));
      this.img.style.backgroundPosition = `-${x}px -${y}px`;
    }

    this._currentFrame = index;
  }

  _framesFromDef(def) {
    // def can be: [indices...]  OR  { row, start, count }
    if (!def) return [0];
    if (Array.isArray(def)) return def;
    if (def && typeof def === 'object' && def.row != null && def.start != null && def.count != null) {
      const cols = this._spriteMeta && this._spriteMeta.cols;
      if (!cols) return [];
      const out = [];
      for (let i = 0; i < def.count; i++) out.push(def.row * cols + def.start + i);
      return out;
    }
    return [0];
  }

  _startSpriteLoop(frames, fps) {
    this._stopSpriteLoop();
    if (!frames || frames.length === 0) return;
    const interval = Math.max(1, Math.round(1000 / (fps || (assets.player && assets.player.fps) || 8)));
    // set first frame immediately
    this._animIndex = 0;
    this._setSpriteFrameByIndex(frames[this._animIndex]);
    this._animTimer = setInterval(() => {
      this._animIndex = (this._animIndex + 1) % frames.length;
      this._setSpriteFrameByIndex(frames[this._animIndex]);
    }, interval);
  }

  _stopSpriteLoop() {
    if (this._animTimer) {
      clearInterval(this._animTimer);
      this._animTimer = null;
    }
  }

  _setSpriteToIdle() {
    // support both: animations.idle => {row,start,count} OR animations.idle => { down: {...}, left: {...} }
    const idleAnim = assets && assets.player && assets.player.animations && assets.player.animations.idle;
    let idleDef = null;
    if (idleAnim) {
      // prefer direction-specific idle using last-facing
      if (typeof idleAnim === 'object' && idleAnim[this.facing]) idleDef = idleAnim[this.facing];
      else if (idleAnim.row != null || Array.isArray(idleAnim)) idleDef = idleAnim;
    }
    const frames = this._framesFromDef(idleDef || [0]);
    this._stopSpriteLoop();
    this._setSpriteFrameByIndex(frames[0]);
  }

  moveTo(gridApi, newX, newY) {
    // first placement case
    if (this.x === null || this.y === null) return this.place(gridApi, newX, newY);

    if (this.isMoving) return; // avoid overlapping moves
    this.isMoving = true;

    const dx = newX - this.x;
    const dy = newY - this.y;
    let direction = 'down';
    // check diagonals first (keys match assets.walk)
    if (dx === 1 && dy === -1) direction = 'upright';
    else if (dx === -1 && dy === -1) direction = 'upleft';
    else if (dx === 1 && dy === 1) direction = 'downright';
    else if (dx === -1 && dy === 1) direction = 'downleft';
    else if (dx === 1) direction = 'right';
    else if (dx === -1) direction = 'left';
    else if (dy === -1) direction = 'up';
    else if (dy === 1) direction = 'down';
    else if (dx === 0 && dy === 0) {
      this.isMoving = false;
      return;
    }

    // start walking animation
    this.startWalk(direction);

    // compute target center coordinates relative to grid container
    const targetCell = gridApi.getCell(newX, newY);
    const gridRect = gridApi.container.getBoundingClientRect();
    const cellRect = targetCell.getBoundingClientRect();
    const left = cellRect.left - gridRect.left + cellRect.width / 2;
    const top = cellRect.top - gridRect.top + cellRect.height / 2;

    // move the floating image to the target center (CSS transition animates it)
    this.img.style.left = `${left}px`;
    this.img.style.top = `${top}px`;

    // wait for transition to complete, then finalize position and stop animation
    const onEnd = (ev) => {
      // accept either left or top transition end
      if (ev.propertyName !== 'left' && ev.propertyName !== 'top') return;
      this.img.removeEventListener('transitionend', onEnd);
      this.x = newX;
      this.y = newY;
      this.stopWalk();
      this.isMoving = false;
    };
    this.img.addEventListener('transitionend', onEnd);
  }

  startWalk(direction) {
    if (!this.img) return;
    if (this.isWalking && this.direction === direction) return;
    this.direction = direction;
    this.facing = direction; // remember last facing so idle can use it
    this.isWalking = true;

    // spritesheet mode
    if (this.useSpritesheet) {
      const animDef = (assets && assets.player && assets.player.animations && assets.player.animations.walk && assets.player.animations.walk[direction])
        || (assets && assets.player && assets.player.animations && assets.player.animations[direction])
        || (assets && assets.player && assets.player.animations && assets.player.animations.walk && assets.player.animations.walk.down)
        || [0];
      const frames = this._framesFromDef(animDef);
      this._startSpriteLoop(frames, assets.player.fps);
      return;
    }

    // legacy (image-per-direction) mode
    const path = (assets && assets.player && assets.player.walk && assets.player.walk[direction]) || this.spriteUrl;
    if (this.img.tagName === 'IMG') this.img.src = path;
  }

  stopWalk() {
    if (!this.img) return;
    this.isWalking = false;
    this.direction = 'idle';

    if (this.useSpritesheet) {
      this._stopSpriteLoop();
      this._setSpriteToIdle();
      return;
    }

    const idle = (assets && assets.player && assets.player.idle) || this.spriteUrl;
    if (this.img.tagName === 'IMG') this.img.src = idle;
  }

  // allow changing movement speed (ms) at runtime
  setSpeed(ms) {
    this.moveDuration = ms;
    if (this.img) this.img.style.setProperty('--move-duration', `${ms}ms`);
  }
}


