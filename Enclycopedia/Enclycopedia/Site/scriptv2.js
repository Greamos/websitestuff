/* step 1 - Setup Data */

function SetupData() {
    const bugs = bugArr.map(item => ({ ...item, category: 'Bug' }));
    const fish = fishArr.map(item => ({ ...item, category: 'Fish' }));
    const diving = divingArr.map(item => ({ ...item, category: 'Diving' }));
    return [...fish, ...bugs, ...diving];
}

const pagemap = new Map();
let PageCloneCount = -1;
let PageCount = 0;


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


/* Clone a fresh page setup */
function clonePageSetup() {
    const source = document.getElementById('pageSetup');
    PageCloneCount++;
                                                
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.id = `pageSetup-${PageCloneCount}`;
    clone.classList.add('cloned-page');

    const inner = clone.querySelector('#flip-page-inner');
    if (inner) {
        inner.id = `flip-page-inner-${PageCloneCount}`;
        inner.classList.add('flip-page-inner');
    }
    const front = clone.querySelector('#flip-page-front');
    if (front) {
        front.id = `flip-page-front-${PageCloneCount}`;
        front.classList.add('flip-page-front');
        front.innerHTML = '';
    }

    const back = clone.querySelector('#flip-page-back');
    if (back) {
        back.id = `flip-page-back-${PageCloneCount}`;
        back.classList.add('flip-page-back');
        back.innerHTML = '';
    }

    document.body.appendChild(clone);
                                                                console.log(`Cloned page setup with suffix: ${PageCloneCount}`);
    pagemap.set(PageCloneCount, { root: clone, inner, front, back });
                                                                console.log(pagemap);
    
    return { root: clone, inner, front, back };
}


function scrollHandler(event) {
    let pageChanged = false;
    const totalPages = Math.ceil(allData.length / 9);

    if (event.deltaY > 0) {
        // Scrolling up = next page
        if (PageCount < totalPages - 1) {
            PageCount++;
            pageChanged = true;
        }      
    } else {
        // Scrolling down = previous page
        if (PageCount > 0) {
            PageCount--;
            pageChanged = true;
        }
    }

    if (pageChanged) {
        const cloneNumber = Math.floor(PageCount / 2);
        
        console.log(`PageCount: ${PageCount}, cloneNumber: ${cloneNumber}, PageCloneCount: ${PageCloneCount}`);

        // Clone it if it doesn't exist yet
        if (!pagemap.has(cloneNumber)) {
            clonePageSetup();
        }
        
        // Flip based on odd/even PageCount
        const shouldFlip = PageCount % 2 === 1;
        setBookState(cloneNumber, shouldFlip);
        
        // Pre-clone AFTER setting state (so it's ready for next flip)
        if (shouldFlip) {
            const nextCloneNumber = cloneNumber + 1;
            if (!pagemap.has(nextCloneNumber)) {
                clonePageSetup();
            }
        }
    }
}


function setBookState(pageNumber, isFlipped) {
    const page = pagemap.get(pageNumber);
    if (!page) return;
    
    // Set flip state for all pages
    pagemap.forEach((p, key) => {
        p.root.classList.remove('active');
        
        if (key < pageNumber) {
            // Pages before current: always flipped
            p.inner.classList.add('flipped');
        } else if (key === pageNumber) {
            // Current page: flip based on shouldFlip
            if (isFlipped) {
                p.inner.classList.add('flipped');
            } else {
                p.inner.classList.remove('flipped');
            }
        } else {
            // Pages after current: never flipped
            p.inner.classList.remove('flipped');
        }
    });
    
    // Add active to current page
    page.root.classList.add('active');
}




/* == Commands to run == */

const allData = SetupData();

document.addEventListener('DOMContentLoaded', () => {
    clonePageSetup();
    setBookState(0, false);
});

window.addEventListener('wheel', (event) => {
    event.preventDefault();
    scrollHandler(event);   
}, { passive: false });
