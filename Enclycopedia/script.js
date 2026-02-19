/* step 1 - Setup Data */

function SetupData() {
    const bugs = bugArr.map(item => ({ ...item, category: 'Bug' }));
    const fish = fishArr.map(item => ({ ...item, category: 'Fish' }));
    const diving = divingArr.map(item => ({ ...item, category: 'Diving' }));
    return [...fish, ...bugs, ...diving];
}

SetupData();


/* step 2 - Setup CLASSES */

class PaginaData {
    constructor(id, title, description, page_number, page_type, Object_array) {
       this.id = id;
       this.title = title;
       this.description = description;
       this.page_number = page_number;
       this.page_type = page_type;
       this.Object_array = Object_array;
    } 
}

/* step 3 - Populate Pagina */

function PopulatePaginaDefault(datalist, oddpagenumber) {

console.log(`Populating Sheet starting at page: ${oddpagenumber}`); /* length of array */

const renderSide = (pageNum, targetId) => {
        const container = document.getElementById(targetId);  
        if (!container) return;

        container.innerHTML = ''; // Clear previous content

        const itemsPerPage = 9;
        const startIndex = (pageNum - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        // Slice data for this specific side
        const pageData = datalist.slice(startIndex, endIndex);

        // Create Grid Items
        pageData.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('grid-item');
            
            const img = document.createElement('img');
            img.src = item.picture;

            card.appendChild(img);
            container.appendChild(card);
        });

        // Add Page Number in corner
        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.classList.add('page-number');
        pageNumberDiv.innerText = `${pageNum}`;
        container.appendChild(pageNumberDiv);
    };
    // ---------------------------------------------------------

    // 1. Render the Front (The odd number, e.g., 1)
    renderSide(oddpagenumber, 'flip-page-front');

    // 2. Render the Back (The even number, e.g., 2)
    renderSide(oddpagenumber + 1, 'flip-page-back');
}
    const allData = SetupData();
    let currentPage = 1;

function scrollHandler(event) {
    const totalPages = Math.ceil(allData.length / 9);
    
    // We need to know if we successfully changed the page
    let pageChanged = false;

    if (event.deltaY > 0) {
        console.log("scrolling down (Previous Page)");
        if (currentPage > 1) {
            currentPage--;
            pageChanged = true;
        }
    } else {
        console.log("scrolling up (Next Page)");
        if (currentPage < totalPages) {
            currentPage++;
            pageChanged = true;
        }
    }

    // Only do the heavy work if the page number actually changed
    if (pageChanged) {
        // LOGIC: Even numbers go on Back, Odd numbers go on Front
        // Any number % 2 === 0 means it is Even
        if (currentPage % 2 === 0) {
            
            setBookState(true); // Add .flipped class
        } else {
            
            setBookState(false); 
        }
    }
}
// extra helper function to set book state
function setBookState(isFlipped) {
    const bookInner = document.getElementById('flip-page-inner');
    if(isFlipped) {
        bookInner.classList.add('flipped');
    } else {
        bookInner.classList.remove('flipped');
    }
}







function clonePageSetup({ appendTo = document.body, idSuffix = Date.now() } = {}) {
    const source = document.getElementById('pageSetup');
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.id = `pageSetup-${idSuffix}`;

    const inner = clone.querySelector('#flip-page-inner');
    if (inner) inner.id = `flip-page-inner-${idSuffix}`;

    const front = clone.querySelector('#flip-page-front');
    if (front) { front.id = `flip-page-front-${idSuffix}`; front.innerHTML = ''; }

    const back = clone.querySelector('#flip-page-back');
    if (back) { back.id = `flip-page-back-${idSuffix}`; back.innerHTML = ''; }

    appendTo.appendChild(clone);
    console.log(`Cloned page setup with suffix: ${idSuffix}`);
    return { root: clone, inner, front, back };
}












// Initial Load 

document.addEventListener('DOMContentLoaded', () => {
    PopulatePaginaDefault(allData, 1); // Start on Page 1
    setBookState(false);
});
    
window.addEventListener('wheel', (event) => {
    event.preventDefault(); 
    scrollHandler(event);   
}, { passive: false });     


const { front } = clonePageSetup({ idSuffix: '5' });