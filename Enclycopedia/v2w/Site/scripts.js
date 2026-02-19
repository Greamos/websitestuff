class PaginaData {
    constructor(id, title, description, page_number, page_type, Object_array, picture) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.page_number = page_number;
        this.page_type = page_type;
        this.Object_array = Object_array;
        this.picture = picture;
    }
}

function SetupCatalog() {
    const itemPerSide = 9; // items per page
    const getPageNum = (globalIndex) => Math.floor(globalIndex / itemPerSide);

    // 1. Fish 
    const fish = fishArr.map((item, index) => {
        const globalIndex = index;
        return new PaginaData(
            globalIndex, 
            item.name, 
            item.description, 
            getPageNum(globalIndex), 
            'Fish', 
            item.Object_array, 
            item.picture
        );
    });

    // 2. Bugs 
    const bugs = bugArr.map((item, index) => {
        const globalIndex = fish.length + index;
        return new PaginaData(
            globalIndex, 
            item.name, 
            item.description, 
            getPageNum(globalIndex), 
            'Bug', 
            item.Object_array, 
            item.picture
        );
    });

    // 3. Diving 
    const diving = divingArr.map((item, index) => {
        const globalIndex = fish.length + bugs.length + index;
        return new PaginaData(
            globalIndex, 
            item.name, 
            item.description, 
            getPageNum(globalIndex), 
            'Diving', 
            item.Object_array, 
            item.picture
        );
    });

    // Combine in the correct order
    const catalog = [...fish, ...bugs, ...diving];

    return { catalog }; // Only return the catalog
}

function GetItemsForPage(catalog, pageIndex, itemsPerPage = 9) { 
   const startIndex = itemsPerPage * pageIndex;
   const endIndex = startIndex + itemsPerPage;
   
   if (startIndex >= catalog.length) {
       return [];
   }
   console.log(catalog.slice(startIndex, Math.min(endIndex, catalog.length)));
   return catalog.slice(startIndex, Math.min(endIndex, catalog.length));
}

let sheetCount = 0;
let currentSheet = 0;
const pageMap = new Map();
let baseZIndex = 1000;
const animatingPages = new Set(); // Track pages that are currently animating
let isAnimating = false; // Add animation lock

function CreatePage(){
    const sheet = document.createElement('div');
    sheet.id = `pageSetup-${sheetCount}`;
    sheet.classList.add('sheet', 'cloned-page', 'clones-page');
    sheet.style.zIndex = baseZIndex - sheetCount;

    const inner = document.createElement('div');
    inner.id = `flip-page-inner-${sheetCount}`;
    inner.classList.add('flip-page-inner');

    const front = document.createElement('div');
    front.id = `flip-page-front-${sheetCount}`;
    front.classList.add('flip-page-front');
    front.innerHTML = '';

    const back = document.createElement('div');
    back.id = `flip-page-back-${sheetCount}`;
    back.classList.add('flip-page-back');
    back.innerHTML = '';

    inner.appendChild(front);
    inner.appendChild(back);
    sheet.appendChild(inner);
    document.body.appendChild(sheet);
    
    // Capture the current sheet index for the event listener
    const pageIndex = sheetCount;
    
    // Listen for animation end to remove from animating set
    inner.addEventListener('transitionend', () => {
        animatingPages.delete(pageIndex);
        inner.style.transitionDuration = ''; // Reset to default
        updateZIndex();
    });

    pageMap.set(sheetCount, { root: sheet, inner: inner, index: sheetCount });
    sheetCount++;
}

function updateZIndex(pages = pageMap) {
    const isMap = pages instanceof Map;
    const entries = isMap ? Array.from(pages.entries()).sort((a, b) => a[0] - b[0]) : pages.map((p, i) => [i, p]);

    // Separate animating pages first so they can be given top z-indexes
    const animList = Array.from(animatingPages);
    const animEntries = entries.filter(([key]) => animatingPages.has(key));
    const nonAnimEntries = entries.filter(([key]) => !animatingPages.has(key));

    // Partition non-animating entries into unflipped (right) and flipped (left)
    const unflipped = nonAnimEntries.filter(([, page]) => !page.inner.classList.contains('flipped'));
    const flipped = nonAnimEntries.filter(([, page]) => page.inner.classList.contains('flipped'));
    // 1) Assign z-index for animating pages (topmost), preserving their start order
    animEntries.forEach(([key, page], i) => {
        const order = animList.indexOf(key);
        const zIndex = baseZIndex + 200 + order;
        page.root.style.zIndex = zIndex;
    });

    // 2) Assign z-index for unflipped (right-side) pages: lower key -> higher z
    unflipped.forEach(([key, page], i) => {
        const zIndex = baseZIndex - i;
        page.root.style.zIndex = zIndex;
    });

    // 3) Assign z-index for flipped (left-side) pages: opposite order, all lower than unflipped
    // Sort flipped by key descending so the highest key is drawn closest to the spine.
    const flippedDesc = flipped.slice().sort((a, b) => b[0] - a[0]);
    flippedDesc.forEach(([key, page], i) => {
        const zIndex = baseZIndex - unflipped.length - i - 1;
        page.root.style.zIndex = zIndex;
    });
}

