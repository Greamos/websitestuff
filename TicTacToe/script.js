// svg icons for X and O, stored as strings for easy insertion into grid cells
const svgX = ` 
<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <line x1="25" y1="25" x2="75" y2="75" stroke="#B44749" stroke-width="10" stroke-linecap="round" />
  <line x1="75" y1="25" x2="25" y2="75" stroke="#B44749" stroke-width="10" stroke-linecap="round" />
</svg>`;
const svgO = `
<svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="35" stroke="#5E7E8F" stroke-width="10" fill="none" />
</svg>`;



const CellState = {
    EMPTY: 'empty',
    X: 'x',
    O: 'o'
};
// the winning combo's
const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

const gridItems = [];
const cellStates = []; // will be filled in createGrid
let currentPlayer = CellState.X; // X starts first

let aiMode = false; // AI mode flag
let aiStart = false;;
let aiCheat = true;
let gameOver = false; // true when a win/draw has been declared

// debug and per-side offsets for cheat ghost placement
let cheatDebugMode = false; // when true, will render ghosts on all sides for testing
const cheatConfig = {
    gap: 6, // px between real cell and ghost
    // per-side nudges to fine tune alignment {x, y}
    offsets: {
        left: { x: 5, y: 0 },
        right: { x: -5, y: 0 },
        top: { x: 0, y: 5 },
        bottom: { x: 0, y: -5 }
    }
};
let wincheckarray = [];

function startgamecheck() {
    // return true only if all 9 cells exist and are EMPTY
    return cellStates.length === 9 && cellStates.every(state => state === CellState.EMPTY);
}

function turnmanager() {
    // swap current player
    currentPlayer = (currentPlayer === CellState.X) ? CellState.O : CellState.X;
    document.body.classList.toggle('dark-mode');
    document.getElementById('btn_Player1').textContent = (currentPlayer === CellState.X) ? "Player 1" : "Player 2";    
}

function OnGridClick(index) {
    if (gameOver) return; // block input after game over

    const i = index - 1; // convert to 0-based

    // bounds check
    if (i < 0 || i >= cellStates.length) return;

    // only allow placing on empty cell
    if (cellStates[i] !== CellState.EMPTY) return;

    // place current player's mark (state + visual)
    cellStates[i] = currentPlayer;
    gridItems[i].innerHTML = (currentPlayer === CellState.X) ? svgX : svgO;
    
    // 1. Capture if there is a winner
    const winner = checkWin();
    if (winner) {
        showWinner(winner);
        return;
    }

    // 2. Check if the board is completely full
    const isBoardFull = !cellStates.includes(CellState.EMPTY);

    // If full and cheat is enabled, trigger cheat; otherwise show draw
    if (!winner && isBoardFull) {
        if (aiCheat && !aiStart) {
            triggerCheatAnimation(i);
            return; // cheat flow will handle the rest
        }
        showDraw();
        return;
    }

    // then swap turn
    turnmanager();

    // if AI mode is on and it's AI's turn, perform AI move
    if (aiMode && currentPlayer === CellState.O && !isBoardFull && !winner) {
        performAIMove();
    }
}

function checkWin() {
   for (let i = 0; i < winningCombinations.length; i++) {
        const combination = winningCombinations[i]; // Example: [0, 1, 2]

        const indexA = combination[0]; // 0
        const indexB = combination[1]; // 1
        const indexC = combination[2]; // 2

        const valueA = cellStates[indexA]; // 'x', 'o', or 'empty'
        const valueB = cellStates[indexB];
        const valueC = cellStates[indexC];

        if (valueA !== CellState.EMPTY) {
            if (valueA === valueB) {
                if (valueA === valueC) {
                    // console.log(`Player ${valueA.toUpperCase()} wins!`);
                        drawline(indexA, indexC, valueA); // Draw line between first and third cell of the winning combo
                    return valueA; // We have a winner
                }
            }
        }
   }
    return null; // No winner yet
};


