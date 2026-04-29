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
    div.style.width = '50px'; // Tiny overlap to prevent 1px gaps between tiles
    div.style.height = '50px';
    div.style.backgroundImage = `url(${assets.explosion.spritesheet})`;
    div.style.backgroundRepeat = 'no-repeat';
    div.style.imageRendering = 'pixelated'; // Keeps it crisp
    div.style.zIndex = '3';
    this.el = div;
    gridApi.container.appendChild(this.el);
    this._initSpriteMetadata();
    this._startAnimation();
  }

  // Create fire hitbox if it doesn't exist
  if (!this.hitboxElement) {
    this.hitboxElement = document.createElement('div');
    this.hitboxElement.className = 'fire-hitbox';
    this.hitboxElement.style.width = '48px';
    this.hitboxElement.style.height = '48px';
    gridApi.container.appendChild(this.hitboxElement);
  }

  // Create extra hitbox for directional tips if it doesn't exist
  if (!this.extraHitboxElement) {
    this.extraHitboxElement = document.createElement('div');
    this.extraHitboxElement.className = 'fire-hitbox';
    this.extraHitboxElement.style.width = '48px';
    this.extraHitboxElement.style.height = '48px';
    gridApi.container.appendChild(this.extraHitboxElement);
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

    // Adjust hitbox size and position based on stage and direction
    let hitboxWidth = 48;
    let hitboxHeight = 48;
    let offsetX = 0;
    let offsetY = 0;

    // For directional tips, make hitbox match the fire direction
    if (this.stage === 'directional') {
      if (this.direction === 'up') {
        hitboxWidth = 40;
        hitboxHeight = 24;
        offsetX = 0;
        offsetY = -16; // Push upward to align with fire tip
      } else if (this.direction === 'down') {
        hitboxWidth = 40;
        hitboxHeight = 24;
        offsetX = 0;
        offsetY = 16;  // Push downward
      } else if (this.direction === 'left') {
        hitboxWidth = 24;
        hitboxHeight = 40;
        offsetX = -16; // Push left
        offsetY = 0;
      } else if (this.direction === 'right') {
        hitboxWidth = 24;
        hitboxHeight = 40;
        offsetX = 16;  // Push right
        offsetY = 0;
      }
    } 
    // For middle stage (straight beams), also adjust based on direction
    else if (this.stage === 'middle') {
      if (this.direction === 'up' || this.direction === 'down') {
        hitboxWidth = 40;
        hitboxHeight = 48;
        offsetY = 0;
      } else if (this.direction === 'left' || this.direction === 'right') {
        hitboxWidth = 48;
        hitboxHeight = 40;
        offsetX = 0;
      }
    }

    // Position hitbox at center, then apply offset
    this.hitboxElement.style.width = `${hitboxWidth}px`;
    this.hitboxElement.style.height = `${hitboxHeight}px`;
    this.hitboxElement.style.left = `${centerX - hitboxWidth / 2 + offsetX}px`;
    this.hitboxElement.style.top = `${centerY - hitboxHeight / 2 + offsetY}px`;
    this.hitboxElement.style.transform = `translate(0, 0)`; // No rotation needed since we adjust size

    // Position extra hitbox for directional tips
    if (this.stage === 'directional') {
      let extraWidth = 35;
      let extraHeight = 35;
      let extraOffsetX = 0;
      let extraOffsetY = 0;

      if (this.direction === 'up') {
        extraOffsetY = offsetY - -24; // Connect to top edge of directional
      } else if (this.direction === 'down') {
        extraOffsetY = offsetY + -24; // Connect to bottom edge of directional
      } else if (this.direction === 'left') {
        extraOffsetX = offsetX - -24; // Connect to left edge of directional
      } else if (this.direction === 'right') {
        extraOffsetX = offsetX + -24; // Connect to right edge of directional
      }

      this.extraHitboxElement.style.width = `${extraWidth}px`;
      this.extraHitboxElement.style.height = `${extraHeight}px`;
      this.extraHitboxElement.style.left = `${centerX - extraWidth / 2 + extraOffsetX}px`;
      this.extraHitboxElement.style.top = `${centerY - extraHeight / 2 + extraOffsetY}px`;
    } else {
      // Hide extra hitbox if not in directional stage
      this.extraHitboxElement.style.width = '0px';
      this.extraHitboxElement.style.height = '0px';
    }
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
    this.hitboxElement?.remove();
    this.extraHitboxElement?.remove();
  }
}