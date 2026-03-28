const CanvasInput = {
    canvases: {},
    
    create(id, width, height) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pen-canvas-wrapper';
        wrapper.style.cssText = `position:relative;width:100%;border:1.5px solid #ccc;border-radius:4px;background:#fafafa;`;
        
        const canvas = document.createElement('canvas');
        canvas.id = `canvas-${id}`;
        canvas.width = width || 700;
        canvas.height = height || 120;
        canvas.className = 'pen-canvas';
        canvas.style.cssText = `width:100%;height:${height || 120}px;display:block;`;
        
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex;gap:4px;padding:4px;background:#f1f5f9;border-top:1px solid #e2e8f0;';
        toolbar.innerHTML = `
            <button onclick="CanvasInput.setColor('${id}','#1e40af')" style="width:24px;height:24px;background:#1e40af;border-radius:4px;border:2px solid transparent;" title="Blau"></button>
            <button onclick="CanvasInput.setColor('${id}','#111')" style="width:24px;height:24px;background:#111;border-radius:4px;border:2px solid transparent;" title="Schwarz"></button>
            <button onclick="CanvasInput.setColor('${id}','#dc2626')" style="width:24px;height:24px;background:#dc2626;border-radius:4px;border:2px solid transparent;" title="Rot"></button>
            <div style="flex:1;"></div>
            <button onclick="CanvasInput.undo('${id}')" style="padding:2px 8px;font-size:11px;font-weight:700;color:#64748b;background:#e2e8f0;border-radius:4px;border:none;cursor:pointer;" title="Rückgängig">↩ Undo</button>
            <button onclick="CanvasInput.clear('${id}')" style="padding:2px 8px;font-size:11px;font-weight:700;color:#ef4444;background:#fef2f2;border-radius:4px;border:none;cursor:pointer;" title="Löschen">✕ Löschen</button>
        `;
        
        wrapper.appendChild(canvas);
        wrapper.appendChild(toolbar);
        
        // Init drawing
        setTimeout(() => this.initCanvas(id, canvas), 50);
        
        return wrapper;
    },
    
    initCanvas(id, canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e40af';
        
        this.canvases[id] = {
            canvas, ctx,
            drawing: false,
            color: '#1e40af',
            history: [],
            lastX: 0, lastY: 0
        };
        
        // Save initial state
        this.saveState(id);
        
        // Events
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches ? e.touches[0] : e;
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        };
        
        const startDraw = (e) => {
            e.preventDefault();
            const state = this.canvases[id];
            state.drawing = true;
            const pos = getPos(e);
            state.lastX = pos.x;
            state.lastY = pos.y;
        };
        
        const draw = (e) => {
            e.preventDefault();
            const state = this.canvases[id];
            if (!state.drawing) return;
            const pos = getPos(e);
            state.ctx.strokeStyle = state.color;
            state.ctx.beginPath();
            state.ctx.moveTo(state.lastX, state.lastY);
            state.ctx.lineTo(pos.x, pos.y);
            state.ctx.stroke();
            state.lastX = pos.x;
            state.lastY = pos.y;
        };
        
        const endDraw = (e) => {
            const state = this.canvases[id];
            if (state.drawing) {
                state.drawing = false;
                this.saveState(id);
            }
        };
        
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', endDraw);
        
        // S-Pen / Stylus pressure support
        canvas.addEventListener('pointerdown', (e) => {
            if (e.pressure > 0) {
                const state = this.canvases[id];
                state.ctx.lineWidth = Math.max(1, e.pressure * 4);
            }
            startDraw(e);
        });
        canvas.addEventListener('pointermove', (e) => {
            if (e.pressure > 0) {
                const state = this.canvases[id];
                state.ctx.lineWidth = Math.max(1, e.pressure * 4);
            }
            draw(e);
        });
        canvas.addEventListener('pointerup', endDraw);
    },
    
    setColor(id, color) {
        if (this.canvases[id]) this.canvases[id].color = color;
    },
    
    saveState(id) {
        const state = this.canvases[id];
        if (!state) return;
        state.history.push(state.canvas.toDataURL());
        if (state.history.length > 20) state.history.shift();
    },
    
    undo(id) {
        const state = this.canvases[id];
        if (!state || state.history.length < 2) return;
        state.history.pop();
        const img = new Image();
        img.onload = () => {
            state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
            state.ctx.drawImage(img, 0, 0);
        };
        img.src = state.history[state.history.length - 1];
    },
    
    clear(id) {
        const state = this.canvases[id];
        if (!state) return;
        state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        this.saveState(id);
    },
    
    getImageData(id) {
        const state = this.canvases[id];
        if (!state) return null;
        return state.canvas.toDataURL('image/png');
    }
};