// Universal function - handles ANY page content
function AddItemsToPage(pageIndex, contentType, data = null) {
    const page = pageMap.get(pageIndex);
    if (!page) return;

    const frontId = `flip-page-front-${pageIndex}`;
    const backId = `flip-page-back-${pageIndex}`;
    
    // Tag the page with its content type
    page.root.classList.add('content-page');
    page.root.dataset.contentType = contentType;
    page.root.dataset.pageIndex = pageIndex;

    // Route to appropriate renderer
    switch(contentType) {
        case 'catalog':
            renderCatalogPage(pageIndex, frontId, backId, data);
            break;
        case 'cover':
            renderCoverPage(frontId, backId);
            break;
        case 'foreword':
            renderForewordPage(frontId, backId);
            break;
        case 'contents':
            renderContentsPage(frontId, backId);
            break;
        case 'conclusion':
            renderConclusionPage(frontId, backId);
            break;
        case 'custom':
            renderCustomPage(frontId, backId, data);
            break;
        default:
            console.warn(`Unknown content type: ${contentType}`);
    }
}

// === RENDERER FUNCTIONS ===

function renderCatalogPage(pageIndex, frontId, backId, catalogData = catalog) {
    // FIXED: Calculate the correct catalog offset
    // Sheet 1 (pageIndex 1) should show items 0-8 on BACK only
    // Sheet 2 (pageIndex 2) should show items 9-26
    // Sheet 3 (pageIndex 3) should show items 27-44, etc.
    
    let itemOffset;
    if (pageIndex === 1) {
        // Sheet 1: Only back side has items 0-8
        itemOffset = 0;
        renderSide(3, frontId, []); // Front is empty (contents page)
        renderSide(4, backId, GetItemsForPage(catalogData, 0, 9));
    } else {
        // Calculate offset for other sheets
        // Sheet 2 starts at item 9, Sheet 3 at item 27, etc.
        itemOffset = 9 + (pageIndex - 2) * 18;
        const pageItems = catalogData.slice(itemOffset, itemOffset + 18);
        
        renderSide(pageIndex * 2 + 1, frontId, pageItems.slice(0, 9));
        renderSide(pageIndex * 2 + 2, backId, pageItems.slice(9, 18));
    }
}

function renderCoverPage(frontId, backId) {
    const frontContainer = document.getElementById(frontId);
    const backContainer = document.getElementById(backId);
    
    if (frontContainer) {
        frontContainer.classList.add('cover-page');
        frontContainer.innerHTML = `<div class="cover"><h1>Encyclopedia</h1></div>`;
    }
    
    if (backContainer) {
        backContainer.innerHTML = ''; // Blank or add publisher info
    }
}

function renderForewordPage(frontId, backId) {
    const frontContainer = document.getElementById(frontId);
    
    if (frontContainer) {
        frontContainer.innerHTML = `
            <div class="foreword">
                <h2>Foreword</h2>
                <p>Lorem ipsum dolor sit amet...</p>
            </div>
        `;
    }
}

function renderContentsPage(frontId, backId) {
    const frontContainer = document.getElementById(frontId);
    
    if (frontContainer) {
        const contentsData = bookLayout.generateContentsData();
        
        const sectionsHTML = contentsData.sections.map(section => `
            <li>
                <a href="#" class="contents-link" 
                   data-sheet="${section.sheetIndex}" 
                   data-side="${section.side}">
                    <strong>${section.name}</strong> (Page ${section.page})
                </a>
            </li>
        `).join('');
        
        frontContainer.innerHTML = `
            <div class="contents">
                <h2>Contents</h2>
                <ul>
                    ${sectionsHTML}
                </ul>
            </div>
        `;
        
        // Add click handlers to navigate to sections
        frontContainer.querySelectorAll('.contents-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSheet = parseInt(link.dataset.sheet);
                navigateToSheet(targetSheet);
            });
        });
    }
}

