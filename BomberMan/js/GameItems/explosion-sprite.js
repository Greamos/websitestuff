import { assets } from '../assets.js';

export class ExplosionSprite {
  constructor(x, y, direction = null, stage = 'center', options = {}) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.stage = stage; 
    this.el = null;
    this.loadedAssets = options.loadedAssets || null;
    this.gridApi = options.gridApi || null;
    this.useSpritesheet = !!(assets?.explosion?.spritesheet && this.loadedAssets?.[assets.explosion.spritesheet]);
    this._spriteMeta = null;
    this._animTimer = null;
  }


  // explosion-sprite.js

_setSpriteFrameByIndex(index) {
  if (!this._spriteMeta) return;
  const meta = this._spriteMeta;
  
  // 1. Get the row from the assets definition
  const animDef = assets.explosion.animations[this.stage];
  const row = animDef?.default?.row ?? 0;
  const col = index % meta.cols;

  // 2. Simple, clean calculation (No nudges needed now!)
  const srcX = col * meta.frameW;
  const srcY = row * meta.frameH;

  const posX = Math.round(srcX * meta.scaleX);
  const posY = Math.round(srcY * meta.scaleY);

  this.el.style.backgroundPosition = `-${posX}px -${posY}px`;
}

_initSpriteMetadata() {
  try {
    const sheetImg = this.loadedAssets[assets.explosion.spritesheet];
    const frameW = 48; 
    const frameH = 48;
    
    // Get the display size of the 5rem tile
    const rect = this.el.getBoundingClientRect();
    
    // Calculate how much we are zooming the 48px image to fit the 80px tile
    const scaleX = rect.width / frameW;
    const scaleY = rect.height / frameH;

    this._spriteMeta = { cols: 7, frameW, frameH, scaleX, scaleY };

    // Scale the entire sheet so the frames match the tile size
    const scaledSheetW = Math.round(sheetImg.width * scaleX);
    const scaledSheetH = Math.round(sheetImg.height * scaleY);
    this.el.style.backgroundSize = `${scaledSheetW}px ${scaledSheetH}px`;
  } catch (e) {
    console.error("Metadata error:", e);
  }
}

render(gridApi) {
  if (!this.el) {
    const div = document.createElement('div');
    div.className = 'explosion-sprite';
    div.style.position = 'absolute';
    div.style.width = '5.1rem'; // Tiny overlap to prevent 1px gaps between tiles
    div.style.height = '5.1rem';
    div.style.backgroundImage = `url(${assets.explosion.spritesheet})`;
    div.style.backgroundRepeat = 'no-repeat';
    div.style.imageRendering = 'pixelated'; // Keeps it crisp
    div.style.zIndex = '3';
    this.el = div;
    gridApi.container.appendChild(this.el);
    this._initSpriteMetadata();
    this._startAnimation();
  }

  const cell = gridApi.getCell(this.x, this.y);
  if (cell && this.el) {
    const gridRect = gridApi.container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    
    // Exact center of the tile
    const centerX = cellRect.left - gridRect.left + cellRect.width / 2;
    const centerY = cellRect.top - gridRect.top + cellRect.height / 2;

    this.el.style.left = `${centerX}px`;
    this.el.style.top = `${centerY}px`;

    // Rotate around the center
    const rotations = { 'up': 270, 'right': 0, 'down': 90, 'left': 180 };
    const rotation = this.direction ? (rotations[this.direction] || 0) : 0;
    this.el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }
}


  
  _startAnimation() {
    const animDef = assets.explosion.animations[this.stage];
    if (!animDef) return;
    const def = animDef.default;
    const frames = [];
    for (let i = 0; i < def.count; i++) frames.push(def.start + i);
    
    let idx = 0;
    this._setSpriteFrameByIndex(frames[idx]);
    this._animTimer = setInterval(() => {
      idx = (idx + 1) % frames.length;
      this._setSpriteFrameByIndex(frames[idx]);
    }, 1000 / (assets.explosion.fps || 12));
  }

  destroy() {
    if (this._animTimer) clearInterval(this._animTimer);
    this.el?.remove();
  }
}