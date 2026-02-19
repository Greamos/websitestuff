export function createGrid(containerId, rows = 10, cols = 10) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`No element with id ${containerId}`);
  container.innerHTML = '';

  const api = {
    container,
    rows,
    cols,
    getCell(x, y) {
      return container.querySelector(`.grid-item[data-x="${x}"][data-y="${y}"]`);
    },
    setTile(x, y, content) {
      const cell = api.getCell(x, y);
      if (!cell) return;
      cell.innerHTML = '';
      if (!content) return;
      if (typeof content === 'string') {
        // if looks like an image path/URL, create an img
        if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(content) || content.startsWith('http') ) {
          const img = document.createElement('img');
          img.src = content;
          img.alt = `tile-${x}-${y}`;
          cell.appendChild(img);
        } else {
          cell.textContent = content;
        }
      } else if (content instanceof Node) {
        cell.appendChild(content);
      } else if (content.src) {
        const img = document.createElement('img');
        img.src = content.src;
        img.alt = content.alt || `tile-${x}-${y}`;
        cell.appendChild(img);
      }
    },
    clearTile(x, y) {
      const cell = api.getCell(x, y);
      if (!cell) return;
      cell.innerHTML = '';
    }
  };

  // build cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-item');
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.dataset.index = y * cols + x;
      container.appendChild(cell);
    }
  }

  return api;
}
