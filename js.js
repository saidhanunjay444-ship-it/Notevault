'use strict';

class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEnd = false;
        this.data = [];
        this.freq = 0;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
        this.size = 0;
    }

    insert(word, data) {
        if (!word) return;
        let node = this.root;
        const lower = String(word).toLowerCase();
        for (let i = 0; i < lower.length; i++) {
            const ch = lower[i];
            if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
        node.freq++;
        if (data && !node.data.some(d => String(d.id) === String(data.id))) node.data.push(data);
        this.size++;
    }

    search(prefix) {
        if (!prefix) return [];
        let node = this.root;
        const lower = String(prefix).toLowerCase();
        for (let i = 0; i < lower.length; i++) {
            if (!node.children.has(lower[i])) return [];
            node = node.children.get(lower[i]);
        }
        return this._collect(node);
    }

    _collect(node) {
        const results = [];
        if (node.isEnd) results.push(...node.data);
        for (const [, child] of node.children) results.push(...this._collect(child));
        return results;
    }

    has(word) {
        if (!word) return false;
        let node = this.root;
        const lower = String(word).toLowerCase();
        for (let i = 0; i < lower.length; i++) {
            if (!node.children.has(lower[i])) return false;
            node = node.children.get(lower[i]);
        }
        return node.isEnd;
    }

    // FIX: Trie no longer cuts off suggestions prematurely
    suggest(prefix) {
        const results = this.search(prefix);
        const unique = new Map();
        results.forEach(item => {
            if (!unique.has(String(item.id))) unique.set(String(item.id), item);
        });
        return Array.from(unique.values());
    }

    // FIX: Destructive deletion bug resolved; now filters by ID
    remove(word, noteId) {
        if (!word) return;
        const lower = String(word).toLowerCase();
        let node = this.root;
        for (let i = 0; i < lower.length; i++) {
            if (!node.children.has(lower[i])) return;
            node = node.children.get(lower[i]);
        }
        if (node.isEnd) {
            const initialLen = node.data.length;
            node.data = node.data.filter(d => String(d.id) !== String(noteId));
            if (node.data.length < initialLen) node.freq = Math.max(0, node.freq - 1);
            if (node.data.length === 0) {
                node.isEnd = false;
                this.size = Math.max(0, this.size - 1);
            }
        }
    }

    getAll() {
        const results = [];
        this._collectAll(this.root, results);
        return results;
    }

    _collectAll(node, results) {
        if (node.isEnd) results.push(...node.data);
        for (const [, child] of node.children) this._collectAll(child, results);
    }
}

class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, cb) {
        if (!this.events.has(event)) this.events.set(event, []);
        this.events.get(event).push(cb);
        return () => this.off(event, cb);
    }

    off(event, cb) {
        if (!this.events.has(event)) return;
        const list = this.events.get(event);
        const idx = list.indexOf(cb);
        if (idx > -1) list.splice(idx, 1);
    }

    emit(event, ...args) {
        if (!this.events.has(event)) return;
        this.events.get(event).forEach(cb => {
            try { cb(...args); } catch (e) { console.error(`Event error [${event}]:`, e); }
        });
    }

    once(event, cb) {
        const wrapper = (...args) => { cb(...args); this.off(event, wrapper); };
        this.on(event, wrapper);
    }

    removeAll(event) {
        if (event) this.events.delete(event);
        else this.events.clear();
    }
}

class Queue {
    constructor(maxSize) {
        this.items = [];
        this.maxSize = maxSize || Infinity;
    }

    enqueue(item) {
        if (this.items.length >= this.maxSize) this.dequeue();
        this.items.push(item);
        return this;
    }

    dequeue() { return this.items.shift(); }
    peek() { return this.items[0]; }
    get size() { return this.items.length; }
    isEmpty() { return this.items.length === 0; }
    toArray() { return [...this.items]; }
    clear() { this.items = []; }
    contains(pred) { return this.items.some(pred); }

    remove(pred) {
        const idx = this.items.findIndex(pred);
        if (idx > -1) { this.items.splice(idx, 1); return true; }
        return false;
    }

    forEach(cb) { this.items.forEach(cb); }
}

class HashMap {
    constructor() { this.map = new Map(); }
    set(k, v) { this.map.set(k, v); return this; }
    get(k) { return this.map.get(k); }
    has(k) { return this.map.has(k); }
    delete(k) { return this.map.delete(k); }
    get size() { return this.map.size; }
    keys() { return Array.from(this.map.keys()); }
    values() { return Array.from(this.map.values()); }
    entries() { return Array.from(this.map.entries()); }
    clear() { this.map.clear(); }
    forEach(cb) { this.map.forEach(cb); }

    toObject() {
        const obj = {};
        this.map.forEach((v, k) => { obj[k] = v; });
        return obj;
    }

    static fromObject(obj) {
        const m = new HashMap();
        Object.entries(obj).forEach(([k, v]) => m.set(k, v));
        return m;
    }

    getOrDefault(k, def) {
        return this.map.has(k) ? this.map.get(k) : def;
    }

    computeIfAbsent(k, fn) {
        if (!this.map.has(k)) this.map.set(k, fn(k));
        return this.map.get(k);
    }
}

class HashSet {
    constructor(items) { this.set = new Set(items || []); }
    add(item) { this.set.add(String(item)); return this; }
    delete(item) { return this.set.delete(String(item)); }
    has(item) { return this.set.has(String(item)); }
    get size() { return this.set.size; }
    toArray() { return Array.from(this.set); }
    clear() { this.set.clear(); }

    toggle(item) {
        const strItem = String(item);
        if (this.has(strItem)) { this.delete(strItem); return false; }
        this.add(strItem);
        return true;
    }

    union(other) {
        const r = new HashSet(this.toArray());
        other.toArray().forEach(i => r.add(i));
        return r;
    }

    intersection(other) {
        const r = new HashSet();
        this.toArray().forEach(i => { if (other.has(i)) r.add(i); });
        return r;
    }

    difference(other) {
        const r = new HashSet();
        this.toArray().forEach(i => { if (!other.has(i)) r.add(i); });
        return r;
    }

    forEach(cb) { this.set.forEach(cb); }
}

class SortStrategy {
    static bySemester(a, b, dir) {
        const r = a.semester - b.semester;
        return dir === 'desc' ? -r : r;
    }

    static byCourse(a, b, dir) {
        const r = String(a.course).localeCompare(String(b.course));
        return dir === 'desc' ? -r : r;
    }

    static byYear(a, b, dir) {
        const r = a.year - b.year;
        return dir === 'desc' ? -r : r;
    }

    static byTitle(a, b, dir) {
        const r = String(a.title).localeCompare(String(b.title));
        return dir === 'desc' ? -r : r;
    }

    static byTopics(a, b, dir) {
        const r = a.topics.length - b.topics.length;
        return dir === 'desc' ? -r : r;
    }

    static byRelevance(a, b, query) {
        return SortStrategy._score(b, query) - SortStrategy._score(a, query);
    }

    static _score(note, query) {
        if (!query) return 0;
        const q = String(query).toLowerCase();
        let s = 0;
        if (String(note.title).toLowerCase().includes(q)) s += 10;
        if (String(note.title).toLowerCase().startsWith(q)) s += 5;
        if (String(note.subject).toLowerCase().includes(q)) s += 6;
        if (String(note.course).toLowerCase().includes(q)) s += 4;
        if (String(note.stream).toLowerCase().includes(q)) s += 3;
        if (note.topics) note.topics.forEach(t => { if (String(t).toLowerCase().includes(q)) s += 2; });
        return s;
    }

    static mergeSort(arr, cmp) {
        if (arr.length <= 1) return arr;
        const mid = Math.floor(arr.length / 2);
        const left = SortStrategy.mergeSort(arr.slice(0, mid), cmp);
        const right = SortStrategy.mergeSort(arr.slice(mid), cmp);
        return SortStrategy._merge(left, right, cmp);
    }

    static _merge(left, right, cmp) {
        const result = [];
        let i = 0, j = 0;
        while (i < left.length && j < right.length) {
            if (cmp(left[i], right[j]) <= 0) result.push(left[i++]);
            else result.push(right[j++]);
        }
        while (i < left.length) result.push(left[i++]);
        while (j < right.length) result.push(right[j++]);
        return result;
    }

    static binarySearch(arr, target, key) {
        let lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            const val = key ? arr[mid][key] : arr[mid];
            if (val === target) return mid;
            if (val < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    static levenshtein(a, b) {
        const m = [];
        for (let i = 0; i <= b.length; i++) m[i] = [i];
        for (let j = 0; j <= a.length; j++) m[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) m[i][j] = m[i - 1][j - 1];
                else m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
            }
        }
        return m[b.length][a.length];
    }
}

class StateManager extends EventEmitter {
    constructor(initial) {
        super();
        this._state = { ...initial };
        this._history = [];
        this._maxHistory = 50;
    }

    get state() { return { ...this._state }; }

    setState(updates) {
        const prev = { ...this._state };
        this._history.push(prev);
        if (this._history.length > this._maxHistory) this._history.shift();
        Object.assign(this._state, updates);
        const changed = Object.keys(updates).filter(k => prev[k] !== this._state[k]);
        if (changed.length > 0) {
            this.emit('stateChange', this._state, prev, changed);
            changed.forEach(k => this.emit(`change:${k}`, this._state[k], prev[k]));
        }
    }

    undo() {
        if (this._history.length > 0) {
            this._state = this._history.pop();
            this.emit('stateChange', this._state, null, Object.keys(this._state));
            return true;
        }
        return false;
    }

    reset(initial) {
        this._history = [];
        this._state = { ...initial };
        this.emit('stateChange', this._state, null, Object.keys(this._state));
    }

    getField(key) { return this._state[key]; }
}

class StorageManager {
    constructor(prefix) {
        this.prefix = prefix || 'nv_';
        this.cache = new HashMap();
        this._load();
    }

    _load() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    const short = key.substring(this.prefix.length);
                    try { this.cache.set(short, JSON.parse(localStorage.getItem(key))); }
                    catch (e) { this.cache.set(short, localStorage.getItem(key)); }
                }
            }
        } catch (e) {}
    }

    get(key, def) {
        if (this.cache.has(key)) return this.cache.get(key);
        try {
            const raw = localStorage.getItem(this.prefix + key);
            if (raw === null) return def;
            const parsed = JSON.parse(raw);
            this.cache.set(key, parsed);
            return parsed;
        } catch (e) { return def; }
    }

    set(key, value) {
        this.cache.set(key, value);
        try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); }
        catch (e) {
            // FIX: Notify user on quota exceeded
            if (e.name === 'QuotaExceededError') {
                window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Storage limit reached! Please clear old data.' }}));
            }
        }
    }

    remove(key) {
        this.cache.delete(key);
        try { localStorage.removeItem(this.prefix + key); } catch (e) {}
    }

    clear() {
        this.cache.clear();
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.prefix)) keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
    }

    getSize() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.prefix)) total += localStorage.getItem(k).length * 2;
            }
        } catch (e) {}
        return total;
    }

    getFormattedSize() {
        const b = this.getSize();
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }

    exportData() { return JSON.stringify(this.cache.toObject(), null, 2); }

    importData(json) {
        try {
            const data = JSON.parse(json);
            Object.entries(data).forEach(([k, v]) => this.set(k, v));
            return true;
        } catch (e) { return false; }
    }
}

class IndexedDBManager {
    constructor(dbName, version) {
        this.dbName = dbName || 'NoteVaultDB';
        this.version = version || 1;
        this.db = null;
        this.storeName = 'files';
        this._ready = this._init();
    }

