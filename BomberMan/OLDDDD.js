// Hello World JavaScript Template
console.log('Hello World! JavaScript is loaded and running.');

const gridItems = [];
// Set to a path in your project (e.g. assets/tile.gif) or an external URL.
// Leave empty string to show numbers instead.
const tileGif = 'assets/tile.gif';



function createGrid() {
    const gameGrid = document.getElementById('game-grid');
    if (!gameGrid) return;
    console.log("Creating grid...");

        // clear in case of re-create
        gameGrid.innerHTML = '';
        gridItems.length = 0;

            // create 10x10 = 100 cells
            for (let i = 1; i <= 100; i++) {
                const griditem = document.createElement('div');
                griditem.classList.add('grid-item');
                griditem.dataset.index = i;

                if (tileGif) {
                    const img = document.createElement('img');
                    img.src = 'assets/east.gif';
                    img.alt = `tile-${i}`;
                    griditem.appendChild(img);
                } else {
                    // show index for quick testing — remove if undesired
                    griditem.textContent = i;
                }

                griditem.addEventListener('click', () => OnGridClick && OnGridClick(i));
                gameGrid.appendChild(griditem);
                gridItems.push(griditem);
            }


}




document.addEventListener('DOMContentLoaded', () => {
    createGrid();});

