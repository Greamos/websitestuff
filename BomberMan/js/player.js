import { assets } from './assets.js';

export class Player {
  // options: { moveDuration: number (ms) }
  constructor(id, spriteUrl, options = {}) {
    this.id = id;
    this.spriteUrl = spriteUrl;
    this.x = null;
    this.y = null;
    this.img = null;
    this.direction = 'idle';
    this.isWalking = false;
    this.isMoving = false;
    this.moveDuration = options.moveDuration || 380; // SPEEEEED
  }

  place(gridApi, x, y) {
    this.x = x;
    this.y = y;
    this.gridApi = gridApi;
    // reuse existing image element if present, otherwise create it
    if (!this.img) {
      const img = document.createElement('img');
      img.src = this.spriteUrl;
      img.alt = `player-${this.id}`;
      img.dataset.playerId = this.id;
      img.className = 'player-sprite';
      // set transition duration from instance setting via CSS variable
      img.style.setProperty('--move-duration', `${this.moveDuration}ms`);
      this.img = img;
      // append once to the grid container so we can absolute-position it
      gridApi.container.appendChild(this.img);
    } else {
      // ensure transition duration stays in sync if changed
      this.img.style.setProperty('--move-duration', `${this.moveDuration}ms`);
    }

    // position the floating image at the center of the target cell
    const cell = gridApi.getCell(x, y);
    const gridRect = gridApi.container.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const left = cellRect.left - gridRect.left + cellRect.width / 2;
    const top = cellRect.top - gridRect.top + cellRect.height / 2;
    this.img.style.left = `${left}px`;
    this.img.style.top = `${top}px`;
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
}

// instance methods for animation control
Player.prototype.startWalk = function(direction) {
  if (!this.img) return;
  if (this.isWalking && this.direction === direction) return;
  this.direction = direction;
  this.isWalking = true;
  const path = (assets && assets.player && assets.player.walk && assets.player.walk[direction]) || this.spriteUrl;
  this.img.src = path;
};

Player.prototype.stopWalk = function() {
  if (!this.img) return;
  this.isWalking = false;
  this.direction = 'idle';
  const idle = (assets && assets.player && assets.player.idle) || this.spriteUrl;
  this.img.src = idle;
};

// allow changing movement speed (ms) at runtime
Player.prototype.setSpeed = function(ms) {
  this.moveDuration = ms;
  if (this.img) this.img.style.setProperty('--move-duration', `${ms}ms`);
};