function drawline(FirstCell, SecondCell, winner) {

    const gameGrid = document.getElementById('game-grid');
    const gridRect = gameGrid.getBoundingClientRect();

    const rect1 = gridItems[FirstCell].getBoundingClientRect(); // =-=-=-=-//
    const centerX1 = rect1.left + rect1.width / 2; // this gets the center of the cell in terms of screen coordinates
    const centerY1 = rect1.top + rect1.height / 2; // -=-=-=-=- //
    // console.log(centerX1, centerY1);

    const rect2 = gridItems[SecondCell].getBoundingClientRect(); // =-=-=-=-//
    const centerX2 = rect2.left + rect2.width / 2; // this gets the center of the cell in terms of screen coordinates
    const centerY2 = rect2.top + rect2.height / 2; // -=-=-=-=- //
    //  console.log(centerX2, centerY2);

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
            
            svg.style.position = "absolute";
            svg.style.left = gridRect.left + "px";
            svg.style.top = gridRect.top + "px";
            svg.style.pointerEvents = "none"; // Let clicks pass through
            svg.setAttribute("width", gridRect.width);
            svg.setAttribute("height", gridRect.height);
            svg.style.width = gridRect.width + "px";
            svg.style.height = gridRect.height + "px";
            // must sit above the grid (grid uses z-index:100)
            svg.style.zIndex = "1000";
            svg.setAttribute("id", "win-line");


                    const color = (winner === CellState.X)
                    ? getComputedStyle(document.body).getPropertyValue('--line-x')
                    : getComputedStyle(document.body).getPropertyValue('--line-o');
                    

                    const line = document.createElementNS(svgNS, "line");
                    line.setAttribute("x1", centerX1 - gridRect.left);
                    line.setAttribute("y1", centerY1 - gridRect.top);
                    line.setAttribute("x2", centerX2 - gridRect.left);
                    line.setAttribute("y2", centerY2 - gridRect.top);
                    line.setAttribute("stroke", color.trim()); 
                    line.setAttribute("stroke-width", "8");
                    line.setAttribute("stroke-linecap", "round");

            svg.appendChild(line);
            document.body.appendChild(svg); // or overlay it on your grid
}



function createGrid() {
    const gameGrid = document.getElementById('game-grid');
    if (!gameGrid) return;

    // clear in case of re-create
    gameGrid.innerHTML = '';
    gridItems.length = 0;
    cellStates.length = 0;

    for (let i = 1; i <= 9; i++) {
        const griditem = document.createElement('div');
        griditem.classList.add('grid-item');
        griditem.dataset.index = i;
        griditem.innerHTML = '';  // start empty
        griditem.addEventListener('click', () => OnGridClick(i));
        gameGrid.appendChild(griditem);
        gridItems.push(griditem);
        cellStates.push(CellState.EMPTY);
    }

    // CHECKER FOR CELLSTATES CONSOLE//
       if (cellStates.length === 9) {
        // console.log("Grid initialized:", cellStates);
    }
     
}

function resetBoard() {
    // clear logical board + visuals
    cellStates.fill(CellState.EMPTY);
    gridItems.forEach(item => item.innerHTML = '');
    currentPlayer = CellState.X;
    document.body.classList.remove('dark-mode');

    // remove any existing lines/ghosts
    document.querySelectorAll('#win-line').forEach(el => el.remove());
    const cheatLine = document.getElementById('cheat-line-svg');
    if (cheatLine) cheatLine.remove();
    document.querySelectorAll('.ghost-container').forEach(el => el.remove());

    // clear game-over state / overlay
    gameOver = false;
    const overlay = document.getElementById('winner-overlay');
    if (overlay) overlay.remove();
    // re-enable grid input (CSS helper)
    const gameGrid = document.getElementById('game-grid');
    if (gameGrid) gameGrid.classList.remove('disabled-grid');

    // reset UI player label
    const pBtn = document.getElementById('btn_Player1');
    if (pBtn) pBtn.textContent = 'Player 1';
}



function aimodecheck(){
    const aiBtn = document.getElementById('btn_AI');
    if (!aiBtn) return;

    aiMode = aiBtn.classList.contains('active'); // keep var in sync
    if (aiMode) {
        document.body.style.backgroundColor = getComputedStyle(aiBtn).getPropertyValue('background-color').trim();
        resetBoard();
        if (aiStart) {
            currentPlayer = CellState.O; // ensure AI's turn before it moves
            performAIMove();
        }
    } else {
        
        document.body.style.backgroundColor = '';
        resetBoard();
    }
}


