// script.js

// Bookshelf Logic
async function initBookshelf() {
    const shelf = document.getElementById('shelf');
    if (!shelf) return;

    try {
        const response = await fetch('pdf-data.json');
        const books = await response.json();

        books.forEach(book => {
            const bookEl = document.createElement('div');
            bookEl.className = 'book-wrapper';
            bookEl.innerHTML = `
                <div class="book">
                    <div class="book-front" style="background-image: url('${book.cover}')"></div>
                    <div class="book-back"></div>
                    <div class="book-spine">
                        <span style="writing-mode: vertical-rl; text-orientation: mixed;">${book.title}</span>
                    </div>
                    <div class="book-top"></div>
                    <div class="book-bottom"></div>
                    <div class="book-right"></div>
                </div>
                <div class="book-info">${book.title}</div>
            `;

            // Random spine color
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
            bookEl.querySelector('.book-spine').style.backgroundColor = randomColor;

            bookEl.addEventListener('click', () => {
                window.location.href = `viewer.html?book=${book.id}`;
            });

            shelf.appendChild(bookEl);
        });
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

// PDF.js Worker Configuration
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Viewer Logic with Virtualization
let pageFlip;
let pdfDoc = null;
let pageRenderStatus = {}; // pageNum -> { status: 'idle'|'rendering'|'rendered', canvas: HTMLCanvasElement, renderTask: Promise }
const VIRTUAL_BUFFER = 2; // Render current ± 2 pages

async function renderPageSlot(pageNum, pageDiv) {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return;

    const currentStatus = pageRenderStatus[pageNum];
    if (currentStatus && (currentStatus.status === 'rendered' || currentStatus.status === 'rendering')) {
        return;
    }

    pageRenderStatus[pageNum] = { status: 'rendering', canvas: null, renderTask: null };

    try {
        const page = await pdfDoc.getPage(pageNum);
        const pixelRatio = window.devicePixelRatio || 1;
        // High-DPI scale for crisp rendering
        const baseScale = 1.5;
        const viewport = page.getViewport({ scale: baseScale * pixelRatio });

        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const ctx = canvas.getContext('2d');
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);
        pageRenderStatus[pageNum].renderTask = renderTask;
        await renderTask.promise;

        pageDiv.innerHTML = '';
        pageDiv.appendChild(canvas);
        pageRenderStatus[pageNum].status = 'rendered';
        pageRenderStatus[pageNum].canvas = canvas;
    } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
            console.error(`Error rendering page ${pageNum}:`, err);
            pageRenderStatus[pageNum] = { status: 'idle', canvas: null, renderTask: null };
        }
    }
}

function unloadPageSlot(pageNum, pageDiv) {
    const status = pageRenderStatus[pageNum];
    if (!status || status.status !== 'rendered') return;

    if (status.canvas) {
        // Free canvas memory
        status.canvas.width = 1;
        status.canvas.height = 1;
    }
    pageDiv.innerHTML = `<div class="page-loading">페이지 ${pageNum}</div>`;
    pageRenderStatus[pageNum] = { status: 'idle', canvas: null, renderTask: null };
}

function updateVirtualPages(activePageZeroBased, totalPages) {
    const activePage = activePageZeroBased + 1;
    // PageFlip in spread mode shows two pages (e.g. left and right)
    const minPage = Math.max(1, activePage - VIRTUAL_BUFFER);
    const maxPage = Math.min(totalPages, activePage + VIRTUAL_BUFFER + 1);

    for (let p = 1; p <= totalPages; p++) {
        const pageDiv = document.querySelector(`.page[data-page-num="${p}"]`);
        if (!pageDiv) continue;

        if (p >= minPage && p <= maxPage) {
            renderPageSlot(p, pageDiv);
        } else {
            unloadPageSlot(p, pageDiv);
        }
    }
}

async function initViewer() {
    const viewer = document.getElementById('book');
    const loadingEl = document.getElementById('loading');
    if (!viewer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('book');

    if (!bookId) {
        alert('No book specified!');
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch('pdf-data.json');
        const books = await response.json();
        const bookData = books.find(b => b.id === bookId);

        if (!bookData) {
            alert('Book not found!');
            return;
        }

        document.title = `${bookData.title} - Viewer`;

        // Determine PDF URL
        const pdfUrl = bookData.pdfUrl || `pdf/${bookData.id}.pdf`;
        if (!pdfUrl) {
            alert('PDF source path not found!');
            return;
        }

        // Load PDF Document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        const totalPages = pdfDoc.numPages;

        // Create empty placeholder DOM slots for all pages
        viewer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.setAttribute('data-page-num', i);
            pageDiv.innerHTML = `<div class="page-loading">페이지 ${i}</div>`;
            viewer.appendChild(pageDiv);
        }

        // Pre-render initial pages before initializing PageFlip
        const initialPagesToRender = Math.min(totalPages, 4);
        for (let i = 1; i <= initialPagesToRender; i++) {
            const pageDiv = viewer.querySelector(`.page[data-page-num="${i}"]`);
            await renderPageSlot(i, pageDiv);
        }

        if (loadingEl) loadingEl.style.display = 'none';
        viewer.style.display = 'block';

        // Initialize PageFlip
        pageFlip = new St.PageFlip(viewer, {
            width: 550,
            height: 733,
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));

        // Controls
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => pageFlip.flipPrev());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => pageFlip.flipNext());
        }

        // Page indicator and Virtualization trigger on flip
        const pageNumEl = document.getElementById('page-num');
        const totalPageEl = document.getElementById('total-page');
        if (totalPageEl) totalPageEl.innerText = totalPages;

        pageFlip.on('flip', (e) => {
            const currentPage = e.data; // 0-based index
            if (pageNumEl) pageNumEl.innerText = currentPage + 1;
            updateVirtualPages(currentPage, totalPages);
        });

        // Initial virtual update for surrounding buffer
        updateVirtualPages(0, totalPages);

    } catch (error) {
        console.error('Error initializing viewer:', error);
        if (loadingEl) loadingEl.innerText = 'PDF 문서를 로드하지 못했습니다.';
    }
}

// Check which page we are on
if (document.getElementById('shelf')) {
    initBookshelf();
} else if (document.getElementById('book')) {
    window.addEventListener('DOMContentLoaded', initViewer);
}
