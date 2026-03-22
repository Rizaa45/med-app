// js/editor.js
let selectedBlock = null;
let isDragging = false;
let isResizing = false;

document.addEventListener('mousedown', (e) => {
    const block = e.target.closest('.block');
    const resizeHandle = e.target.closest('.resize-handle');

    if (resizeHandle) {
        isResizing = true;
        selectedBlock = resizeHandle.parentElement;
        e.preventDefault();
        return;
    }

    if (block) {
        if (selectedBlock) selectedBlock.classList.remove('block-active');
        selectedBlock = block;
        selectedBlock.classList.add('block-active');
        isDragging = true;
        document.getElementById('editor-toolbar').style.display = 'flex';
    } else if (!e.target.closest('#editor-toolbar')) {
        if (selectedBlock) selectedBlock.classList.remove('block-active');
        selectedBlock = null;
        document.getElementById('editor-toolbar').style.display = 'none';
    }
});

document.addEventListener('mousemove', (e) => {
    if (!selectedBlock) return;

    if (isDragging) {
        const slide = selectedBlock.closest('.slide');
        const rect = slide.getBoundingClientRect();
        selectedBlock.style.left = (e.clientX - rect.left - 20) + 'px';
        selectedBlock.style.top = (e.clientY - rect.top - 20) + 'px';
    }

    if (isResizing) {
        const rect = selectedBlock.getBoundingClientRect();
        selectedBlock.style.width = (e.clientX - rect.left) + 'px';
        selectedBlock.style.height = (e.clientY - rect.top) + 'px';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
});

function formatDoc(cmd) {
    document.execCommand(cmd, false, null);
}

// Bild einfügen Option
document.getElementById('add-img-tool').addEventListener('click', () => {
    const url = prompt("Bild URL eingeben:");
    if (url && selectedBlock) {
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '100%';
        selectedBlock.innerHTML = '';
        selectedBlock.appendChild(img);
        selectedBlock.appendChild(createHandle());
    }
});

function createHandle() {
    const h = document.createElement('div');
    h.className = 'resize-handle';
    return h;
}
