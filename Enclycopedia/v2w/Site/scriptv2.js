/* =========================
   0) Model (Moved to top)
   ========================= */

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

/* =========================
   1) Data Setup
   ========================= */

function buildCatalog() {
    const itemsPerSide = 9; // Grid items per page side
    const startPage = 4;    // Images now start on Page 4 (Cover=1, Foreword=2, Contents=3)

    // Helper to calculate the physical page number based on the item's global index
    // Index 0-8 -> Page 4, Index 9-17 -> Page 5, etc.
    const getPageNum = (globalIndex) => Math.floor(globalIndex / itemsPerSide) + startPage;

    // 1. Process Fish First (Since they are first in the book)
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

    // 2. Process Bugs Second
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

    // 3. Process Diving Third
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
    
    // Calculate sheets
    // Sheet 0: Cover/Foreword
    // Sheet 1: Contents/9 Images // wip NOW
    // Sheet 2+: 18 Images
    const imagesOnSheet1 = 9;
    const imagesPerFullSheet = 18;
    
    let calculatedSheets = 2; // Start with Sheet 0 and Sheet 1
    const remainingImages = catalog.length - imagesOnSheet1;
    
    if (remainingImages > 0) {
        const fullSheets = Math.ceil(remainingImages / imagesPerFullSheet);
        calculatedSheets += fullSheets;

        // Check if the last sheet's back side is occupied by images
        // Modulo 18: If > 9, it means we wrapped onto the back page
        // If 0, it means we filled the back page exactly
        const remainder = remainingImages % imagesPerFullSheet;
        const backSideOccupied = (remainder === 0) || (remainder > 9);

        // If occupied, add one more sheet for the Conclusion so we don't overwrite images
        if (backSideOccupied) {
            calculatedSheets++;
        }
    }

    return { catalog, totalPages: calculatedSheets };
}

// Update the catalog and totalPages variables
const { catalog, totalPages } = buildCatalog();
const catalogSheets = totalPages; // Use the calculated total pages
const lastSheetIndex = catalogSheets - 1; // Update last sheet index

/* =========================
   2) State
   ========================= */

const pageMap = new Map();
let sheetCount = -1;          // number of clones created
let currentSheet = 0;         // current sheet index (0 = pages 1–2)
let isAnimating = false;
const scrollQueue = [];



/* =========================
   4) Rendering
   ========================= */

// ADDED: pageOffset parameter to handle starting images on specific pages
function populateSheet(datalist, oddPageNumber, frontId, backId, pageOffset = 0) {
    // console.log(`Populating Sheet starting at page: ${oddPageNumber}`);

    const renderSide = (pageNum, targetId) => {
        const container = document.getElementById(targetId);
        if (!container) return; // if nothing do nothing, for crashes

        container.innerHTML = '';
        
        // MODIFIED: Apply offset logic
        // If we want images to start on Page 4, offset should be 3.
        // (4 - 1 - 3) * 9 = 0 (Index Start)
        const itemsPerPage = 9; 
        const startIndex = (pageNum - 1 - pageOffset) * itemsPerPage;
        
        // If index is negative, this page is reserved for custom content (like Contents page)
        if (startIndex < 0) return;

        const endIndex = startIndex + itemsPerPage;

        const pageData = datalist.slice(startIndex, endIndex);

        pageData.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('grid-item');

            const img = document.createElement('img');
            img.src = item.picture;
            
            // Add click event here
            img.onclick = () => {
                onclickeditem(item); // Correct: Pass the ENTIRE object
            };

            card.appendChild(img);
    
            container.appendChild(card);
        });

        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.classList.add('page-number');
        pageNumberDiv.innerText = `${pageNum}`;
        container.appendChild(pageNumberDiv);
    }; // Closing brace added here

    renderSide(oddPageNumber, frontId);
    renderSide(oddPageNumber + 1, backId);
}

function onclickeditem(item) { //Popup for clicked item
    // 1. Remove any existing popup (prevent duplicates)
    const existing = document.querySelector('.clickpage');
    if (existing) existing.remove();

    // 2. Create the container
    const modal = document.createElement('div');
    modal.classList.add('clickpage');

   
    
    modal.innerHTML = `
        <h2>${item.title}</h2>
        <img src="${item.picture}" alt="${item.title}">

        <button onclick="this.parentElement.remove()">Close</button>
    `;

    // 4. Add to body
    document.body.appendChild(modal);
}

/* =========================
   5) Page Cloning
   ========================= */

function createSheetClone() {
    const source = document.getElementById('pageSetup');
    sheetCount++;

    if (!source) return null; // error handling if template is missing, should never happen but just in case

    const clone = source.cloneNode(true);
    clone.id = `pageSetup-${sheetCount}`;
    clone.classList.add('cloned-page', 'clones-page');

    const inner = clone.querySelector('#flip-page-inner');
    if (inner) {
        inner.id = `flip-page-inner-${sheetCount}`;
        inner.classList.add('flip-page-inner');
    }

    const front = clone.querySelector('#flip-page-front');
    if (front) {
        front.id = `flip-page-front-${sheetCount}`;
        front.classList.add('flip-page-front');
        front.innerHTML = '';
    }

    const back = clone.querySelector('#flip-page-back');
    if (back) {
        back.id = `flip-page-back-${sheetCount}`;
        back.classList.add('flip-page-back');
        back.innerHTML = '';
    }

    document.body.appendChild(clone);
    pageMap.set(sheetCount, { root: clone, inner, front, back });

    return { root: clone, inner, front, back };
}

