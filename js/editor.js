// js/editor.js

let activeElement = null;
let isDragging = false;
let isResizing = false;
let startX, startY, startWidth, startHeight, startLeft, startTop;

// --- 1. ELEMENTE AUSWÄHLEN & TOOLBAR ---
document.addEventListener('mousedown', (e) => {
    const block = e.target.closest('.editable-block');
    
    // Deaktiviere altes Element
    if (activeElement && activeElement !== block) {
        activeElement.classList.remove('is-active');
    }

    if (block) {
        activeElement = block;
        activeElement.classList.add('is-active');
        showToolbar(true);

        // Dragging starten
        if (e.target.closest('.drag-handle')) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = activeElement.offsetLeft;
            startTop = activeElement.offsetTop;
            e.preventDefault();
        }

        // Resizing starten
        if (e.target.closest('.resize-handle')) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = activeElement.offsetWidth;
            startHeight = activeElement.offsetHeight;
            e.preventDefault();
        }
    } else if (!e.target.closest('#smart-toolbar')) {
        showToolbar(false);
        activeElement = null;
    }
});

// --- 2. BEWEGEN & GRÖSSE ÄNDERN ---
document.addEventListener('mousemove', (e) => {
    if (!activeElement) return;

    if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        activeElement.style.left = `${startLeft + dx}px`;
        activeElement.style.top = `${startTop + dy}px`;
    }

    if (isResizing) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        activeElement.style.width = `${startWidth + dx}px`;
        activeElement.style.height = `${startHeight + dy}px`;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
});

// --- 3. TEXT FORMATIERUNG ---
function showToolbar(visible) {
    const toolbar = document.getElementById('smart-toolbar');
    if (visible) {
        toolbar.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        toolbar.classList.add('opacity-0', 'pointer-events-none');
    }
}

document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
    btn.addEventListener('click', () => {
        const command = btn.getAttribute('data-command');
        document.execCommand(command, false, null);
    });
});

document.getElementById('font-family').addEventListener('change', (e) => {
    document.execCommand('fontName', false, e.target.value);
});

document.getElementById('color-picker').addEventListener('change', (e) => {
    document.execCommand('foreColor', false, e.target.value);
});

// --- 4. MANUELLES HINZUFÜGEN ---
document.getElementById('add-text-btn').addEventListener('click', () => {
    const container = activeElement?.closest('.page-presentation') || document.querySelector('.page-presentation');
    if (!container) return;
    
    const newBlock = document.createElement('div');
    newBlock.className = 'editable-block';
    newBlock.style.left = '50px';
    newBlock.style.top = '50px';
    newBlock.style.width = '250px';
    newBlock.innerHTML = `
        <div class="drag-handle"><i class="fas fa-grip-horizontal"></i></div>
        <div contenteditable="true" class="p-2 text-slate-800">Neuer Text...</div>
        <div class="resize-handle"></div>
    `;
    container.appendChild(newBlock);
});