function performAIMove() {
    // Simple AI: pick the first empty cell
    wincheckarray.length = 0;
    for (let i = 0; i < cellStates.length; i++) {
        if (cellStates[i] !== CellState.EMPTY) continue;
        checkforwinnings(i);
        console.log('checking index', i);
        }
        
        const immediateWin = wincheckarray.find(entry =>
        winningCombinations.some(combo =>
        combo.includes(entry.index) &&
        combo.every(pos => pos === entry.index || cellStates[pos] === CellState.O)
        )
    );
    if (immediateWin) {
        console.log('AI immediate win at index', immediateWin.index);
        chooseAIMove(immediateWin.index);
        return;
    }

    const emptyCount = cellStates.filter(s => s === CellState.EMPTY).length;
    const lastEmptyIndex = cellStates.findIndex(s => s === CellState.EMPTY);
        console.log('cheat-check:', { aiCheat, aiStart, currentPlayer, emptyCount, lastEmptyIndex });
    // only trigger cheat when: cheat enabled, AI did NOT start the game,
    // it's AI's turn, and there's exactly one empty cell left (valid index)
    if (aiCheat && !aiStart && currentPlayer === CellState.O && emptyCount === 1 && lastEmptyIndex !== -1) {
        triggerCheatAnimation(lastEmptyIndex);
        return;
    }

        bubblesortcombo();
    }



function checkforwinnings(index) {
    // Check if AI can win in the next move
    let totalScore = 0;
    // const combosForIndex = [];

    for (let i = 0; i < winningCombinations.length; i++) { 
        const combo = winningCombinations[i];
        if (combo.includes(index)) {
            totalScore += scorecombohelper(combo, index, cellStates, CellState.O);
        }
    }
    // push the final count once (not on every iteration)
        wincheckarray.push({ index: index, score: totalScore });
        console.log(`checkforwinnings: index=${index} totalScore=${totalScore}`);
}

function bubblesortcombo() {
    console.log("choosing move based on wincheckarray...");

    // guard: nothing scored — pick the first empty cell (or bail out)
    if (!wincheckarray || wincheckarray.length === 0) {
        const fallbackIndex = cellStates.findIndex(s => s === CellState.EMPTY);
        console.log('bubblesortcombo: no scores, falling back to', fallbackIndex);
        if (fallbackIndex !== -1) chooseAIMove(fallbackIndex);
        return;
    }

    // bubble-sort whole objects by their score (descending)
    for (let i = 0; i < wincheckarray.length; i++) {
        for (let j = 0; j < wincheckarray.length - i - 1; j++) {
            if (wincheckarray[j].score < wincheckarray[j + 1].score) {
                const tmp = wincheckarray[j];
                wincheckarray[j] = wincheckarray[j + 1];
                wincheckarray[j + 1] = tmp;
            }
        }
    }

    console.log('sorted wincheckarray:', wincheckarray);
    chooseAIMove(wincheckarray[0].index);
}

function scorecombohelper(comboPositions, candidateIndex, boardState, aiMark) {
    // opponent mark (assume two-player X/O)
    const opponentMark = (aiMark === CellState.O) ? CellState.X : CellState.O;

    // counts inside this combo (treat candidateIndex as if AI already occupies it)
    let aiMarksInCombo = 0;
    let opponentMarksInCombo = 0;

    for (const pos of comboPositions) {
        if (pos === candidateIndex) {
            aiMarksInCombo++; // pretend AI is here
        } else {
            const state = boardState[pos];
            if (state === aiMark) aiMarksInCombo++;
            else if (state === opponentMark) opponentMarksInCombo++;
        }  
    }

        const emptyPositions = comboPositions.filter(p => boardState[p] === CellState.EMPTY);
    if (opponentMarksInCombo === 2 && emptyPositions.length === 1 && emptyPositions[0] === candidateIndex) {
        return 900; // block opponent (priority below AI win but above other moves)
    }


    // blocked by opponent — no value
    if (opponentMarksInCombo > 0){
        console.log('scorecombohelper: combo blocked', comboPositions, 'candidate', candidateIndex);
        return 0;
    }

    

    let score = 1;
    if (aiMarksInCombo >= 3) return 1000; // already/completed win (very high)
    if (aiMarksInCombo === 2) return 100; // immediate winning move
    if (aiMarksInCombo === 1) return 10;  // extends AI line

    console.log('scorecombohelper:', { combo: comboPositions, candidateIndex, aiMarksInCombo, opponentMarksInCombo, score });
    return score;
}


