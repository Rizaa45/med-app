// js/editor.js

function initEditorForSlide(slideEl) {
    // Macht alle .block Elemente innerhalb der Folie verschiebbar und skalierbar
    interact('.block', { context: slideEl })
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            listeners: {
                move (event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move (event) {
                    let { x, y } = event.target.dataset;
                    x = (parseFloat(x) || 0) + event.deltaRect.left;
                    y = (parseFloat(y) || 0) + event.deltaRect.top;

                    Object.assign(event.target.style, {
                        width: `${event.rect.width}px`,
                        height: `${event.rect.height}px`,
                        transform: `translate(${x}px, ${y}px)`
                    });

                    Object.assign(event.target.dataset, { x, y });
                }
            }
        });
}

// Global Click Handler für Toolbar
document.addEventListener('mousedown', (e) => {
    const block = e.target.closest('.block');
    const toolbar = document.getElementById('floating-tools');
    
    if (block) {
        document.querySelectorAll('.block').forEach(b => b.classList.remove('block-active'));
        block.classList.add('block-active');
        toolbar.classList.remove('opacity-0', 'translate-y-20');
        state.activeElement = block;
    } else if (!e.target.closest('#floating-tools')) {
        toolbar.classList.add('opacity-0', 'translate-y-20');
    }
});

function execCmd(cmd) {
    document.execCommand(cmd, false, null);
}

// Bild einfügen
document.getElementById('tool-img').onclick = () => {
    const url = prompt("Bild URL oder Pfad eingeben:");
    if (url) {
        const slide = document.querySelector('.slide'); // Nimmt die erste sichtbare
        const imgBlock = document.createElement('div');
        imgBlock.className = 'block';
        imgBlock.style.width = "400px";
        imgBlock.innerHTML = `<img src="${url}" class="w-full h-auto rounded-lg shadow-lg">`;
        slide.appendChild(imgBlock);
        initEditorForSlide(slide);
    }
};
