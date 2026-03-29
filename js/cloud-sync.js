// js/cloud-sync.js
// Komplett sichere Frontend-Logik. Keine API-Keys enthalten!

const SLMCloud = {
    // Trage hier die Live-URL deines Vercel-Projekts ein, falls dein Frontend auf GitHub liegt. 
    // Wenn beides auf Vercel liegt, reicht '/api/db'
    API_URL: '/api/db', 
    
    pin: null,
    userBinId: null,
    data: {},
    ready: false,
    saving: false,

    // Standard-Datenstruktur für neue Nutzer
    defaults() {
        return {
            pin: '',
            created: new Date().toISOString().slice(0,10),
            arena_xp: 0,
            arena_ds: 0,
            arena_last: '',
            arena_mastery: {},
            slm_exam_history: [],
            slm_exam_weaknesses: []
        };
    },

    // Generiert einen 4-stelligen PIN (1000 - 9999)
    generatePin() {
        return String(Math.floor(1000 + Math.random() * 9000));
    },

    // Zentraler Fetch-Wrapper, der mit deinem Vercel-Backend spricht
    async apiCall(payload) {
        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error('Netzwerk/Server Fehler');
        }
        return await response.json();
    },

    // 1. Login-Prozess
    async login(pin) {
        // Fragt das Backend, ob der PIN existiert
        const master = await this.apiCall({ action: 'get_master' });
        const binId = master.users?.[pin];
        
        if (!binId) throw new Error('PIN nicht gefunden');
        
        // Holt die persönlichen Daten des Users
        this.pin = pin;
        this.userBinId = binId;
        this.data = await this.apiCall({ action: 'get_user', binId: binId });
        this.ready = true;
        localStorage.setItem('slm_pin', pin);
        this.syncToLocal();
        return this.data;
    },

    // 2. Registrierungs-Prozess
    async register() {
        const master = await this.apiCall({ action: 'get_master' });
        
        let pin;
        do { pin = this.generatePin(); } while (master.users?.[pin]); // Verhindert doppelte PINs
        
        const userData = this.defaults();
        userData.pin = pin;
        
        // User Bin anlegen
        const { id: binId } = await this.apiCall({ action: 'create_user', data: userData });
        
        // Master Bin aktualisieren
        if (!master.users) master.users = {};
        master.users[pin] = binId;
        await this.apiCall({ action: 'update_master', data: master });
        
        this.pin = pin;
        this.userBinId = binId;
        this.data = userData;
        this.ready = true;
        localStorage.setItem('slm_pin', pin);
        this.syncToLocal();
        return pin;
    },

    // 3. Speicher-Prozess (Auto-Save mit 2-Sekunden Debounce)
    _saveTimeout: null,
    save() {
        this.syncFromLocal();
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this._doSave(), 2000);
    },

    async _doSave() {
        if (!this.ready || !this.userBinId || this.saving) return;
        this.saving = true;
        try {
            await this.apiCall({ 
                action: 'update_user', 
                binId: this.userBinId, 
                data: this.data 
            });
        } catch(e) {
            console.warn('Fehler beim Speichern in der Cloud:', e);
        }
        this.saving = false;
    },

    // Lokaler Sync (damit die restlichen Module funktionieren, ohne dass wir sie umprogrammieren müssen)
    syncToLocal() {
        localStorage.setItem('arena_xp', this.data.arena_xp || 0);
        localStorage.setItem('arena_ds', this.data.arena_ds || 0);
        localStorage.setItem('arena_last', this.data.arena_last || '');
        localStorage.setItem('arena_mastery', JSON.stringify(this.data.arena_mastery || {}));
        localStorage.setItem('slm_exam_history', JSON.stringify(this.data.slm_exam_history || []));
        localStorage.setItem('slm_exam_weaknesses', JSON.stringify(this.data.slm_exam_weaknesses || []));
    },

    syncFromLocal() {
        this.data.arena_xp = parseInt(localStorage.getItem('arena_xp') || '0');
        this.data.arena_ds = parseInt(localStorage.getItem('arena_ds') || '0');
        this.data.arena_last = localStorage.getItem('arena_last') || '';
        this.data.arena_mastery = JSON.parse(localStorage.getItem('arena_mastery') || '{}');
        this.data.slm_exam_history = JSON.parse(localStorage.getItem('slm_exam_history') || '[]');
        this.data.slm_exam_weaknesses = JSON.parse(localStorage.getItem('slm_exam_weaknesses') || '[]');
    },

    // Checkt beim Laden der Seite, ob der User schon eingeloggt ist
    async autoLogin() {
        const pin = localStorage.getItem('slm_pin');
        if (pin) {
            try {
                await this.login(pin);
                return true;
            } catch(e) {
                localStorage.removeItem('slm_pin');
                return false;
            }
        }
        return false;
    },

    // Logoff
    logout() {
        this.save();
        this.pin = null;
        this.userBinId = null;
        this.data = {};
        this.ready = false;
        localStorage.removeItem('slm_pin');
    }
};