function chooseAIMove(index = 0) {
    // Choose the move with the highest score from wincheckarray
    if (cellStates[index] === CellState.EMPTY) {
        cellStates[index] = CellState.O;
        gridItems[index].innerHTML = svgO;

        const winner = checkWin();
        if (winner) {
            showWinner(winner);
            return;
        }

        const isBoardFull = !cellStates.includes(CellState.EMPTY);
        if (isBoardFull) {
            showDraw();
            return;
        }

        turnmanager();
    }
}
    


function findCheatCoordinates() {
    // Loop through all possible winning lines
    for (let i = 0; i < winningCombinations.length; i++) {
        const [a, b, c] = winningCombinations[i];

        // CHECK 1: The pair is at the START (Index 0 and 1 of the combo)
        // Example: [O, O, X] -> We need to extend OUTSIDE from 'a' (Index 0)
        if (cellStates[a] === CellState.O && cellStates[b] === CellState.O) {
            return {
                edgeIndex: a,   // This is the cell on the border (e.g., left)
                innerIndex: b,  // This is the neighbor inside
                blockedIndex: c // This is the X that forced us to cheat
            };
        }

        // CHECK 2: The pair is at the END (Index 1 and 2 of the combo)
        // Example: [X, O, O] -> We need to extend OUTSIDE from 'c' (Index 2)
        if (cellStates[b] === CellState.O && cellStates[c] === CellState.O) {
            return {
                edgeIndex: c,   // This is the cell on the border (e.g., right)
                innerIndex: b,  // This is the neighbor inside
                blockedIndex: a // This is the X that forced us to cheat
            };
        }
    }
    return null; // Should not happen if AI played correctly to set this up
}   

// show winner / draw overlay and block input
function showWinner(winnerMark) {
    gameOver = true;
    const gameGrid = document.getElementById('game-grid');
    if (gameGrid) gameGrid.classList.add('disabled-grid');

    // ensure win-line is on top (already set in drawline)

    const overlayId = 'winner-overlay';
    let overlay = document.getElementById(overlayId);
    // show "AI (O) wins!" when AI mode is active, otherwise show Player 2
    const text = (winnerMark === CellState.X)
        ? 'Player 1 (X) wins!'
        : (aiMode ? 'AI (O) wins!' : 'Player 2 (O) wins!');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'winner-overlay';
        overlay.innerHTML = `<div class="winner-box"><h2>${text}</h2><button id="overlay-reset">Play again</button></div>`;
        document.body.appendChild(overlay);
        document.getElementById('overlay-reset')?.addEventListener('click', resetBoard);
    } else {
        overlay.querySelector('h2').textContent = text;
        overlay.style.display = 'flex';
    }

    // update small UI label too
    const pBtn = document.getElementById('btn_Player1');
    if (pBtn) pBtn.textContent = text;
}

function showDraw() {
    gameOver = true;
    const gameGrid = document.getElementById('game-grid');
    if (gameGrid) gameGrid.classList.add('disabled-grid');

    const overlayId = 'winner-overlay';
    let overlay = document.getElementById(overlayId);
    const text = 'Draw — no winner';

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'winner-overlay';
        overlay.innerHTML = `<div class="winner-box"><h2>${text}</h2><button id="overlay-reset">Play again</button></div>`;
        document.body.appendChild(overlay);
        document.getElementById('overlay-reset')?.addEventListener('click', resetBoard);
    } else {
        overlay.querySelector('h2').textContent = text;
        overlay.style.display = 'flex';
    }

    // update small UI label too
    const pBtn = document.getElementById('btn_Player1');
    if (pBtn) pBtn.textContent = 'Draw';
}


