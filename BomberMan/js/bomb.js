import { assets } from './assets.js';
import { TILE_TYPE } from './grid.js';

export class Bomb {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.el = null;  // DOM element (div for spritesheet)
    this.redOverlay = null;  // Red pulsing overlay
    this.loadedAssets = options.loadedAssets || null;
    this.gridApi = options.gridApi || null;
    this.duration = options.duration || 3000;  // Bomb lifetime in ms
    this.createdAt = Date.now();  // Timestamp when bomb was created
    
    // Check if we should use spritesheet
    this.useSpritesheet = !!(
      assets && 
      assets.bomb && 
      assets.bomb.spritesheet && 
      this.loadedAssets && 
      this.loadedAssets[assets.bomb.spritesheet]
    );
    
    this._spriteMeta = null;
    this._animTimer = null;
    this._animIndex = 0;
    this._pulseTimer = null;
    this._isAlive = true;
  }

  render(gridApi) {
    this.gridApi = gridApi;

    if (!this.el) {
      if (this.useSpritesheet) {
        const div = document.createElement('div');
        div.className = 'bomb-sprite';
        div.style.position = 'absolute';
        div.style.width = '3.6rem';
        div.style.height = '3.6rem';
        div.style.backgroundImage = `url(${assets.bomb.spritesheet})`;
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundColor = 'transparent';
        div.style.imageRendering = 'pixelated';
        div.style.zIndex = '5';
        div.style.pointerEvents = 'none';
        this.el = div;
        gridApi.container.appendChild(this.el);
        
        // Create red overlay for pulsing effect
        // Uses mask-image so red only appears on bomb pixels
        const overlay = document.createElement('div');
        overlay.className = 'bomb-red-overlay';
        overlay.style.position = 'absolute';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.backgroundColor = 'red';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.imageRendering = 'pixelated';
        // Use the spritesheet as a mask so red only shows on bomb pixels
        overlay.style.webkitMaskImage = `url(${assets.bomb.spritesheet})`;
        overlay.style.maskImage = `url(${assets.bomb.spritesheet})`;
        overlay.style.webkitMaskRepeat = 'no-repeat';
        overlay.style.maskRepeat = 'no-repeat';
        div.appendChild(overlay);
        this.redOverlay = overlay;
        
        // Init sprite metadata and animation
        this._initSpriteMetadata();
        this._startAnimation();
        this._startPulse();
      } else {
        // Fallback: just show the green box (from CSS)
        return;
      }
    }

    // Position it at the center of the target cell
    const cell = gridApi.getCell(this.x, this.y);
    if (cell) {
      const gridRect = gridApi.container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const left = cellRect.left - gridRect.left + cellRect.width / 2;
      const top = cellRect.top - gridRect.top + cellRect.height / 2;
      
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      this.el.style.transform = 'translate(-50%, -50%)';
    }
  }

  _initSpriteMetadata() {
    try {
      const sheetPath = assets.bomb.spritesheet;
      const sheetImg = this.loadedAssets && this.loadedAssets[sheetPath];
      const frameW = assets.bomb.frameWidth || 19;
      const frameH = assets.bomb.frameHeight || 16;

      if (!sheetImg || !sheetImg.width || !sheetImg.height) {
        console.warn('Bomb spritesheet not preloaded — falling back');
        this.useSpritesheet = false;
        return;
      }

      const cols = Math.floor(sheetImg.width / frameW);
      const rows = Math.floor(sheetImg.height / frameH);

      const baseDispW = this.el.clientWidth || parseInt(getComputedStyle(this.el).width, 10) || frameW;
      const baseDispH = this.el.clientHeight || parseInt(getComputedStyle(this.el).height, 10) || frameH;

      const renderScale = (assets && assets.bomb && (assets.bomb.renderScale || 1)) || 1;
      const dispW = Math.round(baseDispW * renderScale);
      const dispH = Math.round(baseDispH * renderScale);

      if (renderScale !== 1) {
        this.el.style.width = `${dispW}px`;
        this.el.style.height = `${dispH}px`;
      }

      const scaleX = dispW / frameW;
      const scaleY = dispH / frameH;

      const srcOffX = (assets && assets.bomb && (assets.bomb.sheetOffsetX || 0)) || 0;
      const srcOffY = (assets && assets.bomb && (assets.bomb.sheetOffsetY || 0)) || 0;

      const renderNudgeX = (assets && assets.bomb && (assets.bomb.renderOffsetX || 0)) || 0;
      const renderNudgeY = (assets && assets.bomb && (assets.bomb.renderOffsetY || 0)) || 0;

      const dispOffX = Math.round((srcOffX * scaleX + renderNudgeX) * 100) / 100;
      const dispOffY = Math.round((srcOffY * scaleY + renderNudgeY) * 100) / 100;

      this._spriteMeta = {
        cols, rows, frameW, frameH, dispW, dispH, baseDispW, baseDispH,
        renderScale, scaleX, scaleY, srcOffX, srcOffY, dispOffX, dispOffY,
        renderNudgeX, renderNudgeY
      };

      if (cols && rows) {
        this.el.style.backgroundSize = `${cols * dispW}px ${rows * dispH}px`;
        if (this.redOverlay) {
          this.redOverlay.style.webkitMaskSize = `${cols * dispW}px ${rows * dispH}px`;
          this.redOverlay.style.maskSize = `${cols * dispW}px ${rows * dispH}px`;
        }
      }
    } catch (err) {
      console.warn('Failed to init bomb sprite metadata', err);
      this._spriteMeta = null;
    }
  }

  _setSpriteFrameByIndex(index) {
    if (!this._spriteMeta) return;
    const meta = this._spriteMeta;
    const { cols, dispW, dispH, scaleX = 1, scaleY = 1, dispOffX = 0, dispOffY = 0 } = meta;
    
    const col = index % cols;
    const row = Math.floor(index / cols);

    const frameOriginX = dispOffX + col * dispW;
    const frameOriginY = dispOffY + row * dispH;

    const globalTrim = (assets && assets.bomb && Number(assets.bomb.globalFrameTrim)) || 0;
    const forceGlobal = !!(assets && assets.bomb && assets.bomb.forceGlobalFrameTrim);

    const makeTrimFb = (trim) => {
      const srcW = meta.frameW, srcH = meta.frameH;
      const t = Math.max(0, Math.min(Math.floor(trim), Math.floor(Math.min(srcW, srcH) / 2)));
      return { x: t, y: t, w: Math.max(1, srcW - t*2), h: Math.max(1, srcH - t*2) };
    };

    let fb = null;
    if (forceGlobal && globalTrim > 0) {
      fb = makeTrimFb(globalTrim);
    } else if (globalTrim > 0) {
      fb = makeTrimFb(globalTrim);
    }

    if (fb && fb.w > 0 && fb.h > 0) {
      const sX = dispW / fb.w;
      const sY = dispH / fb.h;
      const bgSizeX = Math.round(meta.cols * meta.frameW * sX);
      const bgSizeY = Math.round(meta.rows * meta.frameH * sY);
      this.el.style.backgroundSize = `${bgSizeX}px ${bgSizeY}px`;
      if (this.redOverlay) this.redOverlay.style.webkitMaskSize = `${bgSizeX}px ${bgSizeY}px`;
      if (this.redOverlay) this.redOverlay.style.maskSize = `${bgSizeX}px ${bgSizeY}px`;

      const srcPixelX = meta.srcOffX + col * meta.frameW + fb.x;
      const srcPixelY = meta.srcOffY + row * meta.frameH + fb.y;

      const x = Math.round(srcPixelX * sX + (meta.renderNudgeX || 0));
      const y = Math.round(srcPixelY * sY + (meta.renderNudgeY || 0));
      this.el.style.backgroundPosition = `-${x}px -${y}px`;
      if (this.redOverlay) this.redOverlay.style.webkitMaskPosition = `-${x}px -${y}px`;
      if (this.redOverlay) this.redOverlay.style.maskPosition = `-${x}px -${y}px`;
    } else {
      const srcPixelX = meta.srcOffX + col * meta.frameW;
      const srcPixelY = meta.srcOffY + row * meta.frameH;
      const x = Math.round(srcPixelX * meta.scaleX + (meta.renderNudgeX || 0));
      const y = Math.round(srcPixelY * meta.scaleY + (meta.renderNudgeY || 0));
      this.el.style.backgroundPosition = `-${x}px -${y}px`;
      if (this.redOverlay) this.redOverlay.style.webkitMaskPosition = `-${x}px -${y}px`;
      if (this.redOverlay) this.redOverlay.style.maskPosition = `-${x}px -${y}px`;
    }
  }

  _startAnimation() {
    // Get the idle animation frames (3 frames for the bomb)
    const animDef = assets.bomb && assets.bomb.animations && assets.bomb.animations.idle;
    if (!animDef) return;

    // Get the frame definition for the default direction
    const frameDef = animDef.default || Object.values(animDef)[0];
    if (!frameDef) return;

    const frames = this._framesFromDef(frameDef);
    this._animIndex = 0;
    this._setSpriteFrameByIndex(frames[this._animIndex]);

    // Dynamic animation: uses RAF to update speed based on time elapsed
    const animate = () => {
      if (!this._isAlive) return;
      
      const elapsed = Date.now() - this.createdAt;
      const progress = elapsed / this.duration;  // 0 to 1
      
      // Speed multiplier: starts at 1x, accelerates to 3x by end
      const speedMultiplier = 1 + progress * 2;  // 1x to 3x
      
      // Base interval from assets (ms per frame)
      const baseFps = (assets.bomb && assets.bomb.fps) || 8;
      const baseInterval = 1000 / baseFps;
      const dynamicInterval = baseInterval / speedMultiplier;
      
      // Schedule next frame
      setTimeout(() => {
        if (!this._isAlive) return;
        this._animIndex = (this._animIndex + 1) % frames.length;
        this._setSpriteFrameByIndex(frames[this._animIndex]);
        animate();
      }, dynamicInterval);
    };

    animate();
  }

  _framesFromDef(def) {
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

  _startPulse() {
    if (!this.redOverlay) return;
    
    const pulse = () => {
      if (!this._isAlive) return;
      
      const elapsed = Date.now() - this.createdAt;
      const progress = Math.min(1, elapsed / this.duration);  // 0 to 1
      
      // Start pulsing at 50% (1500ms), finish at 100% (3000ms)
      if (progress < 0.5) {
        // No pulsing yet
        this.redOverlay.style.opacity = '0';
        setTimeout(pulse, 100);
      } else {
        // Pulsing phase: pulse duration gets shorter as we approach explosion
        const pulseProgress = (progress - 0.5) / 0.5;  // 0 to 1 during pulse phase
        
        // Pulse frequency: 1 pulse/sec at 50%, up to 6 pulses/sec at 100%
        const pulsesPerSec = 1 + pulseProgress * 5;  // 1 to 6
        const pulseDuration = (1000 / pulsesPerSec) / 2;  // Half period (fade in/out time)
        
        // Pulse opacity: fade in to 0.6, fade out to 0
        const fadeInTime = pulseDuration * 0.4;
        const fadeOutTime = pulseDuration * 0.6;
        
        // Fade in (red appears)
        const fadeInInterval = setInterval(() => {
          if (!this._isAlive) {
            clearInterval(fadeInInterval);
            return;
          }
          const current = parseFloat(this.redOverlay.style.opacity) || 0;
          const newOpacity = Math.min(0.6, current + 0.02);
          this.redOverlay.style.opacity = String(newOpacity);
          
          if (newOpacity >= 0.6) {
            clearInterval(fadeInInterval);
            // Fade out after delay
            setTimeout(() => {
              if (!this._isAlive) return;
              const fadeOutInterval = setInterval(() => {
                if (!this._isAlive) {
                  clearInterval(fadeOutInterval);
                  return;
                }
                const current = parseFloat(this.redOverlay.style.opacity) || 0;
                const newOpacity = Math.max(0, current - 0.02);
                this.redOverlay.style.opacity = String(newOpacity);
                
                if (newOpacity <= 0) {
                  clearInterval(fadeOutInterval);
                  pulse();  // Loop again
                }
              }, fadeOutTime / 30);
            }, 100);
          }
        }, fadeInTime / 30);
      }
    };
    
    pulse();
  }

  destroy() {
    this._isAlive = false;
    if (this._animTimer) clearInterval(this._animTimer);
    if (this._pulseTimer) clearInterval(this._pulseTimer);
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    this.redOverlay = null;
  }
}
