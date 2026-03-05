


let LastTime = 0;
let OnTickCallback = null;

export function startTick(callback) {
  OnTickCallback = callback;
  requestAnimationFrame(TickUpdate);
}

function TickUpdate(CurrentTime) {
// the hearthbeat of the game,//

if (LastTime === 0) {
    LastTime = CurrentTime; // Set the start point
    requestAnimationFrame(TickUpdate);
    return; // Exit early so we don't send a huge deltaTime to the game
}


const deltaTime = CurrentTime - LastTime;
LastTime = CurrentTime;

if (OnTickCallback) {
    OnTickCallback(deltaTime);
}



// console.log('Delta time:', deltaTime);


requestAnimationFrame(TickUpdate); // schedule the next tick
}



// requestAnimationFrame(TickUpdate);