/* =========================
    6) Custom Pages Setup

   ========================= */


function setupCustomPage(sheetIndex, frontId, backId) {
    console.log('Setting up custom page for sheet index:', sheetIndex);
    const frontContainer = document.getElementById(frontId);
    const backContainer = document.getElementById(backId);
    
    if (!frontContainer || !backContainer) return;

    if (sheetIndex === 500) {
        console.log('Custom page setup called for sheet index 500, which is out of range.');
            frontContainer.innerHTML = `<div class="clickpage"><h2>Custom Page</h2><p>This is a custom page for the clicked item.</p></div>`;
        return;
    }


    if (sheetIndex === 0) {
        // Cover + Foreword
        frontContainer.classList.add('cover-page');
        frontContainer.innerHTML = `<div class="cover"><h1>Encyclopedia</h1></div>`;
        backContainer.innerHTML = `<div class="foreword"><h2>Foreword</h2><ul><li>

Lorem ipsum dolor sit amet. In ipsam suscipit ea labore sunt et sunt dicta qui atque unde et ipsum ipsum! Et possimus voluptate sit rerum esse id facilis pariatur id quod magnam.

Sit quibusdam consequuntur qui perspiciatis aliquid qui blanditiis itaque non dicta quaerat est sequi saepe qui ratione internos aut blanditiis ipsa? Et pariatur ipsum qui aliquam nobis et illum vero eos sint maxime et officia optio? Nam facere ratione est commodi adipisci est voluptas praesentium ut rerum dignissimos et expedita repellendus in sunt doloribus eos quod incidunt? Eos ipsum magnam hic provident voluptatem et natus culpa.

Cum dicta vitae id incidunt fugiat eum omnis quae eos voluptatibus earum qui doloribus cumque. Ab corporis unde sit aperiam nisi sit accusamus amet.
</li></ul></div>`;
    } 
    // NEW: Sheet 1 (Contents + Start of Fishes)
    else if (sheetIndex === 1) {
        // Front: Contents Page
        // Use .contents class we added in CSS
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
        // Back: Handled by populateSheet (it renders images starting at index 0)
    }
    else if (sheetIndex === lastSheetIndex) {
        // Afterword / Conclusion
        // Check if this sheet is purely for the conclusion (likely empty front) or if it's shared
        // With our new calc, if we added a sheet, front might be empty or back might be empty.
        // We generally put the conclusion on the BACK cover, or just the next available page.
        // Let's put it on the BACK of the very last sheet to simulate the book end.
        
        const conclusionHTML = `<div class="afterword"><h2>Conclusion</h2><p>
Lorem ipsum dolor sit amet. Est quia accusamus ea ipsum molestias ut facere quaerat ea consequatur quia quo eveniet quos non accusamus vero qui dolore magni. Aut molestias perferendis qui commodi consequatur qui explicabo autem id deserunt voluptas ut accusamus odio. Eum rerum rerum et pariatur excepturi vel consequatur ipsum cum galisum eius sit aperiam sequi non error reprehenderit est aspernatur quisquam. Ut itaque delectus ut laborum veritatis et laborum adipisci aut tenetur soluta ad nihil minima nam possimus tempora.

Et corporis veniam aut architecto necessitatibus est consequatur quae est modi quae et asperiores voluptas? Est nisi magnam eum voluptas voluptas et molestiae odit quo porro officiis. Eos aperiam dignissimos et quis sint et voluptate delectus qui vitae nostrum in nihil earum. Et voluptatem vero ad voluptas autem qui suscipit sunt!
</p></div>`;

        // CHECK: Does the Front side have any actual images?
        // populateSheet runs before this. If it added items, .grid-item will exist.
        const frontHasItems = frontContainer.querySelector('.grid-item');

        if (!frontHasItems) {
            // Front is empty (only has page number), so put Conclusion on Front
            frontContainer.innerHTML = conclusionHTML;
        } else {
            // Front is full, put Conclusion on Back
            backContainer.innerHTML = conclusionHTML;
        }
    }
}

/* =========================
   7) Scroll Queue
   ========================= */

function processScrollQueue() {
    if (scrollQueue.length === 0 || isAnimating) return;
    const nextScroll = scrollQueue.shift();
    executeScroll(nextScroll);
}

function scrollHandler(event) {
    scrollQueue.push(event.deltaY);
    processScrollQueue();
}

/* =========================
   8) Page State + Animation
   ========================= */