    _init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('noteId', 'noteId', { unique: false });
                    store.createIndex('fileName', 'fileName', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async ready() {
        if (this.db) return this.db;
        return this._ready;
    }

    async saveFile(noteId, file) {
        await this.ready();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const record = {
                    id: 'file_' + noteId,
                    noteId: noteId,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    data: e.target.result,
                    timestamp: Date.now()
                };
                const request = store.put(record);
                request.onsuccess = () => resolve(record);
                request.onerror = (ev) => reject(ev.target.error);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    async getFile(noteId) {
        await this.ready();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('file_' + noteId);
            request.onsuccess = (event) => resolve(event.target.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteFile(noteId) {
        await this.ready();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete('file_' + noteId);
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getAllFiles() {
        await this.ready();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = (event) => resolve(event.target.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async clearAll() {
        await this.ready();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getCount() {
        await this.ready();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count();
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async hasFile(noteId) {
        const file = await this.getFile(noteId);
        return file !== null;
    }

    async getStorageSize() {
        const files = await this.getAllFiles();
        let total = 0;
        files.forEach(f => { total += f.fileSize || 0; });
        return total;
    }

    async getFormattedStorageSize() {
        await this.ready();
        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = (e) => {
                let total = 0;
                if (e.target.result) e.target.result.forEach(f => { total += f.fileSize || 0; });
                if (total < 1024) resolve(total + ' B');
                else if (total < 1048576) resolve((total / 1024).toFixed(1) + ' KB');
                else resolve((total / 1048576).toFixed(1) + ' MB');
            };
            request.onerror = () => resolve('0 B');
        });
    }
}

class DynamicSyncManager extends EventEmitter {
    constructor() {
        super();
        this.syncGroups = new HashMap();
        this.elementRegistry = new HashMap();
    }

    registerElement(syncKey, element, syncType) {
        if (!this.syncGroups.has(syncKey)) this.syncGroups.set(syncKey, []);
        const entry = { element, syncType, syncKey };
        this.syncGroups.get(syncKey).push(entry);
        this.elementRegistry.set(element.id || this._generateId(), entry);
    }

    _generateId() {
        return 'sync_' + Math.random().toString(36).substring(2, 9);
    }

    syncFromSource(syncKey, value, sourceElement) {
        if (!this.syncGroups.has(syncKey)) return;
        this.syncGroups.get(syncKey).forEach(entry => {
            if (entry.element === sourceElement) return;
            this._applyValueToElement(entry, value);
        });
        this.emit('sync', { syncKey, value, sourceElement });
    }

    _applyValueToElement(entry, value) {
        const el = entry.element;
        if (!el) return;
        if (entry.syncType === 'select') {
            el.value = value;
            el.classList.toggle('has-value', !!value);
        } else if (entry.syncType === 'pill') {
            const pills = el.querySelectorAll('[data-stream-value]');
            pills.forEach(pill => {
                const isActive = pill.dataset.streamValue === value;
                pill.classList.toggle('StreamPill--Active', isActive);
                pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        } else if (entry.syncType === 'input') {
            el.value = value;
        }
    }

    getValue(syncKey) {
        if (!this.syncGroups.has(syncKey)) return '';
        const entries = this.syncGroups.get(syncKey);
        for (const entry of entries) {
            if (entry.syncType === 'select') return entry.element.value;
            if (entry.syncType === 'input') return entry.element.value;
        }
        return '';
    }

    clearAll() {
        this.syncGroups.clear();
        this.elementRegistry.clear();
    }
}

class FilterEngine {
    constructor(data) {
        this.originalData = data;
        this.indexMap = new HashMap();
        this._buildIndices();
    }

    _buildIndices() {
        const indices = { stream: new HashMap(), course: new HashMap(), year: new HashMap(), semester: new HashMap(), subject: new HashMap(), author: new HashMap() };
        this.originalData.forEach(note => {
            ['stream', 'course', 'author', 'subject'].forEach(key => {
                if (!indices[key].has(note[key])) indices[key].set(note[key], []);
                indices[key].get(note[key]).push(note);
            });
            ['year', 'semester'].forEach(key => {
                if (!indices[key].has(note[key])) indices[key].set(note[key], []);
                indices[key].get(note[key]).push(note);
            });
        });
        Object.entries(indices).forEach(([k, v]) => this.indexMap.set(k, v));
    }

    filter(filters) {
        let result = [...this.originalData];
        if (filters.semester) result = result.filter(n => String(n.semester) === String(filters.semester));
        if (filters.stream) result = result.filter(n => String(n.stream) === String(filters.stream));
        if (filters.course) result = result.filter(n => String(n.course) === String(filters.course));
        if (filters.year) result = result.filter(n => String(n.year) === String(filters.year));
        if (filters.subject) result = result.filter(n => String(n.subject) === String(filters.subject));
        if (filters.author) result = result.filter(n => String(n.author) === String(filters.author));

        if (filters.search) {
            const q = String(filters.search).toLowerCase().trim();
            result = result.filter(n =>
                String(n.title).toLowerCase().includes(q) || String(n.subject).toLowerCase().includes(q) ||
                String(n.stream).toLowerCase().includes(q) || String(n.course).toLowerCase().includes(q) ||
                (n.topics && n.topics.some(t => String(t).toLowerCase().includes(q))) || String(n.author).toLowerCase().includes(q)
            );
        }
        if (filters.tab === 'bookmarks' && filters.bookmarkIds) result = result.filter(n => filters.bookmarkIds.has(String(n.id)));
        if (filters.tab === 'contributed') result = result.filter(n => n.contributed === true);
        return result;
    }

    // FIX: Falsy string matching
    getFilteredSubset(excludeKey, filters) {
        let notes = [...this.originalData];
        ['semester', 'stream', 'course', 'year', 'subject', 'author'].forEach(key => {
            if (key === excludeKey || filters[key] === '' || filters[key] === undefined) return;
            notes = notes.filter(n => String(n[key]) === String(filters[key]));
        });
        return notes;
    }

    getAvailableOptions(key, notes) {
        const set = new Set(notes.map(n => n[key]));
        const items = Array.from(set).sort();
        return items.map(val => ({
            value: val,
            label: (key === 'semester' ? `Semester ${val}` : (key === 'year' ? `Year ${val}` : val)),
            count: notes.filter(n => String(n[key]) === String(val)).length
        }));
    }

    getStats() {
        const subjects = new HashSet();
        const topics = new HashSet();
        const authors = new HashSet();
        this.originalData.forEach(n => {
            subjects.add(n.subject);
            if (n.topics) n.topics.forEach(t => topics.add(t));
            authors.add(n.author);
        });
        return {
            totalNotes: this.originalData.length,
            totalSubjects: subjects.size,
            totalTopics: topics.size,
            totalStreams: new Set(this.originalData.map(n => n.stream)).size,
            totalContributors: authors.size
        };
    }

    rebuild(data) {
        this.originalData = data;
        this.indexMap.clear();
        this._buildIndices();
    }
}

class SearchEngine {
    constructor(data) {
        this.trie = new Trie();
        this.data = data;
        this._build();
    }

    _build() {
        this.data.forEach(note => {
            this.trie.insert(note.title, note);
            this.trie.insert(note.subject, note);
            this.trie.insert(note.course, note);
            this.trie.insert(note.stream, note);
            this.trie.insert(note.author, note);
            if (note.topics) note.topics.forEach(t => this.trie.insert(t, note));
        });
    }

    // FIX: Retrieve full suggestion array, sort, then slice
    getSuggestions(query, max = 8) {
        if (!query || !String(query).trim()) return [];
        const results = this.trie.suggest(String(query).trim());
        const q = String(query).toLowerCase().trim();
        return results
            .map(note => ({ note, score: SortStrategy._score(note, q) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, max)
            .map(item => item.note);
    }

    search(query) {
        if (!query || !String(query).trim()) return [...this.data];
        const q = String(query).toLowerCase().trim();
        return this.data
            .filter(n =>
                String(n.title).toLowerCase().includes(q) || String(n.subject).toLowerCase().includes(q) ||
                String(n.stream).toLowerCase().includes(q) || String(n.course).toLowerCase().includes(q) ||
                (n.topics && n.topics.some(t => String(t).toLowerCase().includes(q))) || String(n.author).toLowerCase().includes(q)
            )
            .sort((a, b) => SortStrategy.byRelevance(a, b, q));
    }

    fuzzyMatch(query, maxDist) {
        const q = String(query).toLowerCase();
        const dist = maxDist || 2;
        const terms = new HashSet();
        this.data.forEach(n => {
            terms.add(String(n.title).toLowerCase());
            terms.add(String(n.subject).toLowerCase());
            terms.add(String(n.course).toLowerCase());
            if (n.topics) n.topics.forEach(t => terms.add(String(t).toLowerCase()));
        });
        return terms.toArray()
            .map(t => ({ term: t, distance: SortStrategy.levenshtein(q, t) }))
            .filter(m => m.distance <= dist)
            .sort((a, b) => a.distance - b.distance)
            .map(m => m.term);
    }

    insertSingle(note) {
        this.data.push(note);
        this.trie.insert(note.title, note);
        this.trie.insert(note.subject, note);
        this.trie.insert(note.course, note);
        this.trie.insert(note.author, note);
        if (note.topics) note.topics.forEach(t => this.trie.insert(t, note));
    }

    rebuild(data) {
        this.data = data;
        this.trie = new Trie();
        this._build();
    }
}

class SourcePathResolver {
    static resolve(note) {
        if (note.contributed) return 'indexeddb://file_' + note.id;
        return note.source || ('files/' + SourcePathResolver.generateFileName(note));
    }

    static generateFileName(note) {
        return String(note.title).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.pdf';
    }

    static getDisplaySource(note) {
        if (note.contributed) return 'Browser Storage (IndexedDB)';
        if (note.source && note.source.startsWith('http')) return 'External Link';
        return note.source || ('files/' + SourcePathResolver.generateFileName(note));
    }

    static getSourceAttribute(note) {
        if (note.contributed) return 'source:"indexeddb://file_' + note.id + '"';
        return 'source:"' + (note.source || ('files/' + SourcePathResolver.generateFileName(note))) + '"';
    }
}

class DynamicIconMapper {
    constructor() {
        this.streamConfig = new HashMap();
        this._loadConfig();
    }

    _loadConfig() {
        const configEl = document.getElementById('StreamConfigurationData');
        if (configEl) {
            try {
                const data = JSON.parse(configEl.textContent);
                Object.entries(data).forEach(([key, val]) => this.streamConfig.set(key, val));
            } catch (e) {}
        }
    }

    getColor(stream) {
        const config = this.streamConfig.get(stream);
        return config ? config.color : 'var(--primary)';
    }

    getIcon(stream) {
        const config = this.streamConfig.get(stream);
        return config ? config.icon : '📄';
    }

    getLabel(stream) {
        const config = this.streamConfig.get(stream);
        return config ? config.label : stream;
    }

    getCSSVariable(stream) {
        const varMap = {
            'Engineering': 'var(--stream-engineering)',
            'Science': 'var(--stream-science)',
            'Commerce': 'var(--stream-commerce)',
            'Arts': 'var(--stream-arts)',
            'Medical': 'var(--stream-medical)'
        };
        return varMap[stream] || 'var(--primary)';
    }

    getAllStreams() {
        return this.streamConfig.keys();
    }
}

class CardFactory {
    static iconMapper = new DynamicIconMapper();

    static create(note, opts) {
        const isBookmarked = opts.bookmarks && opts.bookmarks.has(String(note.id));
        const semClass = note.semester % 2 === 0 ? 'even' : 'odd';
        const color = CardFactory.iconMapper.getCSSVariable(note.stream);
        const sourcePath = SourcePathResolver.resolve(note);
        let titleHTML = CardFactory.escapeHTML(note.title);
        if (opts.searchQuery) titleHTML = CardFactory.highlight(titleHTML, opts.searchQuery);

        const card = document.createElement('article');
        card.className = 'NoteCard' + (isBookmarked ? ' bookmarked' : '');
        card.dataset.noteId = note.id;
        card.dataset.source = sourcePath;
        card.tabIndex = 0;
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', note.title);

        const tArr = note.topics || [];
        const topicChipsHTML = tArr.slice(0, 6).map(t =>
            `<span class="TopicChip"><span class="TopicChip__Dot"></span><span class="TopicChip__Name">${CardFactory.escapeHTML(t)}</span></span>`
        ).join('') + (tArr.length > 6 ? `<span class="TopicChip TopicChip--More">+${tArr.length - 6}</span>` : '');

        const sourceLabel = note.contributed ? 'Contributed' : 'Server';

        card.innerHTML = `
<div class="NoteCard__AccentBar" style="background:${color}" aria-hidden="true"></div>
<div class="NoteCard__Body">
<div class="NoteCard__TopRow">
<div class="NoteCard__Badges">
<span class="Badge Badge--Stream" data-stream-name="${note.stream}">${note.stream}</span>
<span class="Badge Badge--Course">${note.course}</span>
<span class="Badge Badge--Semester ${semClass}">Sem ${note.semester}</span>
</div>
<button class="NoteCard__BookmarkBtn" data-note-id="${note.id}" aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}" title="Bookmark">
<svg class="BookmarkIcon BookmarkIcon--Empty" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${isBookmarked ? ' style="display:none"' : ''}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path></svg>
<svg class="BookmarkIcon BookmarkIcon--Filled" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"${isBookmarked ? '' : ' style="display:none"'}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path></svg>
</button>
</div>
<div class="NoteCard__SubjectArea">
<h3 class="NoteCard__Title">${titleHTML}</h3>
<p class="NoteCard__SubjectName">📘 ${CardFactory.escapeHTML(note.subject)}</p>
<div class="NoteCard__TopicChips" aria-label="Topics covered">${topicChipsHTML}</div>
<p class="NoteCard__AuthorLine">✍️ ${CardFactory.escapeHTML(note.author)} • <span class="NoteCard__Source NoteCard__Source--${sourceLabel}">${sourceLabel}</span></p>
</div>
</div>
<div class="NoteCard__Footer">
<span class="NoteCard__FileInfo">
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
<span class="NoteCard__FileInfoText">${note.fileType} • ${note.fileSize} • ${note.pages || 0}p • ${tArr.length} topics</span>
</span>
<button class="DownloadNoteButton" data-note-id="${note.id}" aria-label="Download ${note.title}">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download
</button>
</div>`;
        return card;
    }

    static escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static highlight(text, query) {
        if (!query) return text;
        const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<span class="highlight">$1</span>');
    }
}

class ToastManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.queue = new Queue(5);
        this.duration = 2500;
    }

    show(message, type, dur) {
        if (!this.container) return;
        const toast = document.createElement('div');
        toast.className = 'ToastNotification' + (type ? ` ToastNotification--${type}` : '');
        toast.setAttribute('role', 'alert');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const icon = icons[type] || '';
        toast.innerHTML = `${icon ? `<span class="ToastNotification__Icon">${icon}</span>` : ''}<span class="ToastNotification__Message">${CardFactory.escapeHTML(message)}</span>`;
        this.container.appendChild(toast);
        const d = dur || this.duration;
        this.queue.enqueue({ element: toast, ts: Date.now() });
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
            this.queue.remove(i => i.element === toast);
        }, d + 400);
    }

    success(msg) { this.show(msg, 'success'); }
    error(msg) { this.show(msg, 'error'); }
    warning(msg) { this.show(msg, 'warning'); }
    info(msg) { this.show(msg, 'info'); }
}

class ModalManager {
    constructor() {
        this.stack = [];
        this.prevFocus = [];
    }

    open(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;
        this.prevFocus.push(document.activeElement);
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        this.stack.push(overlayId);
        const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length) focusable[0].focus();
        this._trapFocus(overlay);
    }

    close(overlayId) {
        const id = overlayId || this.stack[this.stack.length - 1];
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        const idx = this.stack.indexOf(id);
        if (idx > -1) this.stack.splice(idx, 1);
        if (this.stack.length === 0) document.body.style.overflow = '';
        const prev = this.prevFocus.pop();
        if (prev && prev.focus) prev.focus();
        if (overlay._focusTrap) {
            overlay.removeEventListener('keydown', overlay._focusTrap);
            overlay._focusTrap = null;
        }
    }

    closeAll() { [...this.stack].reverse().forEach(id => this.close(id)); }
    isOpen(id) { return this.stack.includes(id); }
    get hasOpen() { return this.stack.length > 0; }

    _trapFocus(overlay) {
        const handler = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { last.focus(); e.preventDefault(); }
            } else {
                if (document.activeElement === last) { first.focus(); e.preventDefault(); }
            }
        };
        overlay._focusTrap = handler;
        overlay.addEventListener('keydown', handler);
    }
}

class ThemeManager {
    constructor(storage) {
        this.storage = storage;
        this.current = this.storage.get('theme', 'light');
        this.mq = window.matchMedia('(prefers-color-scheme: dark)');
    }

    apply(theme) {
        const effective = theme === 'auto' ? (this.mq.matches ? 'dark' : 'light') : theme;
        document.documentElement.setAttribute('data-theme', effective);
        this.current = theme;
        this.storage.set('theme', theme);
        const meta = document.getElementById('MetaThemeColor');
        if (meta) meta.content = effective === 'dark' ? '#0F1117' : '#6C63FF';
        const darkIcon = document.querySelector('.ThemeToggler__DarkIcon');
        const lightIcon = document.querySelector('.ThemeToggler__LightIcon');
        if (darkIcon && lightIcon) {
            darkIcon.style.display = effective === 'dark' ? 'none' : 'flex';
            lightIcon.style.display = effective === 'dark' ? 'flex' : 'none';
        }
        const toggle = document.getElementById('ThemeToggler');
        if (toggle) toggle.setAttribute('aria-checked', effective === 'dark' ? 'true' : 'false');
    }

    toggle() {
        const eff = this.getEffective();
        const next = eff === 'dark' ? 'light' : 'dark';
        this.apply(next);
        return next;
    }

    getEffective() {
        return this.current === 'auto' ? (this.mq.matches ? 'dark' : 'light') : this.current;
    }

    watchSystem(cb) {
        this.mq.addEventListener('change', (e) => {
            if (this.current === 'auto') { this.apply('auto'); if (cb) cb(e.matches ? 'dark' : 'light'); }
        });
    }
}

class ParticleSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.particles = [];
    }

    generate(count) {
        if (!this.container) return;
        this.container.innerHTML = '';
        const types = ['', 'square', 'ring'];
        const isMobile = window.innerWidth < 768;
        const n = isMobile ? Math.min(count, 8) : count;
        for (let i = 0; i < n; i++) {
            const p = document.createElement('div');
            const type = types[Math.floor(Math.random() * types.length)];
            p.className = 'particle' + (type ? ` ${type}` : '');
            const size = Math.random() * 20 + 5;
            p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;animation-duration:${Math.random() * 8 + 6}s;animation-delay:${Math.random() * 5}s;`;
            this.container.appendChild(p);
        }
    }
}

class AnimationController {
    static animateCounter(el, target, dur) {
        if (!el) return;
        const start = performance.now();
        el.classList.add('counting');
        el.setAttribute('data-target', target);
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / (dur || 1500), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
            else el.classList.remove('counting');
        };
        requestAnimationFrame(step);
    }

    static revealCards(grid, delay) {
        if (!grid) return;
        grid.querySelectorAll('.NoteCard').forEach((card, i) => {
            setTimeout(() => card.classList.add('revealed'), i * (delay || 50));
        });
    }

    static createRipple(e, el) {
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    static bookmarkPop(btn) {
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
    }
}

class FileDownloader {
    constructor(indexedDBManager, filesDirectory) {
        this.idb = indexedDBManager;
        this.filesDir = filesDirectory || 'files/';
    }

    async download(note) {
        if (note.contributed) {
            return this._downloadFromIndexedDB(note);
        }
        return this._downloadFromServer(note);
    }

    _downloadFromServer(note) {
        const filePath = note.source || (this.filesDir + SourcePathResolver.generateFileName(note));

        const link = document.createElement('a');
        link.href = filePath;

        if (filePath.startsWith('http')) {
            link.target = '_blank';
        } else {
            link.download = filePath.split('/').pop() || 'download.pdf';
            link.target = '_blank';
        }

        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return Promise.resolve(true);
    }

    async _downloadFromIndexedDB(note) {
        try {
            const fileRecord = await this.idb.getFile(note.id);
            if (!fileRecord || !fileRecord.data) {
                return false;
            }
            const blob = new Blob([fileRecord.data], { type: fileRecord.fileType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileRecord.fileName || SourcePathResolver.generateFileName(note);
            document.body.appendChild(link);

            // FIX: Browser Race Condition on Blob Download
            setTimeout(() => {
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }, 300);
            }, 50);

            return true;
        } catch (e) {
            return false;
        }
    }
}

const NOTES_DATA = [
  {
    id: 1,
    title: "Big Data & Cloud Computing",
    stream: "Engineering",
    course: "B.Tech CSE",
    year: 3,
    semester: 5,
    subject: "Big Data & Cloud Computing",
    topics: [
      "Introduction to Big Data",
      "Hadoop Ecosystem",
      "MapReduce",
      "Cloud Computing Basics",
      "Cloud Service Models (IaaS, PaaS, SaaS)",
      "Cloud Deployment Models",
      "Big Data Tools and Technologies",
      "Applications of Big Data and Cloud"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/big_data_and_cloud_computing.pdf"
  },
  {
    id: 2,
    title: "Internet of Things",
    stream: "Engineering",
    course: "B.Tech CSE",
    year: 3,
    semester: 5,
    subject: "Internet of Things",
    topics: [
      "Introduction to IoT",
      "IoT Architecture",
      "Sensors and Actuators",
      "Communication Protocols",
      "IoT Platforms",
      "Security in IoT",
      "Applications of IoT"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/internet_of_things.pdf"
  },
  {
    id: 3,
    title: "Python Programming",
    stream: "Engineering",
    course: "B.Tech CSE",
    year: 3,
    semester: 5,
    subject: "Python Programming",
    topics: [
      "Python Basics",
      "Control Structures",
      "Functions",
      "Lists Tuples Dictionaries",
      "File Handling",
      "Object Oriented Programming in Python",
      "Libraries and Modules"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/python_programming.pdf"
  },
  {
    id: 4,
    title: "Android Programming",
    stream: "Engineering",
    course: "B.Tech CSE",
    year: 3,
    semester: 5,
    subject: "Android Programming",
    topics: [
      "Introduction to Android",
      "Android Studio",
      "Activities and Intents",
      "Layouts and UI Components",
      "SQLite Database",
      "API Integration",
      "Publishing Apps"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/android_programming.pdf"
  },
  {
    id: 5,
    title: "Computer Organization & Microprocessors",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 4,
    subject: "Computer Organization & Microprocessors",
    topics: [
      "Basic Computer Organization",
      "8085 Microprocessor Architecture",
      "Instruction Set",
      "Assembly Language Programming",
      "Memory Interfacing",
      "Input Output Interfacing"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/computer_organization_and_microprocessors.pdf"
  },
  {
    id: 6,
    title: "Engineering Drawing",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 1,
    semester: 1,
    subject: "Engineering Drawing",
    topics: [
      "Drawing Instruments",
      "Geometric Constructions",
      "Lines and Angles",
      "Orthographic Projection",
      "Isometric Projection",
      "Sectional Views",
      "Dimensioning"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/engineering_drawing.pdf"
  },
  {
    id: 7,
    title: "Engineering Chemistry",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 1,
    semester: 1,
    subject: "Engineering Chemistry",
    topics: [
      "Atomic Structure",
      "Chemical Bonding",
      "Water Treatment",
      "Electrochemistry",
      "Corrosion and Prevention",
      "Polymers",
      "Fuels and Combustion"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/engineering_chemistry.pdf"
  },
  {
    id: 8,
    title: "Object Oriented Programming Through Java",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 4,
    subject: "Object Oriented Programming Through Java",
    topics: [
      "Java Basics",
      "Classes and Objects",
      "Inheritance",
      "Polymorphism",
      "Exception Handling",
      "Multithreading",
      "Collections Framework"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/oops_java.pdf"
  },
  {
    id: 9,
    title: "Operating System",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 3,
    subject: "Operating System",
    topics: [
      "Introduction to Operating Systems",
      "Process Management",
      "CPU Scheduling Algorithms",
      "Deadlocks",
      "Memory Management",
      "File Systems"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/operating_systems.pdf"
  },
  {
    id: 10,
    title: "Software Engineering",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 4,
    subject: "Software Engineering",
    topics: [
      "Software Development Life Cycle",
      "Requirement Analysis",
      "System Design",
      "Agile Model",
      "Software Testing",
      "Software Maintenance"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/software_engineering.pdf"
  },
  {
    id: 11,
    title: "Web Technologies",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 4,
    subject: "Web Technologies",
    topics: [
      "HTML Fundamentals",
      "CSS Styling",
      "JavaScript Basics",
      "DOM Manipulation",
      "Responsive Web Design",
      "Basic Web Hosting"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/web_technologies.pdf"
  },
  {
    id: 12,
    title: "Basics Of Computer Engineering",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 1,
    semester: 1,
    subject: "Basics Of Computer Engineering",
    topics: [
      "Introduction to Computers",
      "Computer Hardware Components",
      "Computer Software",
      "Number Systems",
      "Data Representation",
      "Input Output Devices",
      "Basic Networking"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/basics_of_computer_engineering.pdf"
  },
  {
    id: 13,
    title: "Programming In C",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 1,
    semester: 1,
    subject: "Programming In C",
    topics: [
      "Introduction to C Programming",
      "Variables and Data Types",
      "Operators",
      "Control Statements",
      "Functions",
      "Arrays and Strings",
      "Pointers",
      "Structures and Unions"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/c_programming.pdf"
  },
  {
    id: 14,
    title: "Computer Networks And Cyber Security",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 4,
    subject: "Computer Networks And Cyber Security",
    topics: [
      "Introduction to Computer Networks",
      "Network Topologies",
      "OSI Model",
      "TCP/IP Protocol Suite",
      "Network Devices",
      "Cyber Security Basics",
      "Common Cyber Attacks and Prevention"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/computer_networks_and_cyber_security.pdf"
  },
  {
    id: 15,
    title: "Data Structures Through C",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 3,
    subject: "Data Structures Through C",
    topics: [
      "Introduction to Data Structures",
      "Arrays",
      "Linked Lists",
      "Stacks",
      "Queues",
      "Trees",
      "Graphs",
      "Sorting and Searching Algorithms"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/data_structures_through_c.pdf"
  },
  {
    id: 16,
    title: "Database Management Systems",
    stream: "Engineering",
    course: "Diploma CSE",
    year: 2,
    semester: 3,
    subject: "Database Management Systems",
    topics: [
      "Introduction to DBMS",
      "Data Models",
      "Entity Relationship Model",
      "Relational Database Model",
      "SQL Basics",
      "Normalization",
      "Transactions and Concurrency Control"
    ],
    fileType: "PDF",
    fileSize: "3.4 MB",
    pages: 190,
    author: "By Project K & Team",
    contributed: false,
    source: "files/database_management_systems.pdf"
  }
];

class NoteVaultApp {
    constructor() {
        this.storage = new StorageManager('nv_');
        this.indexedDB = new IndexedDBManager('NoteVaultDB', 1);
        this.emitter = new EventEmitter();
        this.syncManager = new DynamicSyncManager();
        this.iconMapper = new DynamicIconMapper();
        this.stateManager = new StateManager({
            search: '', stream: '', course: '', year: '',
            semester: '', subject: '', author: '',
            sort: '', sortDirection: 'asc',
            tab: 'all', view: this.storage.get('view', 'grid'),
            page: 1, filterOpen: false,
            filteredNotes: [], totalFiltered: 0
        });

        this.bookmarks = new HashSet(this.storage.get('bookmarks', []));
        this.recentSearches = new Queue(5);
        (this.storage.get('recentSearches', [])).forEach(s => this.recentSearches.enqueue(s));
        this.recentViews = new Queue(20);
        (this.storage.get('recentViews', [])).forEach(v => this.recentViews.enqueue(v));

        this.baseNotes = [...NOTES_DATA];
        this.contributedNotes = this.storage.get('contributedNotes', []);
        this.allNotes = [...this.baseNotes, ...this.contributedNotes];

        this.filterEngine = new FilterEngine(this.allNotes);
        this.searchEngine = new SearchEngine(this.allNotes);
        this.toastManager = new ToastManager('ToastNotificationArea');
        this.modalManager = new ModalManager();
        this.themeManager = new ThemeManager(this.storage);
        this.particleSystem = new ParticleSystem('ParticleLayer');
        this.fileDownloader = new FileDownloader(this.indexedDB, 'files/');

        this.dom = {};
        this.ITEMS_PER_PAGE = Number(this.storage.get('itemsPerPage', 12));
        this.searchDebounceTimer = null;
        this.scrollTicking = false;
        this.suggestionIndex = -1;
        this._confirmCallback = null;
        this._pendingFile = null;
    }

    init() {
        this._cacheDom();
        this._updateLoading(20, 'Loading theme...');
        this.themeManager.apply(this.themeManager.current);
        this.themeManager.watchSystem();

        this._updateLoading(40, 'Building search index...');
        this.particleSystem.generate(15);

        this._updateLoading(50, 'Setting up sync...');
        this._initDynamicSync();

        this._updateLoading(60, 'Populating filters...');
        this._populateAllFilters();
        this._updateStreamPillCounts();

        this._updateLoading(80, 'Rendering notes...');
        this._applyView(this.stateManager.state.view);
        this._applyFilters();
        this._animateCounters();

        this._updateLoading(100, 'Ready!');
        this._bindAllEvents();

        setTimeout(() => this._hideLoading(), 400);
    }

    _initDynamicSync() {
        const streamFilter = this.dom.StreamFilter;
        const streamPillsRow = document.getElementById('StreamPillsRow');
        const searchInput = this.dom.SearchInput;

        if (streamFilter) this.syncManager.registerElement('stream', streamFilter, 'select');
        if (streamPillsRow) this.syncManager.registerElement('stream', streamPillsRow, 'pill');
        if (searchInput) this.syncManager.registerElement('search', searchInput, 'input');

        ['SemesterFilter', 'CourseFilter', 'SubjectFilter', 'YearFilter', 'AuthorFilter'].forEach(id => {
            const el = this.dom[id];
            if (el) this.syncManager.registerElement(el.dataset.filterKey || el.name, el, 'select');
        });

        this.syncManager.on('sync', (data) => {
            this.emitter.emit('globalSync', data);
        });
    }

    _cacheDom() {
        const ids = [
            'AppLoadingScreen','LoadingStatusText','LoadingProgressFill','AppWrapper',
            'ScrollProgressBar','AnnouncementBanner','DismissAnnouncementBtn',
            'ThemeToggler','ParticleLayer','KeyboardShortcutsOpener','AppSettingsOpener',
            'ContributeNoteBtn','ContributeFloatingBtn',
            'TotalNotesCount','TotalSubjectsCount','TotalTopicsCount','TotalStreamsCount','TotalContributorsCount',
            'SearchInput','ClearSearchBtn','SearchShortcutHint','SearchSuggestionsPanel',
            'RecentSearchesPanel','RecentSearchesList','ClearAllRecentSearches',
            'FilterToggleButton','ActiveFilterCountBadge','FilterDropdownPanel','CloseFilterPanelBtn',
            'FilterSummaryText','SemesterFilter','StreamFilter','CourseFilter','SubjectFilter',
            'YearFilter','AuthorFilter','ResetAllFiltersBtn',
            'FilteredResultsCount','ActiveFilterChips','NotesGrid','EmptyState',
            'EmptyStateClearFilters','EmptyStateContribute',
            'LoadMoreSection','LoadMoreButton','PaginationInfoText',
            'NoteDetailModalOverlay','NoteDetailBadges','NoteDetailModalTitle','CloseNoteDetailModal',
            'NoteDetailSubjectBadge','NoteDetailTopicsGrid',
            'NoteDetailFileType','NoteDetailFileSize','NoteDetailPageCount',
            'NoteDetailAuthor','NoteDetailStream','NoteDetailYearSemester','NoteDetailSource',
            'NoteDetailDownloadBtn','NoteDetailBookmarkBtn','NoteDetailShareBtn',
            'NoteDetailRelated','NoteDetailRelatedList',
            'ContributionModalOverlay','CloseContributionModal','ContributionForm',
            'ContributeNoteTitle','ContributeNoteTitleError',
            'ContributeStream','ContributeStreamError',
            'ContributeCourse','ContributeCourseError',
            'ContributeYear','ContributeYearError',
            'ContributeSemester','ContributeSemesterError',
            'ContributePages','ContributeSubject','ContributeSubjectError',
            'ContributeTopics','ContributeTopicsError','ContributeTopicsCounter','ContributeTopicsPreview',
            'ContributeAuthor','ContributeAuthorError','ContributeFileSize',
            'ContributeFile','ContributeFileError',
            'FileUploadArea','FileUploadContent','FileUploadPreview',
            'UploadedFileName','UploadedFileSize','RemoveUploadedFile',
            'CancelContributionBtn','SubmitContributionBtn',
            'KeyboardShortcutsModalOverlay','CloseShortcutsModal',
            'SettingsModalOverlay','CloseSettingsModal',
            'SettingThemeSelect','SettingDefaultView','SettingCompactToggle',
            'SettingAnimationsToggle','SettingAutoCompleteToggle','SettingNotesPerPage',
            'SettingClearBookmarks','SettingClearIndexedDB','SettingExportData','SettingImportFile','SettingResetDefaults',
            'StorageUsedValue',
            'ConfirmDialogOverlay','CloseConfirmDialog','ConfirmDialogMessage',
            'ConfirmDialogCancelBtn','ConfirmDialogOkBtn',
            'AboutModalOverlay','CloseAboutModal',
            'PrivacyModalOverlay','ClosePrivacyModal',
            'BackToTopButton','ToastNotificationArea',
            'AllNotesTabCount','BookmarksTabCount','ContributedTabCount','RecentTabCount',
            'ExportResultsButton','ShareResultsButton',
            'FooterCurrentYear','FooterLinkAbout','FooterLinkPrivacy','FooterLinkContribute','FooterLinkShortcuts',
            'SkeletonLoaderGrid'
        ];
        ids.forEach(id => { this.dom[id] = document.getElementById(id); });
    }

    _updateLoading(pct, text) {
        if (this.dom.LoadingProgressFill) this.dom.LoadingProgressFill.style.width = pct + '%';
        if (this.dom.LoadingStatusText) this.dom.LoadingStatusText.textContent = text;
    }

    _hideLoading() {
        if (this.dom.AppLoadingScreen) this.dom.AppLoadingScreen.classList.add('hidden');
        if (this.dom.AppWrapper) this.dom.AppWrapper.classList.add('loaded');
    }

    _animateCounters() {
        const stats = this.filterEngine.getStats();
        AnimationController.animateCounter(this.dom.TotalNotesCount, stats.totalNotes, 1500);
        AnimationController.animateCounter(this.dom.TotalSubjectsCount, stats.totalSubjects, 1500);
        AnimationController.animateCounter(this.dom.TotalTopicsCount, stats.totalTopics, 1500);
        AnimationController.animateCounter(this.dom.TotalStreamsCount, stats.totalStreams, 1500);
        AnimationController.animateCounter(this.dom.TotalContributorsCount, stats.totalContributors, 1500);
    }

    _updateStreamPillCounts() {
        this.iconMapper.getAllStreams().forEach(s => {
            const el = document.getElementById('PillCount' + s);
            if (el) el.textContent = this.allNotes.filter(n => n.stream === s).length;
        });
    }

    _populateAllFilters() {
        ['semester','stream','course','subject','year','author'].forEach(k => this._updateFilterDropdown(k));
    }

    _updateFilterDropdown(key) {
        const state = this.stateManager.state;
        const available = this.filterEngine.getFilteredSubset(key, state);
        const options = this.filterEngine.getAvailableOptions(key, available);
        const selectMap = {
            semester: this.dom.SemesterFilter, stream: this.dom.StreamFilter,
            course: this.dom.CourseFilter, subject: this.dom.SubjectFilter,
            year: this.dom.YearFilter, author: this.dom.AuthorFilter
        };
        const labelMap = {
            semester:'All Semesters', stream:'All Streams', course:'All Courses',
            subject:'All Subjects', year:'All Years', author:'All Authors'
        };
        const select = selectMap[key];
        if (!select) return;
        const currentVal = state[key];
        select.innerHTML = '';
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = labelMap[key];
        select.appendChild(allOpt);
        let valid = false;
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = `${opt.label} (${opt.count})`;
            if (String(opt.value) === String(currentVal)) { o.selected = true; valid = true; }
            select.appendChild(o);
        });
        if (currentVal && !valid) {
            select.value = '';
            const up = {};
            up[key] = '';
            this.stateManager.setState(up);
        }
        select.classList.toggle('has-value', !!select.value);
    }

    _onFilterChange(changedKey) {
        const selectMap = {
            semester: this.dom.SemesterFilter, stream: this.dom.StreamFilter,
            course: this.dom.CourseFilter, subject: this.dom.SubjectFilter,
            year: this.dom.YearFilter, author: this.dom.AuthorFilter
        };
        const updates = {};
        updates[changedKey] = selectMap[changedKey].value;
        this.stateManager.setState(updates);

        this.syncManager.syncFromSource(changedKey, updates[changedKey], selectMap[changedKey]);

        ['semester','stream','course','subject','year','author'].forEach(k => this._updateFilterDropdown(k));
        this._applyFilters();
    }

    _applyFilters() {
        const state = this.stateManager.state;
        let notes = this.filterEngine.filter({
            search: state.search, semester: state.semester, stream: state.stream,
            course: state.course, year: state.year, subject: state.subject,
            author: state.author, tab: state.tab, bookmarkIds: this.bookmarks
        });
        if (state.tab === 'recent') {
            const ids = this.recentViews.toArray();
            notes = notes.filter(n => ids.includes(n.id));
        }
        if (state.sort) {
            const dir = state.sortDirection || 'asc';
            const cmps = {
                semester: (a, b) => SortStrategy.bySemester(a, b, dir),
                course: (a, b) => SortStrategy.byCourse(a, b, dir),
                year: (a, b) => SortStrategy.byYear(a, b, dir),
                title: (a, b) => SortStrategy.byTitle(a, b, dir),
                topics: (a, b) => SortStrategy.byTopics(a, b, dir)
            };
            if (cmps[state.sort]) notes = SortStrategy.mergeSort(notes, cmps[state.sort]);
        } else if (state.search) {
            notes.sort((a, b) => SortStrategy.byRelevance(a, b, state.search));
        }
        this.stateManager.setState({ filteredNotes: notes, totalFiltered: notes.length, page: 1 });

        // Always pass 'true' here to clear existing when a brand new filter is applied
        this._renderNotes(true);
        this._updateUI();
    }

    // FIX: Using a fragment to append new notes on "Load More" to avoid destructive innerHTML
    _renderNotes(clearExisting = false) {
        const state = this.stateManager.state;
        const grid = this.dom.NotesGrid;
        const notes = state.filteredNotes;

        if (clearExisting && grid) {
            grid.innerHTML = '';
        }

        const startIndex = clearExisting ? 0 : (state.page - 1) * this.ITEMS_PER_PAGE;
        const endIndex = state.page * this.ITEMS_PER_PAGE;
        const visibleSlice = notes.slice(startIndex, endIndex);

        if (notes.length === 0) {
            if (this.dom.EmptyState) this.dom.EmptyState.classList.add('visible');
            if (this.dom.LoadMoreSection) this.dom.LoadMoreSection.style.display = 'none';
            return;
        }

        if (this.dom.EmptyState) this.dom.EmptyState.classList.remove('visible');

        const frag = document.createDocumentFragment();
        visibleSlice.forEach(note => {
            frag.appendChild(CardFactory.create(note, {
                bookmarks: this.bookmarks,
                searchQuery: state.search
            }));
        });

        if (grid) {
            grid.appendChild(frag);
            requestAnimationFrame(() => AnimationController.revealCards(grid, 50));
        }

        if (this.dom.LoadMoreSection) {
            if (endIndex < notes.length) {
                this.dom.LoadMoreSection.style.display = 'block';
                const rem = notes.length - endIndex;
                const txt = this.dom.LoadMoreButton.querySelector('.LoadMoreButton__Text');
                if (txt) txt.textContent = `Load More (${rem} remaining)`;
                if (this.dom.PaginationInfoText) this.dom.PaginationInfoText.textContent = `Showing ${endIndex} of ${notes.length} notes`;
            } else {
                this.dom.LoadMoreSection.style.display = 'none';
            }
        }
    }

    _updateUI() {
        const state = this.stateManager.state;
        if (this.dom.FilteredResultsCount) {
            this.dom.FilteredResultsCount.innerHTML = `Showing <strong>${state.totalFiltered}</strong> note${state.totalFiltered !== 1 ? 's' : ''}`;
        }
        this._updateTabCounts();
        this._renderFilterChips();
        this._updateFilterBadge();
        this._updateFilterSummary();
    }

    _updateTabCounts() {
        const state = this.stateManager.state;
        if (this.dom.AllNotesTabCount) this.dom.AllNotesTabCount.textContent = state.tab === 'all' ? state.totalFiltered : this.allNotes.length;
        if (this.dom.BookmarksTabCount) this.dom.BookmarksTabCount.textContent = this.bookmarks.size;
        if (this.dom.ContributedTabCount) this.dom.ContributedTabCount.textContent = this.contributedNotes.length;
        if (this.dom.RecentTabCount) this.dom.RecentTabCount.textContent = this.recentViews.size;
    }

    _renderFilterChips() {
        const state = this.stateManager.state;
        const tags = [];
        if (state.semester) tags.push({ label: 'Sem ' + state.semester, key: 'semester' });
        if (state.stream) tags.push({ label: state.stream, key: 'stream' });
        if (state.course) tags.push({ label: state.course, key: 'course' });
        if (state.subject) tags.push({ label: state.subject, key: 'subject' });
        if (state.year) tags.push({ label: 'Year ' + state.year, key: 'year' });
        if (state.author) tags.push({ label: state.author, key: 'author' });
        if (state.search) tags.push({ label: `"${state.search}"`, key: 'search' });
        if (this.dom.ActiveFilterChips) {
            this.dom.ActiveFilterChips.innerHTML = tags.map(t =>
                `<span class="FilterChip" data-filter-key="${t.key}" role="listitem" tabindex="0" aria-label="Remove ${t.label}"><span class="FilterChip__Label">${CardFactory.escapeHTML(t.label)}</span><span class="FilterChip__RemoveBtn" role="button" aria-label="Remove"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span></span>`
            ).join('');
        }
    }

    _updateFilterBadge() {
        const state = this.stateManager.state;
        const count = [state.semester, state.stream, state.course, state.year, state.subject, state.author].filter(Boolean).length;
        if (this.dom.ActiveFilterCountBadge) {
            this.dom.ActiveFilterCountBadge.textContent = count;
            this.dom.ActiveFilterCountBadge.classList.toggle('visible', count > 0);
        }
    }

    _updateFilterSummary() {
        const state = this.stateManager.state;
        const count = [state.semester, state.stream, state.course, state.year, state.subject, state.author].filter(Boolean).length;
        if (this.dom.FilterSummaryText) this.dom.FilterSummaryText.textContent = count > 0 ? `${count} active` : '';
    }

    _showSuggestions(query) {
        if (!query.trim()) { this._hideSuggestions(); return; }
        const suggestions = this.searchEngine.getSuggestions(query, 8);
        if (!suggestions.length) { this._hideSuggestions(); return; }
        let html = '<div style="padding:.5rem .8rem;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-faint);background:var(--bg);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1;">Suggestions</div>';
        suggestions.forEach((note, i) => {
            const color = this.iconMapper.getCSSVariable(note.stream);
            const icon = this.iconMapper.getIcon(note.stream);
            const topicLen = note.topics ? note.topics.length : 0;
            html += `<div class="SuggestionItem" data-note-id="${note.id}" data-index="${i}" role="option" aria-selected="false"><div class="SuggestionItem__Icon" style="background:${color}20;color:${color}">${icon}</div><div class="SuggestionItem__TextArea"><div class="SuggestionItem__Title">${CardFactory.escapeHTML(note.title)}</div><div class="SuggestionItem__Meta">${note.subject} • ${note.course} • ${note.author}</div></div><div class="SuggestionItem__TopicCount">${topicLen} topics</div></div>`;
        });
        if (this.dom.SearchSuggestionsPanel) {
            this.dom.SearchSuggestionsPanel.innerHTML = html;
            this.dom.SearchSuggestionsPanel.classList.add('active');
        }
        if (this.dom.SearchInput) this.dom.SearchInput.setAttribute('aria-expanded', 'true');
        this.suggestionIndex = -1;
    }

    _hideSuggestions() {
        if (this.dom.SearchSuggestionsPanel) this.dom.SearchSuggestionsPanel.classList.remove('active');
        if (this.dom.SearchInput) this.dom.SearchInput.setAttribute('aria-expanded', 'false');
        this.suggestionIndex = -1;
    }

    _navigateSuggestions(dir) {
        if (!this.dom.SearchSuggestionsPanel) return;
        const items = this.dom.SearchSuggestionsPanel.querySelectorAll('.SuggestionItem');
        if (!items.length) return;
        items.forEach(i => { i.classList.remove('active'); i.setAttribute('aria-selected', 'false'); });
        if (dir === 'down') this.suggestionIndex = (this.suggestionIndex + 1) % items.length;
        else this.suggestionIndex = this.suggestionIndex <= 0 ? items.length - 1 : this.suggestionIndex - 1;
        items[this.suggestionIndex].classList.add('active');
        items[this.suggestionIndex].setAttribute('aria-selected', 'true');
        items[this.suggestionIndex].scrollIntoView({ block: 'nearest' });
    }

    _selectSuggestion(noteId) {
        const note = this.allNotes.find(n => String(n.id) === String(noteId));
        if (note) {
            if (this.dom.SearchInput) this.dom.SearchInput.value = note.title;
            this.stateManager.setState({ search: note.title });
            if (this.dom.ClearSearchBtn) this.dom.ClearSearchBtn.classList.add('visible');
            this._hideSuggestions();
            this._addRecentSearch(note.title);
            this.syncManager.syncFromSource('search', note.title, this.dom.SearchInput);
            this._applyFilters();
        }
    }

    _addRecentSearch(q) {
        if (!q.trim()) return;
        this.recentSearches.remove(i => i === q);
        this.recentSearches.enqueue(q);
        this.storage.set('recentSearches', this.recentSearches.toArray());
    }

    _showRecentSearches() {
        if (!this.dom.RecentSearchesPanel || this.recentSearches.isEmpty()) return;
        const list = this.dom.RecentSearchesList;
        if (!list) return;
        list.innerHTML = this.recentSearches.toArray().reverse().map(q =>
            `<div class="RecentSearchItem" data-search-query="${CardFactory.escapeHTML(q)}" role="option" tabindex="-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="RecentSearchItem__Icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span class="RecentSearchItem__Text">${CardFactory.escapeHTML(q)}</span><button class="RecentSearchItem__RemoveBtn" aria-label="Remove" tabindex="-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>`
        ).join('');
        this.dom.RecentSearchesPanel.style.display = '';
    }

    _hideRecentSearches() {
        if (this.dom.RecentSearchesPanel) this.dom.RecentSearchesPanel.style.display = 'none';
    }

    _openNoteModal(noteId) {
        const note = this.allNotes.find(n => String(n.id) === String(noteId));
        if (!note) return;
        this._addRecentView(note.id);
        const isBookmarked = this.bookmarks.has(note.id);
        const semClass = note.semester % 2 === 0 ? 'even' : 'odd';
        if (this.dom.NoteDetailBadges) {
            this.dom.NoteDetailBadges.innerHTML = `<span class="Badge Badge--Stream" data-stream-name="${note.stream}">${note.stream}</span><span class="Badge Badge--Course">${note.course}</span><span class="Badge Badge--Semester ${semClass}">Sem ${note.semester}</span>`;
        }
        if (this.dom.NoteDetailModalTitle) this.dom.NoteDetailModalTitle.textContent = note.title;
        if (this.dom.NoteDetailSubjectBadge) this.dom.NoteDetailSubjectBadge.innerHTML = `📘 ${CardFactory.escapeHTML(note.subject)}`;
        if (this.dom.NoteDetailTopicsGrid) {
            const tArr = note.topics || [];
            this.dom.NoteDetailTopicsGrid.innerHTML = tArr.map(t =>
                `<span class="TopicChip"><span class="TopicChip__Dot"></span><span class="TopicChip__Name">${CardFactory.escapeHTML(t)}</span></span>`
            ).join('');
        }
        if (this.dom.NoteDetailFileType) this.dom.NoteDetailFileType.textContent = note.fileType;
        if (this.dom.NoteDetailFileSize) this.dom.NoteDetailFileSize.textContent = note.fileSize;
        if (this.dom.NoteDetailPageCount) this.dom.NoteDetailPageCount.textContent = (note.pages || 0) + ' pages';
        if (this.dom.NoteDetailAuthor) this.dom.NoteDetailAuthor.textContent = note.author;
        if (this.dom.NoteDetailStream) this.dom.NoteDetailStream.textContent = note.stream;
        if (this.dom.NoteDetailYearSemester) this.dom.NoteDetailYearSemester.textContent = `Year ${note.year}, Sem ${note.semester}`;
        if (this.dom.NoteDetailSource) this.dom.NoteDetailSource.textContent = SourcePathResolver.getDisplaySource(note);
        if (this.dom.NoteDetailDownloadBtn) this.dom.NoteDetailDownloadBtn.dataset.noteId = note.id;
        if (this.dom.NoteDetailBookmarkBtn) {
            this.dom.NoteDetailBookmarkBtn.dataset.noteId = note.id;
            this.dom.NoteDetailBookmarkBtn.classList.toggle('bookmarked', isBookmarked);
            const label = this.dom.NoteDetailBookmarkBtn.querySelector('.BookmarkNoteButton__Label');
            if (label) label.textContent = isBookmarked ? 'Bookmarked' : 'Bookmark';
        }
        if (this.dom.NoteDetailShareBtn) this.dom.NoteDetailShareBtn.dataset.noteId = note.id;
        this._renderRelated(note);
        this.modalManager.open('NoteDetailModalOverlay');
    }

    _renderRelated(current) {
        if (!this.dom.NoteDetailRelated || !this.dom.NoteDetailRelatedList) return;
        const related = this.allNotes.filter(n =>
            n.id !== current.id && (n.subject === current.subject || (n.stream === current.stream && n.course === current.course))
        ).slice(0, 3);
        if (related.length > 0) {
            this.dom.NoteDetailRelated.style.display = '';
            this.dom.NoteDetailRelatedList.innerHTML = related.map(note => {
                const color = this.iconMapper.getCSSVariable(note.stream);
                return `<div class="RelatedNoteItem" data-note-id="${note.id}" tabindex="0" role="button" aria-label="${CardFactory.escapeHTML(note.title)}"><div class="RelatedNoteItem__AccentDot" style="background:${color}"></div><div class="RelatedNoteItem__Info"><span class="RelatedNoteItem__Title">${CardFactory.escapeHTML(note.title)}</span><span class="RelatedNoteItem__Meta">${note.subject} • Sem ${note.semester}</span></div><div class="RelatedNoteItem__Arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></div></div>`;
            }).join('');
        } else {
            this.dom.NoteDetailRelated.style.display = 'none';
        }
    }

    _addRecentView(noteId) {
        this.recentViews.remove(i => i === noteId);
        this.recentViews.enqueue(noteId);
        this.storage.set('recentViews', this.recentViews.toArray());
    }

    _toggleBookmark(noteId) {
        const id = String(noteId);
        const was = this.bookmarks.has(id);
        this.bookmarks.toggle(id);
        this.storage.set('bookmarks', this.bookmarks.toArray());
        this.toastManager.show(was ? 'Bookmark removed' : 'Note bookmarked!', was ? 'info' : 'success');
        this._applyFilters();
        const btn = document.querySelector(`.NoteCard__BookmarkBtn[data-note-id="${id}"]`);
        if (btn) AnimationController.bookmarkPop(btn);
    }

    _toggleFilterPanel() {
        const isOpen = !this.stateManager.state.filterOpen;
        this.stateManager.setState({ filterOpen: isOpen });
        if (this.dom.FilterDropdownPanel) {
            this.dom.FilterDropdownPanel.classList.toggle('open', isOpen);
            this.dom.FilterDropdownPanel.setAttribute('aria-hidden', !isOpen);
        }
        if (this.dom.FilterToggleButton) {
            this.dom.FilterToggleButton.classList.toggle('active', isOpen);
            this.dom.FilterToggleButton.setAttribute('aria-expanded', isOpen);
        }
    }

    _closeFilterPanel() {
        this.stateManager.setState({ filterOpen: false });
        if (this.dom.FilterDropdownPanel) { this.dom.FilterDropdownPanel.classList.remove('open'); this.dom.FilterDropdownPanel.setAttribute('aria-hidden', 'true'); }
        if (this.dom.FilterToggleButton) { this.dom.FilterToggleButton.classList.remove('active'); this.dom.FilterToggleButton.setAttribute('aria-expanded', 'false'); }
    }

    _clearAllFilters() {
        this.stateManager.setState({ search:'', stream:'', course:'', year:'', semester:'', subject:'', author:'', sort:'' });
        if (this.dom.SearchInput) this.dom.SearchInput.value = '';
        if (this.dom.ClearSearchBtn) this.dom.ClearSearchBtn.classList.remove('visible');
        document.querySelectorAll('.SortButton').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked','false'); });

        this.syncManager.syncFromSource('stream', '', null);
        this.syncManager.syncFromSource('search', '', null);

        this._populateAllFilters();
        this._applyFilters();
        this.toastManager.info('All filters cleared');
    }

    _removeFilter(key) {
        const updates = {};
        if (key === 'search') {
            updates.search = '';
            if (this.dom.SearchInput) this.dom.SearchInput.value = '';
            if (this.dom.ClearSearchBtn) this.dom.ClearSearchBtn.classList.remove('visible');
            this.syncManager.syncFromSource('search', '', null);
        } else {
            updates[key] = '';
            this.syncManager.syncFromSource(key, '', null);
        }
        this.stateManager.setState(updates);
        this._populateAllFilters();
        this._applyFilters();
    }

    _setSort(sortKey) {
        const state = this.stateManager.state;
        if (state.sort === sortKey) {
            if (state.sortDirection === 'asc') this.stateManager.setState({ sortDirection: 'desc' });
            else this.stateManager.setState({ sort: '', sortDirection: 'asc' });
        } else {
            this.stateManager.setState({ sort: sortKey, sortDirection: 'asc' });
        }
        document.querySelectorAll('.SortButton').forEach(btn => {
            const active = btn.dataset.sortKey === this.stateManager.state.sort;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-checked', active);
            const arrow = btn.querySelector('.SortButton__DirectionArrow');
            if (arrow) {
                arrow.style.display = active ? 'inline-flex' : 'none';
                if (active) { const svg = arrow.querySelector('svg'); if (svg) svg.style.transform = this.stateManager.state.sortDirection === 'desc' ? 'rotate(180deg)' : ''; }
            }
        });
        this._applyFilters();
    }

    _applyView(mode) {
        this.stateManager.setState({ view: mode });
        this.storage.set('view', mode);
        const grid = this.dom.NotesGrid;
        if (grid) {
            grid.classList.remove('list-view','compact-view');
            if (mode === 'list') grid.classList.add('list-view');
            if (mode === 'compact') grid.classList.add('compact-view');
            grid.dataset.currentView = mode;
        }
        document.querySelectorAll('.ViewSwitcher__Button').forEach(btn => {
            const active = btn.dataset.viewMode === mode;
            btn.classList.toggle('ViewSwitcher__Button--Active', active);
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-checked', active);
        });
    }

    _setTab(tab) {
        this.stateManager.setState({ tab });
        document.querySelectorAll('.TabButton').forEach(btn => {
            const active = btn.dataset.tabName === tab;
            btn.classList.toggle('TabButton--Active', active);
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active);
            btn.tabIndex = active ? 0 : -1;
        });
        this._applyFilters();
    }

    _handleScroll() {
        const scrollY = window.scrollY;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        if (this.dom.ScrollProgressBar && docH > 0) {
            const pct = (scrollY / docH) * 100;
            this.dom.ScrollProgressBar.style.width = pct + '%';
            this.dom.ScrollProgressBar.setAttribute('aria-valuenow', Math.round(pct));
        }
        if (this.dom.BackToTopButton) this.dom.BackToTopButton.classList.toggle('visible', scrollY > 400);
    }

    _showConfirm(msg, cb) {
        if (this.dom.ConfirmDialogMessage) this.dom.ConfirmDialogMessage.textContent = msg;
        this._confirmCallback = cb;
        this.modalManager.open('ConfirmDialogOverlay');
    }

    _rebuildAfterContribution() {
        this.allNotes = [...this.baseNotes, ...this.contributedNotes];
        this.filterEngine.rebuild(this.allNotes);
        this.searchEngine.rebuild(this.allNotes);
        this._populateAllFilters();
        this._updateStreamPillCounts();
        this._animateCounters();
        this._applyFilters();
    }

    async _handleDownload(noteId) {
        const note = this.allNotes.find(n => String(n.id) === String(noteId));
        if (!note) return;
        try {
            const success = await this.fileDownloader.download(note);
            if (success) {
                this.toastManager.success(`Downloading "${note.title}"...`);
            } else {
                this.toastManager.error('File not found in browser storage');
            }
        } catch (e) {
            this.toastManager.error('Download failed');
        }
    }

    _formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    _handleFileSelect(file) {
        if (!file) return;
        const maxSize = 52428800;
        const allowed = ['.pdf','.doc','.docx','.ppt','.pptx','.txt','.xlsx','.xls'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) {
            if (this.dom.ContributeFileError) this.dom.ContributeFileError.textContent = 'Invalid file type. Allowed: ' + allowed.join(', ');
            this._pendingFile = null;
            return;
        }
        if (file.size > maxSize) {
            if (this.dom.ContributeFileError) this.dom.ContributeFileError.textContent = 'File too large. Max size: 50 MB';
            this._pendingFile = null;
            return;
        }
        if (this.dom.ContributeFileError) this.dom.ContributeFileError.textContent = '';
        this._pendingFile = file;
        if (this.dom.FileUploadContent) this.dom.FileUploadContent.style.display = 'none';
        if (this.dom.FileUploadPreview) this.dom.FileUploadPreview.style.display = 'flex';
        if (this.dom.UploadedFileName) this.dom.UploadedFileName.textContent = file.name;
        if (this.dom.UploadedFileSize) this.dom.UploadedFileSize.textContent = this._formatFileSize(file.size);
        if (this.dom.ContributeFileSize) this.dom.ContributeFileSize.value = this._formatFileSize(file.size);
    }

    _removeUploadedFile() {
        this._pendingFile = null;
        if (this.dom.ContributeFile) this.dom.ContributeFile.value = '';
        if (this.dom.FileUploadContent) this.dom.FileUploadContent.style.display = '';
        if (this.dom.FileUploadPreview) this.dom.FileUploadPreview.style.display = 'none';
        if (this.dom.UploadedFileName) this.dom.UploadedFileName.textContent = '';
        if (this.dom.UploadedFileSize) this.dom.UploadedFileSize.textContent = '';
        if (this.dom.ContributeFileSize) this.dom.ContributeFileSize.value = '';
    }

    async _submitContribution(e) {
        e.preventDefault();
        const fields = {
            title: this.dom.ContributeNoteTitle,
            stream: this.dom.ContributeStream,
            course: this.dom.ContributeCourse,
            year: this.dom.ContributeYear,
            semester: this.dom.ContributeSemester,
            subject: this.dom.ContributeSubject,
            topics: this.dom.ContributeTopics,
            author: this.dom.ContributeAuthor
        };
        const errors = {
            title: this.dom.ContributeNoteTitleError,
            stream: this.dom.ContributeStreamError,
            course: this.dom.ContributeCourseError,
            year: this.dom.ContributeYearError,
            semester: this.dom.ContributeSemesterError,
            subject: this.dom.ContributeSubjectError,
            topics: this.dom.ContributeTopicsError,
            author: this.dom.ContributeAuthorError,
            file: this.dom.ContributeFileError
        };
        let valid = true;
        Object.values(errors).forEach(el => { if (el) el.textContent = ''; });
        Object.values(fields).forEach(el => { if (el) el.classList.remove('error'); });

        const validate = (key, minLen, msg) => {
            const val = fields[key] ? fields[key].value.trim() : '';
            if (!val || val.length < minLen) {
                if (errors[key]) errors[key].textContent = msg;
                if (fields[key]) fields[key].classList.add('error');
                valid = false;
            }
            return val;
        };

        const title = validate('title', 3, 'Title must be at least 3 characters');
        const stream = validate('stream', 1, 'Please select a stream');
        const course = validate('course', 2, 'Course is required');
        const yearVal = validate('year', 1, 'Please select year');
        const semVal = validate('semester', 1, 'Please select semester');
        const subject = validate('subject', 2, 'Subject is required');
        const topicsRaw = validate('topics', 1, 'At least one topic is required');
        const author = validate('author', 2, 'Author is required');

        if (!this._pendingFile) {
            if (errors.file) errors.file.textContent = 'Please upload a file (stored locally in your browser)';
            valid = false;
        }

        const topicsArr = topicsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (topicsArr.length === 0 && valid) {
            if (errors.topics) errors.topics.textContent = 'At least one topic is required';
            if (fields.topics) fields.topics.classList.add('error');
            valid = false;
        }

        if (!valid) {
            this.toastManager.error('Please fix the errors above');
            return;
        }

        // FIX: dynamically generated note ID to prevent collisions 
        const newNoteId = 'cont_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const pages = this.dom.ContributePages ? Number(this.dom.ContributePages.value) || 0 : 0;
        const fileSize = this.dom.ContributeFileSize ? this.dom.ContributeFileSize.value.trim() || 'N/A' : 'N/A';
        const fileExt = this._pendingFile.name.split('.').pop().toUpperCase();

        const newNote = {
            id: newNoteId,
            title: title,
            stream: stream,
            course: course,
            year: Number(yearVal),
            semester: Number(semVal),
            subject: subject,
            topics: topicsArr,
            fileType: fileExt,
            fileSize: fileSize,
            pages: pages,
            author: author,
            contributed: true,
            source: 'indexeddb://file_' + newNoteId,
            fileName: this._pendingFile.name
        };

        try {
            if (this.dom.SubmitContributionBtn) {
                this.dom.SubmitContributionBtn.disabled = true;
                this.dom.SubmitContributionBtn.textContent = 'Saving locally...';
            }
            await this.indexedDB.saveFile(newNote.id, this._pendingFile);
            this.contributedNotes.push(newNote);
            this.storage.set('contributedNotes', this.contributedNotes);
            this._rebuildAfterContribution();
            this.modalManager.close('ContributionModalOverlay');
            if (this.dom.ContributionForm) this.dom.ContributionForm.reset();
            if (this.dom.ContributeTopicsPreview) this.dom.ContributeTopicsPreview.innerHTML = '';
            if (this.dom.ContributeTopicsCounter) this.dom.ContributeTopicsCounter.textContent = '0 topics';
            this._removeUploadedFile();
            this.toastManager.success(`"${title}" saved locally in your browser!`);
        } catch (err) {
            this.toastManager.error('Failed to save file to browser storage');
        } finally {
            if (this.dom.SubmitContributionBtn) {
                this.dom.SubmitContributionBtn.disabled = false;
                this.dom.SubmitContributionBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Note';
            }
        }
    }

    _updateTopicsPreview() {
        if (!this.dom.ContributeTopics || !this.dom.ContributeTopicsPreview) return;
        const val = this.dom.ContributeTopics.value;
        const topics = val.split(',').map(t => t.trim()).filter(t => t.length > 0);
        this.dom.ContributeTopicsPreview.innerHTML = topics.map(t =>
            `<span class="TopicChip"><span class="TopicChip__Dot"></span><span class="TopicChip__Name">${CardFactory.escapeHTML(t)}</span></span>`
        ).join('');
        if (this.dom.ContributeTopicsCounter) this.dom.ContributeTopicsCounter.textContent = `${topics.length} topic${topics.length !== 1 ? 's' : ''}`;
    }

    _bindAllEvents() {
        this._bindTheme();
        this._bindSearch();
        this._bindFilters();
        this._bindSort();
        this._bindView();
        this._bindTabs();
        this._bindStreamPills();
        this._bindGrid();
        this._bindModals();
        this._bindScroll();
        this._bindKeyboard();
        this._bindSettings();
        this._bindContribution();
        this._bindFileUpload();
        this._bindMisc();
    }

    _bindTheme() {
        if (this.dom.ThemeToggler) {
            this.dom.ThemeToggler.addEventListener('click', () => {
                const t = this.themeManager.toggle();
                this.toastManager.info(t === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
            });
        }
    }

    _bindSearch() {
        if (this.dom.SearchInput) {
            this.dom.SearchInput.addEventListener('input', (e) => {
                const v = e.target.value;
                this.stateManager.setState({ search: v });
                if (this.dom.ClearSearchBtn) this.dom.ClearSearchBtn.classList.toggle('visible', !!v);
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this._applyFilters();
                    if (this.storage.get('autoComplete', true)) this._showSuggestions(v);
                }, 300);
            });
            this.dom.SearchInput.addEventListener('focus', () => {
                if (!this.dom.SearchInput.value && this.recentSearches.size > 0) this._showRecentSearches();
            });
            this.dom.SearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); this._navigateSuggestions('down'); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); this._navigateSuggestions('up'); }
                else if (e.key === 'Enter') {
                    e.preventDefault();
                    const items = this.dom.SearchSuggestionsPanel.querySelectorAll('.SuggestionItem');
                    if (this.suggestionIndex >= 0 && items[this.suggestionIndex]) this._selectSuggestion(items[this.suggestionIndex].dataset.noteId);
                    else { this._hideSuggestions(); this._addRecentSearch(this.dom.SearchInput.value); this._applyFilters(); }
                } else if (e.key === 'Escape') { this._hideSuggestions(); this._hideRecentSearches(); }
            });
        }
        if (this.dom.ClearSearchBtn) {
            this.dom.ClearSearchBtn.addEventListener('click', () => {
                this.stateManager.setState({ search: '' });
                if (this.dom.SearchInput) this.dom.SearchInput.value = '';
                this.dom.ClearSearchBtn.classList.remove('visible');
                this._hideSuggestions(); this._hideRecentSearches();
                this.syncManager.syncFromSource('search', '', this.dom.ClearSearchBtn);
                if (this.dom.SearchInput) this.dom.SearchInput.focus();
                this._applyFilters();
            });
        }
        if (this.dom.SearchSuggestionsPanel) {
            this.dom.SearchSuggestionsPanel.addEventListener('click', (e) => {
                const item = e.target.closest('.SuggestionItem');
                if (item) this._selectSuggestion(item.dataset.noteId);
            });
        }
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.SearchBox')) { this._hideSuggestions(); this._hideRecentSearches(); }
        });
        if (this.dom.ClearAllRecentSearches) {
            this.dom.ClearAllRecentSearches.addEventListener('click', () => {
                this.recentSearches.clear();
                this.storage.set('recentSearches', []);
                this._hideRecentSearches();
                this.toastManager.info('Recent searches cleared');
            });
        }
        if (this.dom.RecentSearchesList) {
            this.dom.RecentSearchesList.addEventListener('click', (e) => {
                const rm = e.target.closest('.RecentSearchItem__RemoveBtn');
                if (rm) {
                    const item = rm.closest('.RecentSearchItem');
                    this.recentSearches.remove(q => q === item.dataset.searchQuery);
                    this.storage.set('recentSearches', this.recentSearches.toArray());
                    item.remove();
                    if (this.recentSearches.isEmpty()) this._hideRecentSearches();
                    return;
                }
                const item = e.target.closest('.RecentSearchItem');
                if (item) {
                    this.dom.SearchInput.value = item.dataset.searchQuery;
                    this.stateManager.setState({ search: item.dataset.searchQuery });
                    this.dom.ClearSearchBtn.classList.add('visible');
                    this._hideRecentSearches();
                    this.syncManager.syncFromSource('search', item.dataset.searchQuery, this.dom.SearchInput);
                    this._applyFilters();
                }
            });
        }
    }

    _bindFilters() {
        const map = { SemesterFilter:'semester', StreamFilter:'stream', CourseFilter:'course', SubjectFilter:'subject', YearFilter:'year', AuthorFilter:'author' };
        Object.entries(map).forEach(([domKey, filterKey]) => {
            if (this.dom[domKey]) this.dom[domKey].addEventListener('change', () => this._onFilterChange(filterKey));
        });
        if (this.dom.FilterToggleButton) this.dom.FilterToggleButton.addEventListener('click', () => this._toggleFilterPanel());
        if (this.dom.CloseFilterPanelBtn) this.dom.CloseFilterPanelBtn.addEventListener('click', () => this._closeFilterPanel());
        if (this.dom.ResetAllFiltersBtn) this.dom.ResetAllFiltersBtn.addEventListener('click', (e) => { AnimationController.createRipple(e, this.dom.ResetAllFiltersBtn); this._clearAllFilters(); });
        if (this.dom.ActiveFilterChips) this.dom.ActiveFilterChips.addEventListener('click', (e) => { const chip = e.target.closest('.FilterChip'); if (chip) this._removeFilter(chip.dataset.filterKey); });
        document.addEventListener('click', (e) => {
            if (this.stateManager.state.filterOpen && !e.target.closest('.FilterDropdownPanel') && !e.target.closest('.FilterToggleButton')) this._closeFilterPanel();
        });
        if (this.dom.EmptyStateClearFilters) this.dom.EmptyStateClearFilters.addEventListener('click', () => this._clearAllFilters());
        if (this.dom.EmptyStateContribute) this.dom.EmptyStateContribute.addEventListener('click', () => this.modalManager.open('ContributionModalOverlay'));
    }

    _bindSort() {
        document.querySelectorAll('.SortButton').forEach(btn => {
            btn.addEventListener('click', (e) => { AnimationController.createRipple(e, btn); this._setSort(btn.dataset.sortKey); });
        });
    }

    _bindView() {
        document.querySelectorAll('.ViewSwitcher__Button').forEach(btn => {
            btn.addEventListener('click', () => this._applyView(btn.dataset.viewMode));
        });
    }

    _bindTabs() {
        document.querySelectorAll('.TabButton').forEach(btn => {
            btn.addEventListener('click', () => this._setTab(btn.dataset.tabName));
        });
    }

    _bindStreamPills() {
        document.querySelectorAll('.StreamPill').forEach(pill => {
            pill.addEventListener('click', () => {
                const stream = pill.dataset.streamValue;
                document.querySelectorAll('.StreamPill').forEach(p => {
                    p.classList.toggle('StreamPill--Active', p.dataset.streamValue === stream);
                    p.setAttribute('aria-pressed', p.dataset.streamValue === stream ? 'true' : 'false');
                });
                this.stateManager.setState({ stream });
                this.syncManager.syncFromSource('stream', stream, document.getElementById('StreamPillsRow'));
                this._populateAllFilters();
                this._applyFilters();
            });
        });
    }

    _bindGrid() {
        if (this.dom.NotesGrid) {
            this.dom.NotesGrid.addEventListener('click', (e) => {
                const bm = e.target.closest('.NoteCard__BookmarkBtn');
                if (bm) { e.stopPropagation(); this._toggleBookmark(bm.dataset.noteId); return; }
                const dl = e.target.closest('.DownloadNoteButton');
                if (dl) { e.stopPropagation(); AnimationController.createRipple(e, dl); this._handleDownload(dl.dataset.noteId); return; }
                const card = e.target.closest('.NoteCard');
                if (card) this._openNoteModal(card.dataset.noteId);
            });
            this.dom.NotesGrid.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const card = e.target.closest('.NoteCard');
                    if (card) { e.preventDefault(); this._openNoteModal(card.dataset.noteId); }
                }
            });
        }
        if (this.dom.LoadMoreButton) {
            this.dom.LoadMoreButton.addEventListener('click', (e) => {
                AnimationController.createRipple(e, this.dom.LoadMoreButton);
                this.stateManager.setState({ page: this.stateManager.state.page + 1 });
                // FIX: use "false" to append instead of clear
                this._renderNotes(false);
                this._updateUI();
            });
        }
    }

    _bindModals() {
        const closeMap = {
            CloseNoteDetailModal: 'NoteDetailModalOverlay',
            CloseContributionModal: 'ContributionModalOverlay',
            CloseShortcutsModal: 'KeyboardShortcutsModalOverlay',
            CloseSettingsModal: 'SettingsModalOverlay',
            CloseConfirmDialog: 'ConfirmDialogOverlay',
            CloseAboutModal: 'AboutModalOverlay',
            ClosePrivacyModal: 'PrivacyModalOverlay'
        };
        Object.entries(closeMap).forEach(([btnId, overlayId]) => {
            if (this.dom[btnId]) this.dom[btnId].addEventListener('click', () => this.modalManager.close(overlayId));
            const overlay = document.getElementById(overlayId);
            if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) this.modalManager.close(overlayId); });
        });
        if (this.dom.NoteDetailDownloadBtn) {
            this.dom.NoteDetailDownloadBtn.addEventListener('click', (e) => {
                AnimationController.createRipple(e, this.dom.NoteDetailDownloadBtn);
                this._handleDownload(this.dom.NoteDetailDownloadBtn.dataset.noteId);
            });
        }
        if (this.dom.NoteDetailBookmarkBtn) {
            this.dom.NoteDetailBookmarkBtn.addEventListener('click', () => {
                const id = String(this.dom.NoteDetailBookmarkBtn.dataset.noteId);
                this._toggleBookmark(id);
                const isB = this.bookmarks.has(id);
                this.dom.NoteDetailBookmarkBtn.classList.toggle('bookmarked', isB);
                const label = this.dom.NoteDetailBookmarkBtn.querySelector('.BookmarkNoteButton__Label');
                if (label) label.textContent = isB ? 'Bookmarked' : 'Bookmark';
            });
        }
        if (this.dom.NoteDetailShareBtn) {
            this.dom.NoteDetailShareBtn.addEventListener('click', () => {
                const note = this.allNotes.find(n => String(n.id) === String(this.dom.NoteDetailShareBtn.dataset.noteId));
                if (note && navigator.share) { navigator.share({ title: note.title, text: `Check out "${note.title}" on NoteVault`, url: window.location.href }).catch(() => {}); }
                else { navigator.clipboard.writeText(window.location.href).then(() => this.toastManager.success('Link copied!')).catch(() => this.toastManager.info('Share not available')); }
            });
        }
        if (this.dom.NoteDetailRelatedList) {
            this.dom.NoteDetailRelatedList.addEventListener('click', (e) => {
                const r = e.target.closest('.RelatedNoteItem');
                if (r) { this.modalManager.close('NoteDetailModalOverlay'); setTimeout(() => this._openNoteModal(r.dataset.noteId), 300); }
            });
        }
        if (this.dom.ConfirmDialogCancelBtn) this.dom.ConfirmDialogCancelBtn.addEventListener('click', () => this.modalManager.close('ConfirmDialogOverlay'));
        if (this.dom.ConfirmDialogOkBtn) {
            this.dom.ConfirmDialogOkBtn.addEventListener('click', () => {
                if (this._confirmCallback) { this._confirmCallback(); this._confirmCallback = null; }
                this.modalManager.close('ConfirmDialogOverlay');
            });
        }
        if (this.dom.KeyboardShortcutsOpener) this.dom.KeyboardShortcutsOpener.addEventListener('click', () => this.modalManager.open('KeyboardShortcutsModalOverlay'));
        if (this.dom.AppSettingsOpener) this.dom.AppSettingsOpener.addEventListener('click', () => { this._updateStorageInfo(); this.modalManager.open('SettingsModalOverlay'); });
    }

    _bindScroll() {
        window.addEventListener('scroll', () => {
            if (!this.scrollTicking) {
                requestAnimationFrame(() => { this._handleScroll(); this.scrollTicking = false; });
                this.scrollTicking = true;
            }
        }, { passive: true });
        if (this.dom.BackToTopButton) this.dom.BackToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    _bindKeyboard() {
        const shortcuts = new Map([
            ['/', () => { if (this.dom.SearchInput) this.dom.SearchInput.focus(); }],
            ['t', () => { const t = this.themeManager.toggle(); this.toastManager.info(t === 'dark' ? 'Dark mode' : 'Light mode'); }],
            ['f', () => this._toggleFilterPanel()],
            ['g', () => this._applyView('grid')],
            ['l', () => this._applyView('list')],
            ['c', () => this._applyView('compact')],
            ['b', () => this._setTab(this.stateManager.state.tab === 'bookmarks' ? 'all' : 'bookmarks')],
            ['n', () => this.modalManager.open('ContributionModalOverlay')],
            ['r', () => this._clearAllFilters()],
            ['?', () => this.modalManager.open('KeyboardShortcutsModalOverlay')]
        ]);

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                if (e.key === 'Escape') { this._hideSuggestions(); this._hideRecentSearches(); e.target.blur(); }
                return;
            }
            if (e.key === 'Escape') {
                if (this.modalManager.hasOpen) { this.modalManager.closeAll(); return; }
                if (this.stateManager.state.filterOpen) { this._closeFilterPanel(); return; }
                return;
            }
            if (e.key === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
            if (e.key === 'End') { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'k') { e.preventDefault(); if (this.dom.SearchInput) this.dom.SearchInput.focus(); }
                return;
            }
            const key = e.key.toLowerCase();
            if (key === '/' || key === '?') e.preventDefault();
            if (shortcuts.has(key)) shortcuts.get(key)();
        });
    }

    _bindSettings() {
        if (this.dom.SettingThemeSelect) {
            this.dom.SettingThemeSelect.value = this.themeManager.current;
            this.dom.SettingThemeSelect.addEventListener('change', (e) => this.themeManager.apply(e.target.value));
        }
        if (this.dom.SettingDefaultView) {
            this.dom.SettingDefaultView.value = this.stateManager.state.view;
            this.dom.SettingDefaultView.addEventListener('change', (e) => this._applyView(e.target.value));
        }
        if (this.dom.SettingAnimationsToggle) {
            this.dom.SettingAnimationsToggle.checked = this.storage.get('animations', true);
            this.dom.SettingAnimationsToggle.addEventListener('change', (e) => {
                this.storage.set('animations', e.target.checked);
                if (!e.target.checked) { document.documentElement.style.setProperty('--transition','0ms'); document.documentElement.style.setProperty('--transition-fast','0ms'); document.documentElement.style.setProperty('--transition-slow','0ms'); }
                else { document.documentElement.style.removeProperty('--transition'); document.documentElement.style.removeProperty('--transition-fast'); document.documentElement.style.removeProperty('--transition-slow'); }
            });
        }
        if (this.dom.SettingAutoCompleteToggle) {
            this.dom.SettingAutoCompleteToggle.checked = this.storage.get('autoComplete', true);
            this.dom.SettingAutoCompleteToggle.addEventListener('change', (e) => this.storage.set('autoComplete', e.target.checked));
        }
        if (this.dom.SettingNotesPerPage) {
            this.dom.SettingNotesPerPage.value = this.ITEMS_PER_PAGE;
            this.dom.SettingNotesPerPage.addEventListener('change', (e) => {
                this.ITEMS_PER_PAGE = Number(e.target.value);
                this.storage.set('itemsPerPage', this.ITEMS_PER_PAGE);
                this._applyFilters();
            });
        }
        if (this.dom.SettingCompactToggle) {
            this.dom.SettingCompactToggle.checked = this.storage.get('compact', false);
            this.dom.SettingCompactToggle.addEventListener('change', (e) => {
                this.storage.set('compact', e.target.checked);
                document.body.classList.toggle('compact-mode', e.target.checked);
            });
        }
        if (this.dom.SettingClearBookmarks) {
            this.dom.SettingClearBookmarks.addEventListener('click', () => {
                this._showConfirm('Clear all bookmarks? This cannot be undone.', () => {
                    this.bookmarks.clear();
                    this.storage.set('bookmarks', []);
                    this._applyFilters();
                    this.toastManager.info('Bookmarks cleared');
                });
            });
        }
        if (this.dom.SettingClearIndexedDB) {
            this.dom.SettingClearIndexedDB.addEventListener('click', () => {
                this._showConfirm('Clear all contributed files from browser storage? Note metadata will remain.', async () => {
                    try {
                        await this.indexedDB.clearAll();
                        this.toastManager.info('Browser storage files cleared');
                    } catch (e) {
                        this.toastManager.error('Failed to clear browser storage');
                    }
                });
            });
        }
        if (this.dom.SettingExportData) {
            this.dom.SettingExportData.addEventListener('click', () => {
                const data = {
                    bookmarks: this.bookmarks.toArray(),
                    contributedNotes: this.contributedNotes,
                    recentSearches: this.recentSearches.toArray(),
                    settings: { theme: this.themeManager.current, view: this.stateManager.state.view, itemsPerPage: this.ITEMS_PER_PAGE },
                    exportedAt: new Date().toISOString(),
                    version: '1.0.0',
                    developmentDate: 'March 2026',
                    exportedBy: 'Project K Squad - NoteVault'
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `notevault-export-${Date.now()}.json`; a.click();
                URL.revokeObjectURL(url);
                this.toastManager.success('Data exported!');
            });
        }
        if (this.dom.SettingImportFile) {
            this.dom.SettingImportFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (data.bookmarks) { this.bookmarks = new HashSet(data.bookmarks); this.storage.set('bookmarks', this.bookmarks.toArray()); }
                        if (data.contributedNotes) { this.contributedNotes = data.contributedNotes; this.storage.set('contributedNotes', this.contributedNotes); this._rebuildAfterContribution(); }
                        if (data.recentSearches) { this.recentSearches.clear(); data.recentSearches.forEach(s => this.recentSearches.enqueue(s)); this.storage.set('recentSearches', this.recentSearches.toArray()); }
                        this._applyFilters();
                        this.toastManager.success('Data imported!');
                    } catch (err) { this.toastManager.error('Invalid file format'); }
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        }
        if (this.dom.SettingResetDefaults) {
            this.dom.SettingResetDefaults.addEventListener('click', () => {
                this._showConfirm('Reset all settings to defaults? Bookmarks and contributed notes preserved.', () => {
                    this.themeManager.apply('light');
                    this._applyView('grid');
                    this.ITEMS_PER_PAGE = 12;
                    this.storage.set('itemsPerPage', 12);
                    this.storage.set('animations', true);
                    this.storage.set('autoComplete', true);
                    this.storage.set('compact', false);
                    if (this.dom.SettingThemeSelect) this.dom.SettingThemeSelect.value = 'light';
                    if (this.dom.SettingDefaultView) this.dom.SettingDefaultView.value = 'grid';
                    if (this.dom.SettingNotesPerPage) this.dom.SettingNotesPerPage.value = '12';
                    if (this.dom.SettingAnimationsToggle) this.dom.SettingAnimationsToggle.checked = true;
                    if (this.dom.SettingAutoCompleteToggle) this.dom.SettingAutoCompleteToggle.checked = true;
                    if (this.dom.SettingCompactToggle) this.dom.SettingCompactToggle.checked = false;
                    document.body.classList.remove('compact-mode');
                    document.documentElement.style.removeProperty('--transition');
                    document.documentElement.style.removeProperty('--transition-fast');
                    document.documentElement.style.removeProperty('--transition-slow');
                    this._applyFilters();
                    this.toastManager.info('Settings reset');
                });
            });
        }
    }

    _bindContribution() {
        const openContribute = () => this.modalManager.open('ContributionModalOverlay');
        if (this.dom.ContributeNoteBtn) this.dom.ContributeNoteBtn.addEventListener('click', openContribute);
        if (this.dom.ContributeFloatingBtn) this.dom.ContributeFloatingBtn.addEventListener('click', openContribute);
        if (this.dom.CancelContributionBtn) this.dom.CancelContributionBtn.addEventListener('click', () => { this._removeUploadedFile(); this.modalManager.close('ContributionModalOverlay'); });
        if (this.dom.ContributionForm) this.dom.ContributionForm.addEventListener('submit', (e) => this._submitContribution(e));
        if (this.dom.ContributeTopics) this.dom.ContributeTopics.addEventListener('input', () => this._updateTopicsPreview());
    }

    _bindFileUpload() {
        if (this.dom.ContributeFile) {
            this.dom.ContributeFile.addEventListener('change', (e) => {
                if (e.target.files[0]) this._handleFileSelect(e.target.files[0]);
            });
        }
        if (this.dom.FileUploadArea) {
            this.dom.FileUploadArea.addEventListener('click', (e) => {
                if (!e.target.closest('.FileUploadArea__RemoveBtn') && this.dom.ContributeFile) {
                    this.dom.ContributeFile.click();
                }
            });
            this.dom.FileUploadArea.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && this.dom.ContributeFile) {
                    e.preventDefault();
                    this.dom.ContributeFile.click();
                }
            });
            this.dom.FileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dom.FileUploadArea.classList.add('FileUploadArea--DragOver');
            });
            this.dom.FileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dom.FileUploadArea.classList.remove('FileUploadArea--DragOver');
            });
            this.dom.FileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dom.FileUploadArea.classList.remove('FileUploadArea--DragOver');
                if (e.dataTransfer.files[0]) this._handleFileSelect(e.dataTransfer.files[0]);
            });
        }
        if (this.dom.RemoveUploadedFile) {
            this.dom.RemoveUploadedFile.addEventListener('click', (e) => {
                e.stopPropagation();
                this._removeUploadedFile();
            });
        }
    }

    _bindMisc() {
        if (this.dom.DismissAnnouncementBtn) {
            this.dom.DismissAnnouncementBtn.addEventListener('click', () => {
                if (this.dom.AnnouncementBanner) { this.dom.AnnouncementBanner.style.display = 'none'; this.storage.set('announcement_dismissed', true); }
            });
        }
        if (this.dom.ExportResultsButton) {
            this.dom.ExportResultsButton.addEventListener('click', () => {
                const notes = this.stateManager.state.filteredNotes;
                let csv = 'Title,Subject,Stream,Course,Year,Semester,Topics,Author,Pages,File Size,Source\n';
                notes.forEach(n => { csv += `"${n.title}","${n.subject}","${n.stream}","${n.course}",${n.year},${n.semester},"${(n.topics || []).join('; ')}","${n.author}",${n.pages || 0},"${n.fileSize}","${SourcePathResolver.resolve(n)}"\n`; });
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `notevault-results-${Date.now()}.csv`; a.click();
                URL.revokeObjectURL(url);
                this.toastManager.success('Exported as CSV');
            });
        }
        if (this.dom.ShareResultsButton) {
            this.dom.ShareResultsButton.addEventListener('click', () => {
                if (navigator.share) { navigator.share({ title: 'NoteVault Notes', text: 'Check out these notes on NoteVault by Project K Squad!', url: window.location.href }).catch(() => {}); }
                else { navigator.clipboard.writeText(window.location.href).then(() => this.toastManager.success('Link copied!')).catch(() => this.toastManager.error('Could not copy')); }
            });
        }
        if (this.dom.FooterCurrentYear) this.dom.FooterCurrentYear.textContent = new Date().getFullYear();
        if (this.dom.FooterLinkAbout) this.dom.FooterLinkAbout.addEventListener('click', (e) => { e.preventDefault(); this.modalManager.open('AboutModalOverlay'); });
        if (this.dom.FooterLinkPrivacy) this.dom.FooterLinkPrivacy.addEventListener('click', (e) => { e.preventDefault(); this.modalManager.open('PrivacyModalOverlay'); });
        if (this.dom.FooterLinkContribute) this.dom.FooterLinkContribute.addEventListener('click', (e) => { e.preventDefault(); this.modalManager.open('ContributionModalOverlay'); });
        if (this.dom.FooterLinkShortcuts) this.dom.FooterLinkShortcuts.addEventListener('click', (e) => { e.preventDefault(); this.modalManager.open('KeyboardShortcutsModalOverlay'); });
        if (!this.storage.get('announcement_dismissed', false)) { if (this.dom.AnnouncementBanner) this.dom.AnnouncementBanner.style.display = ''; }
        window.addEventListener('resize', this._debounce(() => {
            if (this.particleSystem && this.dom.ParticleLayer) {
                this.particleSystem.generate(window.innerWidth < 768 ? 8 : 15);
            }
        }, 500));
    }

    async _updateStorageInfo() {
        if (this.dom.StorageUsedValue) {
            const lsSize = this.storage.getFormattedSize();
            try {
                const idbSize = await this.indexedDB.getFormattedStorageSize();
                this.dom.StorageUsedValue.textContent = `${lsSize} (LS) + ${idbSize} (IDB)`;
            } catch (e) {
                this.dom.StorageUsedValue.textContent = lsSize;
            }
        }
    }

    _debounce(fn, wait) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new NoteVaultApp();
    app.init();
    window.NoteVaultApp = app;
});