function triggerCheatAnimation(targetIndex) {
    const cheatData = findCheatCoordinates();
    if (!cheatData) return;

    const { edgeIndex, innerIndex } = cheatData;

    // If debug mode is requested, render ghosts on all sides for easy tuning
    if (cheatDebugMode) {
        // render one ghost per side around the board using the same innerIndex
        showAllSideGhosts(edgeIndex, innerIndex);
        return;
    }

    // Default single ghost placement (compute side from positions)
    const edgeEl = gridItems[edgeIndex];
    const innerEl = gridItems[innerIndex];
    const edgeRect = edgeEl.getBoundingClientRect();
    const innerRect = innerEl.getBoundingClientRect();

    const cellSize = Math.round(edgeRect.width);
    const gap = cheatConfig.gap;

    const diffX = edgeRect.left - innerRect.left;
    const diffY = edgeRect.top - innerRect.top;

    const ghostContainer = document.createElement('div');
    ghostContainer.classList.add('ghost-container');
    const ghostCell = document.createElement('div');
    ghostCell.classList.add('grid-item');
    ghostCell.innerHTML = svgO;

    let finalLeft = 0, finalTop = 0;
    let side = 'left';

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // horizontal direction
        if (diffX < 0) {
            side = 'left';
            finalLeft = edgeRect.left + window.scrollX - cellSize - gap;
            finalTop = edgeRect.top + window.scrollY;
        } else {
            side = 'right';
            finalLeft = edgeRect.right + window.scrollX + gap;
            finalTop = edgeRect.top + window.scrollY;
        }
    } else {
        // vertical direction
        if (diffY < 0) {
            side = 'top';
            finalLeft = edgeRect.left + window.scrollX;
            finalTop = edgeRect.top + window.scrollY - cellSize - gap;
        } else {
            side = 'bottom';
            finalLeft = edgeRect.left + window.scrollX;
            finalTop = edgeRect.bottom + window.scrollY + gap;
        }
    }

    // apply per-side nudges
    const nudge = cheatConfig.offsets[side] || { x: 0, y: 0 };
    ghostContainer.style.position = 'absolute';
    ghostContainer.style.left = `${finalLeft + nudge.x}px`;
    ghostContainer.style.top = `${finalTop + nudge.y}px`;

    ghostContainer.style.width = `${cellSize}px`;
    ghostContainer.style.height = `${cellSize}px`;

    ghostContainer.appendChild(ghostCell);
    document.body.appendChild(ghostContainer);

    // animate from behind the board and draw line after animation finishes
    ghostContainer.classList.add(`slide-in-${side}`, 'behind-grid');
    ghostContainer.addEventListener('animationend', () => {
        drawCheatLine(innerIndex, edgeIndex, ghostCell);
        // after cheat line is drawn, declare AI as the winner and block input
        // small delay so the user sees the line before the overlay appears
        setTimeout(() => showWinner(CellState.O), 280);
    }, { once: true });
}


// Helper: create a single ghost at a specific side relative to an edge element
function createGhostAtSide(edgeIndex, innerIndex, side) {
    const edgeEl = gridItems[edgeIndex];
    const edgeRect = edgeEl.getBoundingClientRect();
    const cellSize = Math.round(edgeRect.width);
    const gap = cheatConfig.gap;

    // measure ghost padding from CSS by creating a temporary offscreen element
    const temp = document.createElement('div');
    temp.className = 'ghost-container';
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    const cs = getComputedStyle(temp);
    const ghostPadding = parseFloat(cs.paddingLeft || cs.padding || '0');
    document.body.removeChild(temp);

    const ghostWidth = cellSize + (ghostPadding * 2);
    const ghostHeight = ghostWidth;

    const ghostContainer = document.createElement('div');
    ghostContainer.classList.add('ghost-container');
    ghostContainer.style.position = 'absolute';
    ghostContainer.classList.add('ghost-' + side);

    const ghostCell = document.createElement('div');
    ghostCell.classList.add('grid-item');
    ghostCell.innerHTML = svgO;

    let left = edgeRect.left + window.scrollX;
    let top = edgeRect.top + window.scrollY;

    if (side === 'left') {
        left = edgeRect.left + window.scrollX - gap - ghostWidth;
        top = edgeRect.top + window.scrollY - (ghostHeight - cellSize) / 2;
    } else if (side === 'right') {
        left = edgeRect.right + window.scrollX + gap;
        top = edgeRect.top + window.scrollY - (ghostHeight - cellSize) / 2;
    } else if (side === 'top') {
        left = edgeRect.left + window.scrollX - (ghostWidth - cellSize) / 2;
        top = edgeRect.top + window.scrollY - gap - ghostHeight;
    } else if (side === 'bottom') {
        left = edgeRect.left + window.scrollX - (ghostWidth - cellSize) / 2;
        top = edgeRect.bottom + window.scrollY + gap;
    }

    const nudge = cheatConfig.offsets[side] || { x: 0, y: 0 };
    ghostContainer.style.left = `${left + nudge.x}px`;
    ghostContainer.style.top = `${top + nudge.y}px`;
    ghostContainer.style.width = `${ghostWidth}px`;
    ghostContainer.style.height = `${ghostHeight}px`;

    ghostContainer.appendChild(ghostCell);
    document.body.appendChild(ghostContainer);

    // animate from behind the board and draw the cheat line after animation
    ghostContainer.classList.add(`slide-in-${side}`, 'behind-grid');
    ghostContainer.addEventListener('animationend', () => drawCheatLine(innerIndex, edgeIndex, ghostCell), { once: true });
    return ghostContainer;
}