function setBookState(sheetIndex, isFlipped, isScrollingDown = false, flipInPlace = false) {
    const page = pageMap.get(sheetIndex);
    if (!page) return;

    // Populate current sheet
    const frontId = `flip-page-front-${sheetIndex}`;
    const backId = `flip-page-back-${sheetIndex}`;

    // MODIFIED: Offset logic for Image pages
    // Images start on Page 4 (Sheet 1 Back).
    // Page 4 - 1 = 3. We want index 0. So offset must be 3.
    const IMAGE_PAGE_OFFSET = 3;

    if (sheetIndex === 0) {
        setupCustomPage(sheetIndex, frontId, backId);
    } 
    else if (sheetIndex === 1) {
        // Sheet 1 is special: Front is Custom, Back is Images
        // 1. Run populateSheet with offset. 
        //    Front (Page 3) -> Offset calc (-1) -> Skips rendering
        //    Back (Page 4) -> Offset calc (0) -> Renders Images 0-8
        populateSheet(catalog, (sheetIndex * 2) + 1, frontId, backId, IMAGE_PAGE_OFFSET);
        
        // 2. Overwrite Front with Custom Content
        setupCustomPage(sheetIndex, frontId, backId);
    }
    else {
        // Regular Sheets (Images on both sides usually)
        populateSheet(catalog, (sheetIndex * 2) + 1, frontId, backId, IMAGE_PAGE_OFFSET);
        
        // Ensure Conclusion is drawn on the last sheet
        if (sheetIndex === lastSheetIndex) {
            setupCustomPage(sheetIndex, frontId, backId);
        }
    }

    // Use current sheet when flipping in place
    let movingSheetKey = flipInPlace ? sheetIndex : (isScrollingDown ? sheetIndex : sheetIndex - 1);

    // Reset animation classes
    pageMap.forEach(p => {
        p.root.classList.remove('about-to-move');
    });

    // Identify and animate the moving page
    if (movingSheetKey >= 0 && pageMap.has(movingSheetKey)) {
        const movingPage = pageMap.get(movingSheetKey);
        movingPage.root.classList.add('about-to-move');
        movingPage.root.classList.remove('animating-next', 'animating-prev');

        let zStart, zEnd;
        if (isScrollingDown) {
            zStart = 2000 + movingSheetKey;
            zEnd = 2000 - movingSheetKey;
        } else {
            zStart = 2000 - movingSheetKey;
            zEnd = 2000 + movingSheetKey;
        }

        movingPage.root.style.setProperty('--z-start', zStart);
        movingPage.root.style.setProperty('--z-end', zEnd);

        void movingPage.root.offsetWidth;

        if (isScrollingDown) {
            movingPage.root.classList.add('animating-prev');
        } else {
            movingPage.root.classList.add('animating-next');
        }

        const onAnimationEnd = () => {
            movingPage.root.classList.remove('animating-next', 'animating-prev');
        };
        movingPage.root.addEventListener('animationend', onAnimationEnd, { once: true });
    }

    // Set resting states
    pageMap.forEach((p, key) => {
        let baseZ = 0;

        if (key < sheetIndex) {
            baseZ = 10 + key;
        } else {
            baseZ = 50 - (key - sheetIndex);
        }

        if (baseZ < 1) baseZ = 1;
        p.root.style.zIndex = baseZ;

        p.root.classList.remove('active');

        if (key < sheetIndex) {
            p.inner.classList.add('flipped');
        } else if (key === sheetIndex) {
            if (isFlipped) p.inner.classList.add('flipped');
            else p.inner.classList.remove('flipped');
        } else {
            p.inner.classList.remove('flipped');
        }
    });
    
    page.root.classList.add('active');
}

/* =========================
   9) Scroll Execution
   ========================= */

let isLastSheetFlipped = false;

function executeScroll(direction) {
    const totalSheets = totalPages;
    let pageChanged = false;
    let isScrollingDown = false;

    if (direction > 0) {
        if (currentSheet < totalSheets - 1) {
            currentSheet++;
            pageChanged = true;
            isScrollingDown = false;
            isLastSheetFlipped = false;
        } else {
            isLastSheetFlipped = true;
            setBookState(currentSheet, true, false, true);
            return;
        }
    } else {
        // Handle unflip FIRST
        if (isLastSheetFlipped) {
            isLastSheetFlipped = false;
            setBookState(currentSheet, false, true, true);
            return;
        }

        if (currentSheet > 0) {
            currentSheet--;
            pageChanged = true;
            isScrollingDown = true;
            isLastSheetFlipped = false;
        }
    }

    if (pageChanged) {
        isAnimating = true;

        const sheetIndex = currentSheet;

        if (!pageMap.has(sheetIndex)) createSheetClone();
        setBookState(sheetIndex, false, isScrollingDown);

        const nextIndex = sheetIndex + 1;
        if (nextIndex <= lastSheetIndex && !pageMap.has(nextIndex)) createSheetClone();

        setTimeout(() => {
            isAnimating = false;
            processScrollQueue();
        }, 180);
    } else {
        processScrollQueue();
    }
}

/* =========================
   10) Boot
   ========================= */

document.addEventListener('DOMContentLoaded', () => {
    createSheetClone();
    setBookState(0, false);
});

window.addEventListener('wheel', (event) => {
    event.preventDefault();
    scrollHandler(event);
}, { passive: false });