function renderConclusionPage(frontId, backId) {
    const frontContainer = document.getElementById(frontId);
    
    if (frontContainer) {
        frontContainer.innerHTML = `
            <div class="afterword">
                <h2>Conclusion</h2>
                <p>Lorem ipsum dolor sit amet...</p>
            </div>
        `;
    }
    
    // Optionally leave back empty or add credits
    const backContainer = document.getElementById(backId);
    if (backContainer) {
        backContainer.innerHTML = ''; // or add credits/back cover
    }
}

function renderCustomPage(frontId, backId, customData) {
    const frontContainer = document.getElementById(frontId);
    const backContainer = document.getElementById(backId);
    
    if (customData && customData.frontHTML && frontContainer) {
        frontContainer.innerHTML = customData.frontHTML;
    }
    
    if (customData && customData.backHTML && backContainer) {
        backContainer.innerHTML = customData.backHTML;
    }
}

function renderSide(pageNum, targetId, items) {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.innerHTML = '';
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('grid-item');

        const img = document.createElement('img');
        img.src = item.picture;
        img.alt = item.title;
        
        img.onclick = () => {
            onclickeditem(item);
        };

        card.appendChild(img);
        container.appendChild(card);
    });

    const pageNumberDiv = document.createElement('div');
    pageNumberDiv.classList.add('page-number');
    pageNumberDiv.innerText = `${pageNum}`;
    container.appendChild(pageNumberDiv);
}

// === PAGE ORCHESTRATION ===
// This function defines the book structure
function setupBookStructure() {
    const pages = [];
    
    // Page 0: Cover + Foreword
    pages.push({ index: 0, type: 'cover' });
    pages.push({ index: 0, type: 'foreword', side: 'back' });
    
    // Page 1: Contents
    pages.push({ index: 1, type: 'contents' });
    
    // Catalog pages (starting from page 1 back)
    const totalCatalogPages = Math.ceil(catalog.length / 9);
    for (let i = 0; i < totalCatalogPages; i++) {
        pages.push({ index: i + 1, type: 'catalog', catalogPage: i });
    }
    
    // Last page: Conclusion
    const lastPageIndex = Math.ceil(totalCatalogPages / 2) + 1;
    pages.push({ index: lastPageIndex, type: 'conclusion' });
    
    return pages;
}

function flipPage(scrollDirection) {
    const page = pageMap.get(currentSheet);
    if (!page) return;
    isAnimating = true; // Lock scrolling
    // Add current page to animating set
    animatingPages.add(currentSheet);

    if (scrollDirection > 0) {
        page.inner.classList.add('flipped');
    } else {
        page.inner.classList.remove('flipped');
    }

    updateZIndex();
    
    // Unlock after animation completes (match your CSS transition duration)
    setTimeout(() => {
        isAnimating = false;
    }, 250); // Adjust to match your CSS transition-duration
}

function scrollHandler(event) {
    if (isAnimating) {
        return; // Ignore scroll while animating
    }
    
    if (event.deltaY > 0) {
        if (currentSheet < sheetCount) {
            flipPage(event.deltaY);
            currentSheet++;
        }
    } else {
        if (currentSheet > 0) {
            currentSheet--;
            flipPage(event.deltaY);
        }
    }
}

const { catalog } = SetupCatalog();

// Debug variable to control auto page creation
const DEBUG_AUTO_CREATE_PAGES = false;

// Helper function to automatically create all needed pages
function autoCreatePages(catalog) {
    if (!DEBUG_AUTO_CREATE_PAGES) {
        console.log('Auto page creation disabled');
        return;
    }

    const ITEMS_PER_SHEET = 18; // 9 front + 9 back
    
    let totalSheetsNeeded = 2; // Cover + Contents sheets
    
    const itemsOnSheet1 = 9;
    const remainingItems = Math.max(0, catalog.length - itemsOnSheet1);
    
    if (remainingItems > 0) {
        const additionalSheets = Math.ceil(remainingItems / ITEMS_PER_SHEET);
        totalSheetsNeeded += additionalSheets;
    }
    
    totalSheetsNeeded += 1;
    
    console.log(`Auto-creating ${totalSheetsNeeded} sheets for ${catalog.length} items`);
    
    // Create all sheets
    for (let i = 0; i < totalSheetsNeeded; i++) {
        CreatePage();
    }
    
    // Sheet 0: Cover
    AddItemsToPage(0, 'cover');
    
    // Sheet 1: Contents (front) + First catalog items (back) - RENDER TOGETHER
    renderContentsWithCatalog(1);
    
    // Start adding catalog items from sheet 2 onwards
    for (let sheetIndex = 2; sheetIndex < totalSheetsNeeded - 1; sheetIndex++) {
        AddItemsToPage(sheetIndex, 'catalog', catalog);
    }
    
    // Last sheet: Conclusion
    AddItemsToPage(totalSheetsNeeded - 1, 'conclusion');
    
    updateZIndex(pageMap);
    
    console.log(`Created ${sheetCount} sheets`);
}