// Render a ghost on all four sides (useful for tuning offsets)
function showAllSideGhosts(edgeIndex, innerIndex) {
    // remove existing ghosts first
    document.querySelectorAll('.ghost-container').forEach(el => el.remove());
    const sides = ['left', 'right', 'top', 'bottom'];
    sides.forEach(side => createGhostAtSide(edgeIndex, innerIndex, side));
}

// Create a ghost adjacent to a specific board cell (innerIndex) on the given side.
function createGhostAtCellSide(innerIndex, side) {
    const innerEl = gridItems[innerIndex];
    if (!innerEl) return null;
    const rect = innerEl.getBoundingClientRect();
    const cellSize = Math.round(rect.width);
    const gap = cheatConfig.gap;

    // measure ghost padding
    const temp = document.createElement('div');
    temp.className = 'ghost-container';
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    const cs = getComputedStyle(temp);
    const ghostPadding = parseFloat(cs.paddingLeft || cs.padding || '0');
    document.body.removeChild(temp);

    const ghostSize = cellSize + (ghostPadding * 2);

    const ghostContainer = document.createElement('div');
    ghostContainer.classList.add('ghost-container');
    ghostContainer.style.position = 'absolute';
    ghostContainer.style.zIndex = '999';

    ghostContainer.classList.add('ghost-' + side);

    const ghostCell = document.createElement('div');
    ghostCell.classList.add('grid-item');
    ghostCell.innerHTML = svgO;

    let left = rect.left + window.scrollX;
    let top = rect.top + window.scrollY;

    if (side === 'left') {
        left = rect.left + window.scrollX - gap - ghostSize;
        top = rect.top + window.scrollY - (ghostSize - cellSize) / 2;
    } else if (side === 'right') {
        left = rect.right + window.scrollX + gap;
        top = rect.top + window.scrollY - (ghostSize - cellSize) / 2;
    } else if (side === 'top') {
        left = rect.left + window.scrollX - (ghostSize - cellSize) / 2;
        top = rect.top + window.scrollY - gap - ghostSize;
    } else if (side === 'bottom') {
        left = rect.left + window.scrollX - (ghostSize - cellSize) / 2;
        top = rect.bottom + window.scrollY + gap;
    }

    const nudge = cheatConfig.offsets[side] || { x: 0, y: 0 };
    ghostContainer.style.left = `${left + nudge.x}px`;
    ghostContainer.style.top = `${top + nudge.y}px`;
    ghostContainer.style.width = `${ghostSize}px`;
    ghostContainer.style.height = `${ghostSize}px`;

    ghostContainer.appendChild(ghostCell);
    document.body.appendChild(ghostContainer);

    // animate from behind the board and draw the cheat line after animation
    ghostContainer.classList.add(`slide-in-${side}`, 'behind-grid');
    ghostContainer.addEventListener('animationend', () => drawCheatLine(innerIndex, innerIndex, ghostCell), { once: true });
    return ghostContainer;
}

// Show ghosts for every cell on the outer perimeter (3 per side)
function showPerimeterGhosts() {
    // remove existing ghosts first
    document.querySelectorAll('.ghost-container').forEach(el => el.remove());

    // left column (cells 0,3,6)
    [0, 3, 6].forEach(idx => createGhostAtCellSide(idx, 'left'));
    // right column (cells 2,5,8)
    [2, 5, 8].forEach(idx => createGhostAtCellSide(idx, 'right'));
    // top row (cells 0,1,2)
    [0, 1, 2].forEach(idx => createGhostAtCellSide(idx, 'top'));
    // bottom row (cells 6,7,8)
    [6, 7, 8].forEach(idx => createGhostAtCellSide(idx, 'bottom'));
}

