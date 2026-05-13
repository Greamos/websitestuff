import { assets } from './assets.js';
import { TILE_TYPE, TILE_PROPS } from './grid.js';
import { RememberSpotMap } from './GameItems/explosion.js';

export class playerv2 {
    constructor(id, spriteUrl, options = {}) {
        this.id = id;
        this.spriteUrl = spriteUrl;
        this.x = null;
        this.y = null;
        this.visualX = null;
        this.visualY = null;
        this.speed = 2.5;
        this.currentDirection = null;
        this.cellSize = 48;
        this.bombRadius = 1;
        this.isDead = false;
        this.img = null;
        this.hitboxElement = null;
        this.myNetState = options.myNetState || null;
        this.hue = options.hue || 0;
        this.direction = 'idle';
        this.facing = 'down';
        this.isWalking = false;
        this.loadedAssets = options.loadedAssets || null;
        this.hitboxWidth = 30;  
        this.hitboxHeight = 30;
    
        // For spritemap: enable this
        this.useSpritesheet = !!(assets && assets.player && assets.player.spritesheet && options.loadedAssets && options.loadedAssets[assets.player.spritesheet]);
        this._spriteMeta = null;
        this._animTimer = null;
        this._animIndex = 0;
}

place(gridApi, x, y) {
    this.x = x;
    this.y = y;
    this.gridApi = gridApi;
    
    // Calculate initial visual position (centered in grid cell)
    this.visualX = x * this.cellSize + this.cellSize / 2;
    this.visualY = y * this.cellSize + this.cellSize / 2;
    
    const visualNudgeY = -12; // Visual offset to make sprite look centered
    
    // Create sprite element if it doesn't exist
    if (!this.img) {
        if (this.useSpritesheet) {
            // Spritesheet mode (animated)
            const div = document.createElement('div');
            div.dataset.playerId = this.id;
            div.className = 'player-sprite';
            div.style.backgroundImage = `url(${assets.player.spritesheet})`;
            div.style.backgroundRepeat = 'no-repeat';
            this.img = div;
            gridApi.container.appendChild(this.img);
            this.initializeSpritesheet();
            this.setIdlePose();
        } else {
            // Simple image mode
            const img = document.createElement('img');
            img.src = this.spriteUrl;
            img.alt = `player-${this.id}`;
            img.dataset.playerId = this.id;
            img.className = 'player-sprite';
            this.img = img;
            gridApi.container.appendChild(this.img);
        }
    }
    
    // Apply hue rotation for player color
    this.img.style.filter = `hue-rotate(${this.hue}deg)`;
    
    // Position sprite at visual coordinates
    this.img.style.left = `${this.visualX}px`;
    this.img.style.top = `${this.visualY + visualNudgeY}px`;
    
    // Create hitbox if it doesn't exist
    if (!this.hitboxElement) {
        this.hitboxElement = document.createElement('div');
        this.hitboxElement.className = 'player-hitbox';
        this.hitboxElement.style.width = `${this.hitboxWidth}px`;
        this.hitboxElement.style.height = `${this.hitboxHeight}px`;
        gridApi.container.appendChild(this.hitboxElement);
    }
    
    // Position hitbox at visual coordinates
    this.hitboxElement.style.left = `${this.visualX - 15}px`;
    this.hitboxElement.style.top = `${this.visualY + visualNudgeY - 15}px`;
}

//=-=-=-=-=-=-=-=-=-=-=-=//


// ==========================================
// SPRITESHEET ANIMATION SYSTEM
// ==========================================

/**
 * Initialize spritesheet metadata (columns, rows, frame sizes)
 * Called once when sprite is first created
 */
initializeSpritesheet() {
    try {
        const sheetPath = assets.player.spritesheet;
        const sheetImage = this.loadedAssets && this.loadedAssets[sheetPath];
        const frameWidth = assets.player.frameWidth || 20;
        const frameHeight = assets.player.frameHeight || 40;

        // If spritesheet not loaded, fall back to simple image mode
        if (!sheetImage || !sheetImage.width || !sheetImage.height) {
            console.warn('Spritesheet not loaded - using simple image mode');
            this.useSpritesheet = false;
            this._spriteMeta = null;
            return;
        }

        // Calculate how many frames fit in the spritesheet
        const columns = Math.floor(sheetImage.width / frameWidth);
        const rows = Math.floor(sheetImage.height / frameHeight);

        // Get display size from CSS or use frame size as default
        const baseDisplayWidth = this.img.clientWidth || frameWidth;
        const baseDisplayHeight = 48;
        // this.img.clientHeight || frameHeight;

        // Apply optional scaling from config
        const renderScale = (assets?.player?.renderScale) || 1;
        const displayWidth = Math.round(baseDisplayWidth * renderScale);
        const displayHeight = Math.round(baseDisplayHeight * renderScale);

        // Set element size if scaled
        if (renderScale !== 1) {
            this.img.style.width = `${displayWidth}px`;
            this.img.style.height = `${displayHeight}px`;
        }

        // Calculate scale factors (display pixels per source pixel)
        const scaleX = displayWidth / frameWidth;
        const scaleY = displayHeight / frameHeight;

        // Optional offsets from config
        const sourceOffsetX = assets?.player?.sheetOffsetX || 0;
        const sourceOffsetY = assets?.player?.sheetOffsetY || 0;
        const renderNudgeX = assets?.player?.renderOffsetX || 0;
        const renderNudgeY = assets?.player?.renderOffsetY || 0;

        // Convert source offsets to display offsets
        const displayOffsetX = Math.round((sourceOffsetX * scaleX + renderNudgeX) * 100) / 100;
        const displayOffsetY = Math.round((sourceOffsetY * scaleY + renderNudgeY) * 100) / 100;

        // Store all metadata for later use
        this._spriteMeta = {
            columns,
            rows,
            frameWidth,
            frameHeight,
            displayWidth,
            displayHeight,
            scaleX,
            scaleY,
            displayOffsetX,
            displayOffsetY,
            defaultBackgroundSize: `${columns * displayWidth}px ${rows * displayHeight}px`
        };

        // Set the background size to show entire spritesheet scaled properly
        this.img.style.backgroundSize = this._spriteMeta.defaultBackgroundSize;

    } catch (err) {
        console.warn('Failed to initialize spritesheet:', err);
        this._spriteMeta = null;
    }
}

/**
 * Show a specific frame from the spritesheet by index
 * Index 0 = top-left, counts left-to-right, top-to-bottom
 */
showSpriteFrame(frameIndex) {
    if (!this.img || !this._spriteMeta) return;

    const meta = this._spriteMeta;
    const column = frameIndex % meta.columns;
    const row = Math.floor(frameIndex / meta.columns);

    // Calculate position of this frame in display pixels
    const frameX = meta.displayOffsetX + column * meta.displayWidth;
    const frameY = meta.displayOffsetY + row * meta.displayHeight;

    // Support optional frame trimming (cropping transparent edges)
    const frameBoxes = assets?.player?.frameBoxes || {};
    const globalTrim = Number(assets?.player?.globalFrameTrim) || 0;
    const forceGlobal = assets?.player?.forceGlobalFrameTrim || false;

    // Helper to create trim box from trim value
    const createTrimBox = (trimPixels) => {
    const topTrim = trimPixels;
    const bottomTrim = Math.floor(trimPixels * 0.3); // Only take 20% from the bottom!
    // is used to fix the cutt of, as op 30 apr, this works for face down//

    return {
        x: trimPixels, // Left trim
        y: topTrim,    // Top trim
        width: meta.frameWidth - (trimPixels * 2),
        height: meta.frameHeight - (topTrim + bottomTrim) // <--- NEW MATH
    };
};

    // Determine if this frame has custom trimming
    let trimBox = null;
    if (forceGlobal && globalTrim > 0) {
        trimBox = createTrimBox(globalTrim);
    } else if (frameBoxes[frameIndex]) {
        trimBox = frameBoxes[frameIndex];
    } else if (globalTrim > 0) {
        trimBox = createTrimBox(globalTrim);
    }

    // Apply trimming if needed
    if (trimBox && trimBox.width > 0 && trimBox.height > 0) {
        // Scale the cropped area to fill the element
        const scaleX = meta.displayWidth / trimBox.width;
        const scaleY = meta.displayHeight / trimBox.height;
        
        const sheetWidth = meta.columns * meta.frameWidth * scaleX;
        const sheetHeight = meta.rows * meta.frameHeight * scaleY;
        
        this.img.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
        
        const posX = -(column * meta.frameWidth + trimBox.x) * scaleX - meta.displayOffsetX;
        const posY = -(row * meta.frameHeight + trimBox.y) * scaleY - meta.displayOffsetY;
        
        this.img.style.backgroundPosition = `${posX}px ${posY}px`;
    } else {
        // No trimming - just offset to the frame position
        this.img.style.backgroundSize = meta.defaultBackgroundSize;
        this.img.style.backgroundPosition = `-${frameX}px -${frameY}px`;
    }
}

/**
 * Convert animation definition to array of frame indices
 * Handles various formats: arrays, row/start/count objects, etc.
 */
getFrameIndices(animationDef) {
    if (!this._spriteMeta) return [0];
    
    // Already an array of frame indices
    if (Array.isArray(animationDef)) {
        return animationDef;
    }
    
    // Object format: { row: 2, start: 0, count: 4 }
    if (animationDef && typeof animationDef === 'object') {
        const row = animationDef.row || 0;
        const start = animationDef.start || 0;
        const count = animationDef.count || 1;
        const columns = this._spriteMeta.columns;
        
        const frames = [];
        for (let i = 0; i < count; i++) {
            frames.push(row * columns + start + i);
        }
        return frames;
    }
    
    // Fallback to first frame
    return [0];
}

/**
 * Start looping through animation frames
 */
startAnimationLoop(frameIndices, framesPerSecond) {
    if (!frameIndices || frameIndices.length === 0) return;
    
    this.stopAnimationLoop();
    
    const fps = framesPerSecond || assets?.player?.fps || 8;
    const interval = Math.max(1, Math.round(1000 / fps));
    
    this._animIndex = 0;
    this.showSpriteFrame(frameIndices[this._animIndex]);
    
    this._animTimer = setInterval(() => {
        this._animIndex = (this._animIndex + 1) % frameIndices.length;
        this.showSpriteFrame(frameIndices[this._animIndex]);
    }, interval);
}

/**
 * Play animation once then call callback
 */
playAnimationOnce(frameIndices, framesPerSecond, onComplete) {
    if (!frameIndices || frameIndices.length === 0) {
        if (onComplete) onComplete();
        return;
    }
    
    const fps = framesPerSecond || assets?.player?.fps || 8;
    const interval = Math.max(1, Math.round(1000 / fps));
    
    this._oneShotIndex = 0;
    this.showSpriteFrame(frameIndices[this._oneShotIndex]);
    
    this._oneShotTimer = setInterval(() => {
        this._oneShotIndex++;
        if (this._oneShotIndex >= frameIndices.length) {
            clearInterval(this._oneShotTimer);
            this._oneShotTimer = null;
            if (onComplete) onComplete();
            return;
        }
        this.showSpriteFrame(frameIndices[this._oneShotIndex]);
    }, interval);
}

/**
 * Stop all sprite animations
 */
stopAnimationLoop() {
    if (this._animTimer) {
        clearInterval(this._animTimer);
        this._animTimer = null;
    }
    if (this._oneShotTimer) {
        clearInterval(this._oneShotTimer);
        this._oneShotTimer = null;
        this._oneShotIndex = 0;
    }
}

/**
 * Set sprite to idle pose (not moving)
 */
setIdlePose() {
    const idleAnimation = assets?.player?.animations?.idle;
    let idleDefinition = null;
    
    if (idleAnimation) {
        // Use direction-specific idle if available (e.g., idle.down, idle.left)
        if (typeof idleAnimation === 'object' && idleAnimation[this.facing]) {
            idleDefinition = idleAnimation[this.facing];
        } else if (idleAnimation.row != null || Array.isArray(idleAnimation)) {
            idleDefinition = idleAnimation;
        }
    }
    
    const frames = this.getFrameIndices(idleDefinition || [0]);
    this.stopAnimationLoop();
    this.showSpriteFrame(frames[0]);
}

/**
 * Start walking animation in a direction
 */
startWalk(direction) {
    if (!this.img) return;
    if (this.isWalking && this.direction === direction) return;
    
    this.direction = direction;
    this.facing = direction; // Remember for idle pose
    this.isWalking = true;

    // Spritesheet mode - animate frames
    if (this.useSpritesheet) {
        const walkAnimations = assets?.player?.animations?.walk;
        const animDef = walkAnimations?.[direction] || 
                       assets?.player?.animations?.[direction] || 
                       walkAnimations?.down || 
                       [0];
        
        const frames = this.getFrameIndices(animDef);
        this.startAnimationLoop(frames, assets?.player?.fps);
        return;
    }

    // Simple image mode - swap to walk sprite
    const walkSprite = assets?.player?.walk?.[direction] || this.spriteUrl;
    if (this.img.tagName === 'IMG') {
        this.img.src = walkSprite;
    }
}

update(direction, gridApi) {
    if (this.isDead) return;

    // Handle Animations
    if (!direction) {
        this.stopWalk();
        return;
    }

    // Save old direction BEFORE startWalk() overwrites it
    const oldDirection = this.direction;
    this.startWalk(direction);

    const halfW = this.hitboxWidth / 2;
    const halfH = this.hitboxHeight / 2;

    // ===== GRID SNAPPING ON DIRECTION CHANGE =====
    // If switching between horizontal and vertical movement,
    // snap the perpendicular axis to the center of the current tile
    const prevWasHorizontal = (oldDirection === 'left' || oldDirection === 'right');
    const nowIsHorizontal = (direction === 'left' || direction === 'right');

    if (prevWasHorizontal !== nowIsHorizontal) {
        if (nowIsHorizontal) {
            // Switching to horizontal — snap Y to center of current row
            this.visualY = this.y * this.cellSize + this.cellSize / 2;
        } else {
            // Switching to vertical — snap X to center of current column
            this.visualX = this.x * this.cellSize + this.cellSize / 2;
        }
    }

    // ===== CONTINUOUS AUTO-ALIGNMENT =====
    // While moving horizontally, nudge toward row center.
    // While moving vertically, nudge toward column center.
    // This prevents drifting off-center between direction changes.
    if (nowIsHorizontal) {
        const rowCenter = this.y * this.cellSize + this.cellSize / 2;
        const diff = rowCenter - this.visualY;
        if (Math.abs(diff) > 0.5) {
            this.visualY += Math.sign(diff) * Math.min(this.speed, Math.abs(diff));
        }
    } else {
        const colCenter = this.x * this.cellSize + this.cellSize / 2;
        const diff = colCenter - this.visualX;
        if (Math.abs(diff) > 0.5) {
            this.visualX += Math.sign(diff) * Math.min(this.speed, Math.abs(diff));
        }
    }
    // ===============================================

    let nextX = this.visualX;
    let nextY = this.visualY;

    if (direction === 'up')    nextY -= this.speed;
    if (direction === 'down')  nextY += this.speed;
    if (direction === 'left')  nextX -= this.speed;
    if (direction === 'right') nextX += this.speed;

    // 4. Collision Detection (The Two-Corner Check)
    let canMove = false;

    if (direction === 'left') {
        // Check Top-Left and Bottom-Left corners of the hitbox
        const tl = this.isTileWalkable(nextX - halfW, this.visualY - halfH, gridApi);
        const bl = this.isTileWalkable(nextX - halfW, this.visualY + halfH, gridApi);
        if (tl && bl) canMove = true;
    } 
    else if (direction === 'right') {
        // Check Top-Right and Bottom-Right corners of the hitbox
        const tr = this.isTileWalkable(nextX + halfW, this.visualY - halfH, gridApi);
        const br = this.isTileWalkable(nextX + halfW, this.visualY + halfH, gridApi);
        if (tr && br) canMove = true;
    } 
    else if (direction === 'up') {
        // Check Top-Left and Top-Right corners of the hitbox
        const tl = this.isTileWalkable(this.visualX - halfW, nextY - halfH, gridApi);
        const tr = this.isTileWalkable(this.visualX + halfW, nextY - halfH, gridApi);
        if (tl && tr) canMove = true;
    } 
    else if (direction === 'down') {
        // Check Bottom-Left and Bottom-Right corners of the hitbox
        const bl = this.isTileWalkable(this.visualX - halfW, nextY + halfH, gridApi);
        const br = this.isTileWalkable(this.visualX + halfW, nextY + halfH, gridApi);
        if (bl && br) canMove = true;
    }

    // 5. Apply Movement if valid
    if (canMove) {
        this.visualX = nextX;
        this.visualY = nextY;

        // Sync Logical Grid Position (centered for bomb placement)
        this.x = Math.floor(this.visualX / this.cellSize);
        this.y = Math.floor(this.visualY / this.cellSize);
    }

    // 6. Final Render Update
    this.render();
}

/**
 * Helper to check if a specific pixel coordinate is inside a walkable tile
 */
isTileWalkable(pixelX, pixelY, gridApi) {
    const gx = Math.floor(pixelX / this.cellSize);
    const gy = Math.floor(pixelY / this.cellSize);
    const type = gridApi.getType(gx, gy);
    
    if (!TILE_PROPS[type]) return false;
    
    // Bombs: walkable only while the player's center is still on that bomb tile
    if (type === TILE_TYPE.bomb) {
        return (this.x === gx && this.y === gy);
    }
    
    return TILE_PROPS[type].walkable;
}    




/**
 * Stop walking animation and return to idle
 */
stopWalk() {
    if (!this.img) return;
    
    this.isWalking = false;
    this.direction = 'idle';

    if (this.useSpritesheet) {
        this.stopAnimationLoop();

        // Play optional stop/transition animation before idle
        const animations = assets?.player?.animations;
        const transitionAnim = animations?.walkEnd || animations?.stop || animations?.['walk-stop'];
        
        if (transitionAnim) {
            const def = transitionAnim[this.facing] || transitionAnim;
            const frames = this.getFrameIndices(def);
            
            if (frames && frames.length) {
                this.playAnimationOnce(frames, assets?.player?.fps, () => this.setIdlePose());
                return;
            }
        }

        this.setIdlePose();
        return;
    }

    // Simple image mode - swap to idle sprite
    const idleSprite = assets?.player?.idle || this.spriteUrl;
    if (this.img.tagName === 'IMG') {
        this.img.src = idleSprite;
    }
}

placeBomb() {

  console.log("Attempting to place bomb at", this.x, this.y);
  const x = this.x;
  const y = this.y;
  const radius = this.bombRadius || 1; // the size of bomb explosion!
  const currentTileType = this.gridApi.getType(x, y);

  if (currentTileType === TILE_TYPE.bomb) {
      return null;
  }
  if (x == null || y == null) return;
  
  RememberSpotMap.set(`${x},${y}`, currentTileType);
  
  this.gridApi.setType(x, y, TILE_TYPE.bomb);
      if (this.myNetState) {
        this.myNetState.setState("bomb", {
           x: this.x, 
           y: this.y, 
           id: Date.now(),
           radius: radius
          }); // this is the line that sends the bomb placement to other players
    
        }
  console.log('Bomb planted at', x, y);
  return { x, y, fuse: 3000, radius: radius };
}


die() {
    console.log("Player died!");
    
    // Stop ALL animation timers before removing the DOM element
    this.stopAnimationLoop();
    
    if (this.img) {
        this.img.remove();
        this.img = null;
        this.hitboxElement?.remove();
    }
    
    // 2. Add an 'isDead' flag so your Input file knows to stop moving the player
    this.isDead = true;
    
    if (this.myNetState) {
    this.myNetState.setState("isDead", true); } // send death state to other players
    // 3. Optional: Add a death animation, or trigger a game-over UI
    }