// Special renderer for Sheet 1: Contents + Catalog
function renderContentsWithCatalog(pageIndex) {
    const frontId = `flip-page-front-${pageIndex}`;
    const backId = `flip-page-back-${pageIndex}`;
    
    const page = pageMap.get(pageIndex);
    if (!page) return;
    
    page.root.classList.add('content-page');
    page.root.dataset.contentType = 'contents-catalog';
    page.root.dataset.pageIndex = pageIndex;
    
    // Render contents on front
    const frontContainer = document.getElementById(frontId);
    if (frontContainer) {
        frontContainer.innerHTML = `
            <div class="contents">
                <h2>Contents</h2>
                <ul>
                    <li><strong>I. Fishes</strong> (Page 4)</li>
                    <li><strong>II. Bugs</strong></li>
                    <li><strong>III. Diving</strong></li>
                    <li><strong>IV. Conclusion</strong></li>
                </ul>
            </div>
        `;
    }
    
    // Render first 9 catalog items on back
    const firstItems = GetItemsForPage(catalog, 0, 9);
    renderSide(4, backId, firstItems);
}

document.addEventListener('DOMContentLoaded', () => {
    if (DEBUG_AUTO_CREATE_PAGES) {
        // Automatic mode
        autoCreatePages(catalog);
    } else {
        // Manual mode - your existing code
        CreatePage();
        AddItemsToPage(0, 'cover');
        
        CreatePage();
        AddItemsToPage(1, 'contents');
        
        CreatePage();
        AddItemsToPage(2, 'catalog', catalog);
        CreatePage();
        AddItemsToPage(3, 'catalog', catalog);
        CreatePage();
        AddItemsToPage(4, 'catalog', catalog);
        
        updateZIndex(pageMap);
    }
});

window.addEventListener('wheel', (event) => {
    event.preventDefault();
    scrollHandler(event);
}, { passive: false });

function onclickeditem(item) {
    // Remove any existing popup (prevent duplicates)
    const existing = document.querySelector('.clickpage');
    if (existing) existing.remove();

    // Create the container
    const modal = document.createElement('div');
    modal.classList.add('clickpage');
    
    modal.innerHTML = `
        <h2>${item.title}</h2>
        <img src="${item.picture}" alt="${item.title}">
        <button onclick="this.parentElement.remove()">Close</button>
    `;

    // Add to body
    document.body.appendChild(modal);
}

// Page layout configuration system
class BookStructure {
    constructor() {
        this.structure = [];
    }

    addSection(type, data = null) {
        this.structure.push({ type, data });
        return this; // Allow chaining
    }

    build() {
        let sheetIndex = 0;
        const sheets = []; // Track what goes on each sheet
        
        this.structure.forEach(section => {
            if (section.type === 'catalog') {
                // Auto-create sheets for catalog items
                const catalogData = section.data || catalog;
                const itemsPerSheet = 18;
                const totalSheets = Math.ceil(catalogData.length / itemsPerSheet);
                
                for (let i = 0; i < totalSheets; i++) {
                    sheets.push({
                        index: sheetIndex,
                        type: 'catalog',
                        catalogPageIndex: i,
                        data: catalogData
                    });
                    sheetIndex++;
                }
            } else {
                // Single-sheet sections
                sheets.push({
                    index: sheetIndex,
                    type: section.type,
                    data: section.data
                });
                sheetIndex++;
            }
        });

        // Create all physical pages
        for (let i = 0; i < sheets.length; i++) {
            CreatePage();
        }

        // Populate each sheet
        sheets.forEach(sheet => {
            if (sheet.type === 'catalog') {
                this.renderCatalogSheet(sheet.index, sheet.catalogPageIndex, sheet.data);
            } else if (sheet.type === 'contents-catalog') {
                renderContentsWithCatalog(sheet.index);
            } else {
                AddItemsToPage(sheet.index, sheet.type, sheet.data);
            }
        });

        // Assign page IDs to catalog items
        this.assignPageIDsToItems(sheets);

        updateZIndex(pageMap);
        
        console.log(`Book structure created: ${sheets.length} sheets`);
        return sheets;
    }