// Expose a quick toggle for debug from console: window.toggleCheatDebug(true/false)
window.toggleCheatDebug = function(val) {
    if (typeof val === 'boolean') cheatDebugMode = val;
    else cheatDebugMode = !cheatDebugMode;
    console.log('cheatDebugMode =', cheatDebugMode);
};

// expose config for easy tweaking from console
window.cheatConfig = cheatConfig;

function drawCheatLine(startIndex, middleIndex, ghostElement) {
    const svgNS = "http://www.w3.org/2000/svg";

    // 1. Get Coordinates
    // Start (Inner Cell)
    const rect1 = gridItems[startIndex].getBoundingClientRect();
    const x1 = rect1.left + rect1.width / 2 + window.scrollX;
    const y1 = rect1.top + rect1.height / 2 + window.scrollY;

    // End (Ghost Cell)
    const rect2 = ghostElement.getBoundingClientRect();
    const x2 = rect2.left + rect2.width / 2 + window.scrollX;
    const y2 = rect2.top + rect2.height / 2 + window.scrollY;

    // 2. Create SVG Overlay
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.position = "absolute";
    svg.style.left = "0px";
    svg.style.top = "0px";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1000";
    svg.setAttribute("id", "cheat-line-svg"); // ID for cleanup later if needed

    // 3. Get the correct color from your CSS variables
    // This grabs '--line-o' from the body, so it works in Dark Mode too!
    const oColor = getComputedStyle(document.body).getPropertyValue('--line-o').trim();

    // 4. Create the Line
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", oColor); 
    line.setAttribute("stroke-width", "8"); // Matches your drawline function
    line.setAttribute("stroke-linecap", "round");

    svg.appendChild(line);
    document.body.appendChild(svg);
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'f' || event.key === 'F') {
        console.log("The F key was pressed!");
            document.body.classList.toggle('dark-mode');
            console.log(cellStates);
    } });


document.addEventListener('DOMContentLoaded', () => {
    createGrid();

    if (aiStart && aiMode) {
        currentPlayer = CellState.O; // make sure turn state matches — AI to move first
        performAIMove();
    }

  

    const resetBtn = document.querySelector('#btn_reset');
    resetBtn?.addEventListener('click', () => {
       resetBoard();
    });

    const aiBtn = document.getElementById('btn_AI');
    const hardLabel = document.querySelector('.hard-mode');

    // set initial visibility of Hard-mode control based on Solo Mode
    if (hardLabel) hardLabel.style.display = (aiBtn?.classList.contains('active')) ? 'inline-flex' : 'none';

    aiBtn?.addEventListener('click', () => {
        aiBtn.classList.toggle('active');
        aimodecheck();
        // show/hide hard-mode control to match Solo Mode
        if (hardLabel) hardLabel.style.display = aiBtn.classList.contains('active') ? 'inline-flex' : 'none';
    });

    // Hard-mode checkbox -> toggles aiCheat
    const hardChk = document.getElementById('chk_Hard');
    if (hardChk) {
        // initialize from current state
        hardChk.checked = !!aiCheat;
        hardChk.addEventListener('change', () => {
            aiCheat = hardChk.checked;
            console.log('Hard mode (aiCheat) =', aiCheat);
        });
    }
});

// automatically show perimeter ghosts when debug mode is on
// (useful to instantly visualise offsets even on an empty board)
const debugObserver = new MutationObserver(() => {
    if (cheatDebugMode) showPerimeterGhosts();
});
// observe body class changes or attribute changes — keeps debug visible
debugObserver.observe(document.body, { attributes: true, childList: false, subtree: false });

// override toggle to immediately show/hide perimeter ghosts
const _origToggle = window.toggleCheatDebug;
window.toggleCheatDebug = function(val) {
    _origToggle(val);
    if (cheatDebugMode) showPerimeterGhosts();
    else document.querySelectorAll('.ghost-container').forEach(el => el.remove());
};