  // Add this inside the class playerv2 {}
moveTo(gridApi, x, y) {
    this.x = x;
    this.y = y;
    // Just snap them to the right pixel for now
    this.visualX = x * this.cellSize + this.cellSize / 2;
    this.visualY = y * this.cellSize + this.cellSize / 2;
    
    // We need to call a render function to update the CSS
    this.render(); 
}

// Store network target position for smooth interpolation
setNetworkTarget(gridX, gridY, facingDirection) {
    this._netTargetX = gridX;
    this._netTargetY = gridY;
    this._netTargetVisualX = gridX * this.cellSize + this.cellSize / 2;
    this._netTargetVisualY = gridY * this.cellSize + this.cellSize / 2;
    this._hasNetTarget = true;
    
    // Update facing so remote sprites animate correctly
    if (facingDirection) {
        this.facing = facingDirection;
        if (this.isWalking) this.startWalk(facingDirection);
    }
}

// Smoothly interpolate toward the network target (call every tick with deltaTime)
lerpToNetwork(deltaTime) {
    if (this.isDead || !this.img || !this._hasNetTarget) return;
    
    const lerpSpeed = 0.15; // How fast to catch up (0-1, higher = snappier)
    const threshold = 1.5;   // Stop lerping when within this many pixels
    
    const dx = this._netTargetVisualX - this.visualX;
    const dy = this._netTargetVisualY - this.visualY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < threshold) {
        // Close enough — snap to exact target
        this.visualX = this._netTargetVisualX;
        this.visualY = this._netTargetVisualY;
        this.x = this._netTargetX;
        this.y = this._netTargetY;
        this._hasNetTarget = false;
        this.stopWalk();
        this.isWalking = false;
    } else {
        // Smoothly move toward target (frame-rate independent)
        const factor = 1 - Math.pow(1 - lerpSpeed, deltaTime / 16.67);
        this.visualX += dx * factor;
        this.visualY += dy * factor;
        
        // Update logical grid position
        this.x = Math.floor(this.visualX / this.cellSize);
        this.y = Math.floor(this.visualY / this.cellSize);
        
        // Determine facing direction from movement
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.facing = dy > 0 ? 'down' : 'up';
        }
        
        if (!this.isWalking) {
            this.startWalk(this.facing);
        } else if (this.direction !== this.facing) {
            this.startWalk(this.facing);
        }
    }
    
    this.render();
}

render() {
    const visualNudgeY = -12;
    const halfW = this.hitboxWidth / 2;
    const halfH = this.hitboxHeight / 2;
    if (this.img) {
        this.img.style.left = `${this.visualX}px`;
        this.img.style.top = `${this.visualY + visualNudgeY}px`;
    }
    
    if (this.hitboxElement) {
        // Use halfW and halfH to center the box perfectly
        this.hitboxElement.style.left = `${this.visualX - halfW}px`;
        this.hitboxElement.style.top = `${this.visualY + visualNudgeY - halfH}px`;
    }
}}