    renderCatalogSheet(sheetIndex, catalogPageIndex, catalogData) {
        const frontId = `flip-page-front-${sheetIndex}`;
        const backId = `flip-page-back-${sheetIndex}`;
        
        const page = pageMap.get(sheetIndex);
        if (!page) return;
        
        page.root.classList.add('content-page');
        page.root.dataset.contentType = 'catalog';
        page.root.dataset.pageIndex = sheetIndex;
        page.root.dataset.catalogPageIndex = catalogPageIndex;
        
        // Calculate item offset: 18 items per sheet
        const itemOffset = catalogPageIndex * 18;
        const pageItems = catalogData.slice(itemOffset, itemOffset + 18);
        
        // Front gets first 9, back gets next 9
        renderSide(sheetIndex * 2 + 1, frontId, pageItems.slice(0, 9));
        renderSide(sheetIndex * 2 + 2, backId, pageItems.slice(9, 18));
    }

    assignPageIDsToItems(sheets) {
        // Find all catalog sheets
        const catalogSheets = sheets.filter(s => s.type === 'catalog');
        
        catalog.forEach(item => {
            // Find which catalog sheet this item is on
            const itemsPerSheet = 18;
            const sheetNumber = Math.floor(item.id / itemsPerSheet);
            const catalogSheet = catalogSheets[sheetNumber];
            
            if (!catalogSheet) return;
            
            const sheetIndex = catalogSheet.index;
            const positionInSheet = item.id % itemsPerSheet;
            const side = positionInSheet < 9 ? 'front' : 'back';
            const physicalPageNumber = (sheetIndex * 2) + (side === 'front' ? 1 : 2);
            
            // Add page location data to the item
            item.sheetIndex = sheetIndex;
            item.side = side;
            item.physicalPageNumber = physicalPageNumber;
            item.pageId = `flip-page-${side}-${sheetIndex}`;
        });
        
        console.log('Page IDs assigned to all catalog items');
    }

    // Generate table of contents with page numbers
    generateContentsData() {
        const fishStart = catalog.find(item => item.page_type === 'Fish');
        const bugsStart = catalog.find(item => item.page_type === 'Bug');
        const divingStart = catalog.find(item => item.page_type === 'Diving');
        
        // Find conclusion sheet (last sheet in structure)
        const conclusionSheet = sheetCount - 1;
        
        return {
            sections: [
                { 
                    name: 'I. Fishes', 
                    page: fishStart?.physicalPageNumber || 3,
                    sheetIndex: fishStart?.sheetIndex || 1,
                    side: fishStart?.side || 'front'
                },
                { 
                    name: 'II. Bugs', 
                    page: bugsStart?.physicalPageNumber || 4,
                    sheetIndex: bugsStart?.sheetIndex || 2,
                    side: bugsStart?.side || 'front'
                },
                { 
                    name: 'III. Diving', 
                    page: divingStart?.physicalPageNumber || 5,
                    sheetIndex: divingStart?.sheetIndex || 3,
                    side: divingStart?.side || 'front'
                },
                { 
                    name: 'IV. Conclusion', 
                    page: conclusionSheet * 2 + 1,
                    sheetIndex: conclusionSheet,
                    side: 'front'
                }
            ]
        };
    }
}

// Navigation helper to jump to a specific sheet
function navigateToSheet(targetSheet) {
    if (targetSheet < 0 || targetSheet >= sheetCount) return;
    
    // Flip all pages between current and target
    if (targetSheet > currentSheet) {
        // Flip forward
        for (let i = currentSheet; i < targetSheet; i++) {
            const page = pageMap.get(i);
            if (page) page.inner.classList.add('flipped');
        }
    } else {
        // Flip backward
        for (let i = currentSheet - 1; i >= targetSheet; i--) {
            const page = pageMap.get(i);
            if (page) page.inner.classList.remove('flipped');
        }
    }
    
    currentSheet = targetSheet;
    updateZIndex(pageMap);
}

// Global book layout instance
let bookLayout;

document.addEventListener('DOMContentLoaded', () => {
    if (DEBUG_AUTO_CREATE_PAGES) {
        autoCreatePages(catalog);
    } else {
        // NEW: Simple structure definition!
        bookLayout = new BookStructure();
        
        // Just define the ORDER - catalog auto-expands!
        bookLayout
            .addSection('cover')
            .addSection('contents-catalog')  // Special: contents on front, catalog starts on back
            .addSection('catalog', catalog)  // Auto-creates ALL needed sheets
            .addSection('conclusion');
        
        // Build the book
        const sheets = bookLayout.build();
        
        // Special case: Sheet 1 needs contents on front, catalog on back
        renderContentsWithCatalog(1);
    }
});

