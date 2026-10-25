(async function () {
    'use strict';

    // Names kept from earlier versions so existing data stays readable.
    const DB = 'rd8', V = 1, N = 'n', R = 'r', O = 'opf8', C = 5 * 1024 * 1024, TRASH = 'trash';
    const KDF_ITER = 600000, MAX_HASH = 1024 ** 3, MAX_TEXT = 1024 * 1024;
    const EDITABLE_IMG = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

    let db, opf = null, wkr = null, activeBackend = 'none';
    let EST = { usage: 0, quota: 0 }, purls = [], dlgRes = null, dragIds = null;
    let sCol = 'name', sAsc = true, sQuery = '', refreshSeq = 0, busy = false;
    let pvNode = null, imgUrl = null, pc = null, dc = null, rx = null, searchT = null;
    let clipboard = { action: null, ids: [] };
    const st = { cwd: R, items: [], sel: new Set(), path: [], isGrid: false, quickAccess: [] };

    const $ = s => document.querySelector(s);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const tx = t => new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const stat = m => { $('#stMsg').textContent = m || 'Ready'; };
    const subtleOK = () => !!(window.crypto && crypto.subtle);
    const bytesToHex = a => Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
    const hexToBytes = h => new Uint8Array(h.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const clean = s => String(s).replace(/[\/\\]/g, '_').replace(/[\u0000-\u001f]/g, '').trim();
    const extOf = nm => { const i = nm.lastIndexOf('.'); return i > 0 ? nm.slice(i + 1).toLowerCase() : ''; };

    const ls = {
        get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
        set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
        del: k => { try { localStorage.removeItem(k); } catch (e) { } }
    };

    const fmtSz = b => {
        if (b == null) return '—';
        if (b < 1024) return b + ' B';
        const u = ['KB', 'MB', 'GB', 'TB']; let n = b, i = -1;
        do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
        return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)) + ' ' + u[i];
    };
    const fmtDt = t => {
        const d = new Date(t || Date.now()), p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const pct = v => { const p = (v || 0) * 100; return (p < 10 ? p.toFixed(1) : Math.round(p)) + '%'; };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
        else if (document.exitFullscreen) document.exitFullscreen();
    };
    document.addEventListener('fullscreenchange', () => {
        const btn = $('#btnFullscreen');
        if (btn) btn.textContent = document.fullscreenElement ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
    });

    // ---------- crypto helpers ----------
    // Files made by older versions used SHA-256(password) as the key material; v2 files use the password itself.
    const legacyKey = async p => bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p))));

    const hashBlob = async b => {
        if (!subtleOK() || b.size > MAX_HASH) return null;
        return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer())));
    };

    const deriveKey = async (pwd, salt, usage) => crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: KDF_ITER, hash: 'SHA-256' },
        await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveKey']),
        { name: 'AES-GCM', length: 256 }, false, [usage]
    );

    // Main-thread fallback if the worker can't load (e.g. opened from file://).
    let lk = { id: null, key: null };
    const localChunk = async ({ chunk, compress, password, saltHex, ivHex }) => {
        let buf = chunk;
        if (compress) buf = await new Response(new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
        if (password) {
            const id = saltHex + '|' + password;
            if (lk.id !== id) lk = { id, key: await deriveKey(password, hexToBytes(saltHex), 'encrypt') };
            buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: hexToBytes(ivHex) }, lk.key, buf);
        }
        return buf;
    };
    let wPending = null;   // the one chunk currently being processed by the worker
    const useWorker = () => {
        try {
            wkr = new Worker('worker.js');
            // Attach immediately: a worker that fails to load reports its error right away.
            wkr.onerror = e => {
                if (e && e.preventDefault) e.preventDefault();
                wkr = null;
                if (wPending) { const p = wPending; wPending = null; localChunk(p.msg).then(p.res, p.rej); }
            };
            wkr.onmessage = e => {
                const p = wPending; wPending = null;
                if (p) e.data.ok ? p.res(e.data.buf) : p.rej(new Error(e.data.error));
            };
        } catch (e) { wkr = null; }
    };
    const runChunk = msg => new Promise((res, rej) => {
        if (!wkr) return localChunk(msg).then(res, rej);
        wPending = { msg, res, rej };
        wkr.postMessage(msg);
    });
    useWorker();

    // ---------- file types & icons ----------
    const EX = {
        image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff', 'avif'],
        video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'mpg', 'mpeg', 'm4v', '3gp'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi', 'opus'],
        text: ['txt', 'md', 'markdown', 'log', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'ini', 'cfg', 'conf', 'yml', 'yaml', 'toml', 'srt', 'vtt', 'tex', 'sql', 'sh', 'bat', 'ps1', 'py', 'rb', 'php', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt'],
        exe: ['exe', 'msi', 'cmd', 'com', 'app', 'bin', 'dll', 'apk', 'deb', 'rpm', 'dmg'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'cab'],
        pdf: ['pdf'], doc: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'rtf', 'epub']
    };
    const CL = { image: '#4a9bd6', video: '#d05a5a', audio: '#9a6fd0', text: '#5fa347', exe: '#c07a1e', archive: '#8a7a5a', pdf: '#c04a3a', doc: '#3a76ae', other: '#9aa5b1' };

    const cat = n => {
        if (n.kind === 'folder') return { cat: 'folder', label: 'Folder' };
        const e = extOf(n.name);
        for (const c in EX) if (EX[c].includes(e)) return { cat: c, label: e.toUpperCase() + ' File' };
        return { cat: 'other', label: e ? e.toUpperCase() + ' File' : 'File' };
    };

    const IF = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16"><path d="M1.5 3.5h4.2l1.3 1.6h7.5v7.4a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5z" fill="#f0c060" stroke="#a67c1e"/><path d="M1.5 5.7h13" stroke="#fff" stroke-opacity=".55"/></svg>`;
    const IL = '<svg width="10" height="10" viewBox="0 0 16 16" fill="#b03a2a"><path d="M8 1a4 4 0 0 0-4 4v2H3v8h10V7h-1V5a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H6V5z"/></svg>';
    const DI = (c, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16"><path d="M3.5 1.5h5.7l3.3 3.3v9.7h-9z" fill="#fff" stroke="#8d9aa8"/><path d="M9.2 1.5v3.3h3.3" fill="#eef2f6" stroke="#8d9aa8"/><rect x="4.6" y="7.3" width="6.8" height="4.8" rx="1" fill="${c}"/></svg>`;

    const icon = (n, s = 16) => {
        let b = n.thumb && !n.encrypted ? `<img src="${n.thumb}">` : (n.kind === 'folder' ? IF(s) : DI(CL[cat(n).cat] || CL.other, s));
        if (n.encrypted) b += `<span class="lockb">${IL}</span>`;
        if (n.tag && CSS.supports('color', n.tag)) b += `<div class="tag-dot" style="background:${esc(n.tag)};"></div>`;
        return b;
    };

    // ---------- database / blob storage ----------
    const open = () => new Promise((res, rej) => {
        const r = indexedDB.open(DB, V);
        r.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains(N)) d.createObjectStore(N, { keyPath: 'id' }).createIndex('pid', 'parentId');
            if (!d.objectStoreNames.contains('s')) d.createObjectStore('s', { keyPath: 'k' });
            if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });

    const sto = (n, m = 'readonly') => db.transaction(n, m).objectStore(n);
    const list = pid => req(sto(N).index('pid').getAll(pid));
    const node = id => id === R ? Promise.resolve({ id: R, name: 'My Disk', kind: 'folder', parentId: null })
        : id === TRASH ? Promise.resolve({ id: TRASH, name: 'Trash', kind: 'folder', parentId: null })
            : req(sto(N).get(id));
    const put = n => req(sto(N, 'readwrite').put(n));

    const uniq = async (n, pid, ex) => {
        const s = await list(pid), t = new Set(s.filter(x => x.id !== ex).map(x => x.name.toLowerCase()));
        if (!t.has(n.toLowerCase())) return n;
        const d = n.lastIndexOf('.'), b = d > 0 ? n.slice(0, d) : n, e = d > 0 ? n.slice(d) : '';
        let i = 2, c; do { c = `${b} (${i})${e}`; i++; } while (t.has(c.toLowerCase()));
        return c;
    };

    // true if `id` is `anc` or lives somewhere below it
    const isInside = async (id, anc) => {
        let cur = id;
        for (let g = 0; cur && cur !== R && cur !== TRASH && g < 500; g++) {
            if (cur === anc) return true;
            const n = await node(cur); cur = n && n.parentId;
        }
        return cur === anc;
    };

    // ids of everything that sits in the trash (directly or inside a trashed folder)
    const trashedIds = all => {
        const map = new Map(all.map(x => [x.id, x])), out = new Set();
        for (const x of all) {
            let c = x, g = 0;
            while (c && g++ < 500) { if (c.parentId === TRASH) { out.add(x.id); break; } c = map.get(c.parentId); }
        }
        return out;
    };

    const getFhOPFS = async (id, cr) => (await opf.getDirectoryHandle(O, { create: true })).getFileHandle(id, { create: !!cr });

    const mountStorage = async () => {
        try {
            if (navigator.storage && navigator.storage.getDirectory) {
                opf = await navigator.storage.getDirectory();
                const d = await opf.getDirectoryHandle(O, { create: true });
                const w = await (await d.getFileHandle('test', { create: true })).createWritable();
                await w.write(new Uint8Array(1)); await w.close();
                await d.removeEntry('test');
                activeBackend = 'OPFS';
                return;
            }
        } catch (e) { opf = null; }
        activeBackend = 'IndexedDB';
    };

    const writeBlob = async (id, data) => {
        if (activeBackend === 'OPFS') {
            const w = await (await getFhOPFS(id, true)).createWritable();
            await w.write(data); await w.close();
        } else {
            const t = db.transaction('blobs', 'readwrite');
            t.objectStore('blobs').put({ id, data });
            await tx(t);
        }
    };
    const readBlob = async id => {
        if (activeBackend === 'OPFS') { try { return await (await getFhOPFS(id, false)).getFile(); } catch (e) { /* fall through */ } }
        try { const rec = await req(sto('blobs').get(id)); return rec ? rec.data : null; } catch (e) { return null; }
    };
    const deleteBlob = async id => {
        if (activeBackend === 'OPFS') {
            try { await (await opf.getDirectoryHandle(O)).removeEntry(id); } catch (e) { }
        } else {
            const t = db.transaction('blobs', 'readwrite');
            t.objectStore('blobs').delete(id);
            await tx(t);
        }
    };

    const proc = async (file, pwd) => {
        if (pwd && !subtleOK()) throw new Error('Encryption needs HTTPS or localhost.');
        const tot = Math.ceil(file.size / C);
        const comp = typeof CompressionStream !== 'undefined' && file.size < 100 * 1024 * 1024 && (file.type.startsWith('text/') || file.type === 'application/json');
        const salt = crypto.getRandomValues(new Uint8Array(16)), sHex = bytesToHex(salt);
        const cs = [], ivs = [], id = uid(), chunks = [];
        let writ = null;
        try {
            if (activeBackend === 'OPFS') writ = await (await getFhOPFS(id, true)).createWritable();
            for (let i = 0; i < tot; i++) {
                const c = await file.slice(i * C, Math.min((i + 1) * C, file.size)).arrayBuffer();
                const iv = crypto.getRandomValues(new Uint8Array(12));
                ivs.push(Array.from(iv));
                const buf = await runChunk({ chunk: c, compress: comp, password: pwd || null, saltHex: sHex, ivHex: bytesToHex(iv) });
                cs.push(buf.byteLength);
                if (writ) await writ.write(new Uint8Array(buf)); else chunks.push(new Uint8Array(buf));
            }
            if (writ) { await writ.close(); writ = null; } else await writeBlob(id, new Blob(chunks));
        } catch (e) {
            if (writ) { try { await writ.abort(); } catch (x) { } }
            try { await deleteBlob(id); } catch (x) { }
            throw e;
        }
        return { id, salt: Array.from(salt), ivs, cs, comp, enc: !!pwd };
    };

    const thumb = f => {
        const vid = f.type.startsWith('video/');
        if (!vid && !f.type.startsWith('image/')) return Promise.resolve(null);
        return new Promise(res => {
            const e = document.createElement(vid ? 'video' : 'img'), u = URL.createObjectURL(f);
            let done = false, t;
            const fin = v => { if (done) return; done = true; clearTimeout(t); URL.revokeObjectURL(u); res(v); };
            t = setTimeout(() => fin(null), 8000);
            const draw = () => {
                try {
                    const w = e.videoWidth || e.naturalWidth, h = e.videoHeight || e.naturalHeight;
                    if (!w || !h) return fin(null);
                    const c = document.createElement('canvas'); c.width = c.height = 48;
                    const x = c.getContext('2d'), s = Math.min(48 / w, 48 / h);
                    x.fillStyle = '#fff'; x.fillRect(0, 0, 48, 48);
                    x.drawImage(e, (48 - w * s) / 2, (48 - h * s) / 2, w * s, h * s);
                    fin(c.toDataURL('image/jpeg', .6));
                } catch (err) { fin(null); }
            };
            e.onerror = () => fin(null);
            if (vid) {
                e.muted = true; e.preload = 'auto';
                e.onloadeddata = () => { e.currentTime = Math.min(1, (e.duration || 1) / 2); };
                e.onseeked = draw;
            } else e.onload = draw;
            e.src = u;
        });
    };

    // pwd is the RAW password (or null). o: { exclude, hint, ro, tag, created }
    const add = async (f, pid, pwd, o = {}) => {
        const name = await uniq(clean(f.name || 'untitled') || 'untitled', pid, o.exclude);
        const th = pwd ? null : await thumb(f);
        const m = await proc(f, pwd);
        const nd = {
            id: m.id, parentId: pid, name, kind: 'file', mime: f.type || 'application/octet-stream',
            size: f.size, compSize: m.cs.reduce((a, b) => a + b, 0), compressed: m.comp,
            encrypted: m.enc, encVer: 2, salt: m.salt, ivs: m.ivs, chunkSizes: m.cs,
            thumb: th, hash: await hashBlob(f), created: o.created || Date.now(), modified: f.lastModified || Date.now()
        };
        if (o.hint) nd.hint = o.hint;
        if (o.ro) nd.ro = true;
        if (o.tag) nd.tag = o.tag;
        try { await req(sto(N, 'readwrite').add(nd)); } catch (e) { await deleteBlob(m.id); throw e; }
        return nd;
    };

    // Throws on a wrong password (AES-GCM auth failure); returns null if the data is missing.
    const getBlob = async (nd, pwd) => {
        const raw = await readBlob(nd.id);
        if (!raw) return null;
        if (!nd.encrypted && !nd.compressed) return raw.slice(0, raw.size, nd.mime);
        let key = null;
        if (nd.encrypted) {
            if (!subtleOK()) throw new Error('Decryption needs HTTPS or localhost.');
            key = await deriveKey(nd.encVer === 2 ? pwd : await legacyKey(pwd), new Uint8Array(nd.salt), 'decrypt');
        }
        let off = 0; const ch = [];
        for (let i = 0; i < nd.chunkSizes.length; i++) {
            let b = await raw.slice(off, off + nd.chunkSizes[i]).arrayBuffer(); off += nd.chunkSizes[i];
            if (nd.encrypted) b = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(nd.ivs[i]) }, key, b);
            if (nd.compressed) b = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
            ch.push(new Uint8Array(b));
        }
        return new Blob(ch, { type: nd.mime });
    };

    // Prompts for a password when needed (retrying on a wrong one). Returns { blob, pwd } or null.
    const openNode = async nd => {
        if (!nd.encrypted) {
            try { const b = await getBlob(nd); if (b) return { blob: b, pwd: null }; stat('File data is missing.'); }
            catch (e) { stat('Error: ' + e.message); }
            return null;
        }
        if (!subtleOK()) { stat('Encrypted files need HTTPS or localhost.'); return null; }
        let err = '';
        for (; ;) {
            const pwd = await ask(nd, err);
            if (pwd === null) return null;
            try {
                const b = await getBlob(nd, pwd);
                if (!b) { stat('File data is missing.'); return null; }
                return { blob: b, pwd };
            } catch (e) { err = 'Incorrect password (or the file is damaged).'; }
        }
    };

    const del = async id => {
        for (const c of await list(id)) await del(c.id);
        const n = await node(id);
        if (n && n.kind === 'file') await deleteBlob(id);
        await req(sto(N, 'readwrite').delete(id));
    };

    const moveToTrash = async id => {
        const n = await node(id);
        if (!n || n.parentId === TRASH) return;
        n.origParent = n.parentId; n.parentId = TRASH; n.modified = Date.now();
        await put(n);
    };

    const restoreNode = async id => {
        const n = await node(id);
        if (!n) return;
        let pid = n.origParent || R;
        if (pid !== R && !(await node(pid))) pid = R;
        n.parentId = pid; delete n.origParent;
        n.name = await uniq(n.name, pid, n.id);
        await put(n);
    };

    // Best-effort only: browser storage and SSDs can't guarantee physical overwrite.
    const randBlob = len => {
        const parts = [];
        for (let o = 0; o < len; o += 1048576) {
            const a = new Uint8Array(Math.min(1048576, len - o));
            for (let p = 0; p < a.length; p += 65536) crypto.getRandomValues(a.subarray(p, Math.min(p + 65536, a.length)));
            parts.push(a);
        }
        return new Blob(parts);
    };
    const shredNode = async id => {
        const n = await node(id);
        if (!n) return;
        for (const c of await list(id)) await shredNode(c.id);
        if (n.kind === 'file') {
            const len = Math.min(n.compSize || n.size || 0, 32 * 1024 * 1024);
            if (len) for (let i = 0; i < 3; i++) await writeBlob(id, randBlob(len));
            await deleteBlob(id);
        }
        await req(sto(N, 'readwrite').delete(id));
    };

    // ---------- rendering ----------
    const render = () => {
        const b = $('#listbody');
        b.className = 'listbody ' + (st.isGrid ? 'grid' : 'list');
        const q = sQuery.toLowerCase();
        const l = q ? st.items.filter(n => n.name.toLowerCase().includes(q)) : st.items;

        l.sort((a, z) => {
            if (!q && a.kind !== z.kind) return a.kind === 'folder' ? -1 : 1;
            let r;
            if (sCol === 'size') r = (a.size || 0) - (z.size || 0);
            else if (sCol === 'modified') r = (a.modified || 0) - (z.modified || 0);
            else if (sCol === 'type') r = cat(a).label.localeCompare(cat(z).label) || a.name.localeCompare(z.name, undefined, { numeric: true, sensitivity: 'base' });
            else r = a.name.localeCompare(z.name, undefined, { numeric: true, sensitivity: 'base' });
            return sAsc ? r : -r;
        });

        document.querySelectorAll('.listheader .col').forEach(e => {
            e.querySelector('.sort-arrow').textContent = e.dataset.sort === sCol ? (sAsc ? '▲' : '▼') : '';
        });

        if (!l.length) { b.innerHTML = `<div class="empty">${sQuery ? 'No results.' : st.cwd === TRASH ? 'Trash is empty.' : 'Empty folder.'}</div>`; return; }

        b.innerHTML = l.map(it => `
            <div class="row${st.sel.has(it.id) ? ' sel' : ''}" data-id="${esc(it.id)}" draggable="${st.cwd !== TRASH}">
                <div class="col name"><span class="ico">${icon(it, st.isGrid ? 48 : 16)}</span><span class="label">${esc(it.name)}</span></div>
                <div class="col type">${cat(it).label}</div>
                <div class="col size">${it.kind === 'folder' ? '—' : fmtSz(it.size)}</div>
                <div class="col date">${fmtDt(it.modified)}</div>
            </div>`).join('');
    };

    const saveQuick = () => ls.set('rd_quick', JSON.stringify(st.quickAccess));
    const renderQuick = async () => {
        const q = $('#quick-list');
        if (!q) return;
        const nodes = (await Promise.all(st.quickAccess.map(id => node(id)))).filter(Boolean);
        if (nodes.length !== st.quickAccess.length) { st.quickAccess = nodes.map(n => n.id); saveQuick(); }
        if (!nodes.length) { q.innerHTML = '<span style="color:var(--tx-m);font-size:10px;">No pinned items.</span>'; return; }
        q.innerHTML = nodes.map(n => `<div class="quick-item" data-id="${esc(n.id)}">${n.kind === 'folder' ? IF(14) : DI(CL[cat(n).cat] || CL.other, 14)} <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(n.name)}</span></div>`).join('');
    };

    const stats = async () => {
        const a = await req(sto(N).getAll());
        const f = a.filter(x => x.kind === 'file'), d = a.filter(x => x.kind === 'folder');
        const cb = a.reduce((x, n) => x + (n.compSize || n.size || 0), 0);
        try { if (navigator.storage && navigator.storage.estimate) EST = await navigator.storage.estimate(); } catch (e) { }
        const q = EST.quota || 0, p = q ? Math.min(100, (cb / q) * 100) : 0;
        $('#meterFill').style.width = p + '%';
        $('#meterFill').style.background = p > 85 ? '#e79a8c' : p > 60 ? '#f0d27a' : '#96d873';
        $('#sbUsed').textContent = fmtSz(cb);
        $('#sbQuota').textContent = q ? fmtSz(q) : 'Unknown';
        $('#sbCount').textContent = `${f.length} files, ${d.length} folders`;
        $('#stItems').textContent = st.items.length + ' objects';
        renderQuick();
    };

    const side = () => {
        const n = st.items.filter(i => st.sel.has(i.id)), one = n.length === 1 ? n[0] : null;
        if (one) {
            const r = (one.kind === 'file' && one.size && !one.encrypted) ? Math.round((1 - (one.compSize / one.size)) * 100) : 0;
            $('#sbSel').innerHTML = `<b>${esc(one.name)}</b><br>${cat(one).label}<br>${one.kind === 'folder' ? '—' : fmtSz(one.size)}${r > 0 ? `<br><span style="color:#4c9a2a">${r}% smaller</span>` : ''}`;
        } else if (n.length > 1) $('#sbSel').innerHTML = `<b>${n.length} items</b>`;
        else $('#sbSel').textContent = 'Nothing selected.';

        const any = n.length > 0;
        $('#sbPreview').disabled = !(one && one.kind === 'file');
        $('#sbDownload').disabled = $('#tbDownload').disabled = !any;
        $('#sbDownloadZip').disabled = $('#tbDownloadZip').disabled = !any;
        $('#sbDelete').disabled = $('#tbDelete').disabled = !any;
        $('#stSel').textContent = any ? n.length + ' selected' : 'None selected';
    };

    // Update highlight on existing rows instead of rebuilding the list (a rebuild between the two
    // clicks of a double-click makes the browser drop the dblclick event).
    const selChanged = () => {
        document.querySelectorAll('#listbody .row').forEach(r => r.classList.toggle('sel', st.sel.has(r.dataset.id)));
        side();
    };

    const refresh = async () => {
        if (!db) return;
        const seq = ++refreshSeq;
        if (st.cwd !== R && st.cwd !== TRASH && !(await node(st.cwd))) st.cwd = R;

        let items;
        if (sQuery) {
            const all = await req(sto(N).getAll()), tr = trashedIds(all), inTr = st.cwd === TRASH;
            items = all.filter(x => tr.has(x.id) === inTr);
        } else items = await list(st.cwd);

        const chain = []; let cur = st.cwd;
        for (let g = 0; cur && cur !== R && cur !== TRASH && g < 500; g++) {
            const n = await node(cur); if (!n) break;
            chain.unshift(n); cur = n.parentId;
        }
        if (seq !== refreshSeq) return;   // a newer refresh has started
        st.items = items; st.path = chain;

        const ids = new Set(items.map(i => i.id));
        st.sel = new Set(Array.from(st.sel).filter(i => ids.has(i)));

        const inTrash = cur === TRASH;
        let crumb = inTrash ? `<span class="cr" data-id="${R}">My Disk</span><span class="sep">▸</span><span class="cr" data-id="${TRASH}">Trash</span>` : `<span class="cr" data-id="${R}">My Disk</span>`;
        crumb += chain.map(n => `<span class="sep">▸</span><span class="cr" data-id="${esc(n.id)}">${esc(n.name)}</span>`).join('');
        $('#crumbs').innerHTML = crumb;
        $('#btnEmptyTrash').style.display = st.cwd === TRASH ? 'inline-flex' : 'none';
        $('#ctx-paste').style.display = clipboard.action ? 'block' : 'none';
        $('#btnView').textContent = st.isGrid ? 'List' : 'Grid';

        render();
        await stats();
        side();
    };

    // ---------- dialogs ----------
    const dlg = o => new Promise(res => {
        if (dlgRes) { const r = dlgRes; dlgRes = null; r(null); }
        dlgRes = res;
        $('#dlgTitle').textContent = o.title || 'RetroDisk';
        $('#dlgLabel').textContent = o.label || '';
        $('#dlgInputContainer').innerHTML = o.input === false ? '' : `<input type="text" id="dlgInput" spellcheck="false" value="${esc(o.value || '')}">`;
        $('#dlgHint').textContent = o.hint || '';
        $('#dlgHint').hidden = !o.hint;
        $('#dlgOk').textContent = o.okText || 'OK';
        $('#dlg').hidden = false;
        setTimeout(() => { const i = $('#dlgInput'); if (i) { i.focus(); i.select(); } else $('#dlgOk').focus(); }, 20);
    });
    const dlgCl = v => {
        $('#dlg').hidden = true;
        if (dlgRes) { const r = dlgRes; dlgRes = null; r(v); }
    };
    const confirmDlg = (title, label, okText) => dlg({ title, label, input: false, okText }).then(Boolean);

    // Returns the entered password, or null if cancelled.
    const ask = (nd, err) => new Promise(res => {
        const b = document.createElement('div'); b.className = 'modal-back ask-overlay'; b.style.zIndex = '300';
        b.innerHTML = `
            <div class="modalwin dlgwin">
                <div class="titlebar"><div class="title"><span class="logo"></span>Password Required</div><div class="winbtns"><button class="close" id="pwc">✕</button></div></div>
                <div class="dlgbody">
                    <label>Enter password for <b>${esc(nd.name)}</b>:</label>
                    <input type="password" id="pwi" autocomplete="off">
                    ${nd.hint ? `<div class="hint">Hint: ${esc(nd.hint)}</div>` : ''}
                    <div class="hint" style="color:#b03a2a" ${err ? '' : 'hidden'}>${esc(err || '')}</div>
                </div>
                <div class="dlgfoot"><button class="btn" id="pwo">OK</button><button class="btn" id="pwx">Cancel</button></div>
            </div>`;
        document.body.appendChild(b);
        const inp = b.querySelector('#pwi'); inp.focus();
        const onEsc = e => { if (e.key === 'Escape') { e.stopPropagation(); cl(null); } };
        const cl = s => { document.removeEventListener('keydown', onEsc, true); b.remove(); res(s); };
        document.addEventListener('keydown', onEsc, true);
        b.querySelector('#pwc').onclick = b.querySelector('#pwx').onclick = () => cl(null);
        b.querySelector('#pwo').onclick = () => { if (inp.value) cl(inp.value); else inp.focus(); };
        b.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); b.querySelector('#pwo').click(); } });
    });

    // Asks once per upload batch. Returns null (skip) or { pwd, hint, ro }.
    const offer = label => new Promise(res => {
        const p = document.createElement('div'); p.className = 'toast-panel';
        p.innerHTML = `
            <div class="titlebar"><div class="title"><span class="logo"></span>Password Protect</div><div class="winbtns"><button class="close" id="tc">✕</button></div></div>
            <div class="toast-body">
                <p>Protect <b>${esc(label)}</b>?</p>
                <input type="password" id="tp" placeholder="Password" autocomplete="new-password">
                <input type="text" id="th" placeholder="Hint (optional)">
                <label style="font-size:10px;display:block;margin-bottom:8px;"><input type="checkbox" id="tr"> Self-destruct (Read Once)</label>
                <div class="toast-btns"><button class="btn" id="ts">Skip</button><button class="btn" id="tpr">Apply</button></div>
            </div>`;
        document.body.appendChild(p);
        const tp = p.querySelector('#tp'); tp.focus();
        const onEsc = e => { if (e.key === 'Escape') { e.stopPropagation(); cl(null); } };
        const cl = v => { document.removeEventListener('keydown', onEsc, true); p.remove(); res(v); };
        document.addEventListener('keydown', onEsc, true);
        p.querySelector('#tc').onclick = p.querySelector('#ts').onclick = () => cl(null);
        p.querySelector('#tpr').onclick = () => {
            const o = { pwd: tp.value, hint: p.querySelector('#th').value.trim(), ro: p.querySelector('#tr').checked };
            cl(o.pwd || o.ro ? o : null);
        };
        p.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); p.querySelector('#tpr').click(); } });
    });

    // ---------- actions ----------
    const canWrite = () => {
        if (st.cwd === TRASH) { stat('Trash is read-only. Open a normal folder first.'); return false; }
        return true;
    };

    const saveBlob = (b, name) => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    };

    const dlNodes = async ns => {
        for (const n of ns) {
            const r = await openNode(n);
            if (!r) continue;
            if (n.hash) {
                const h = await hashBlob(r.blob);
                if (h && h !== n.hash) { alert('Integrity check failed for ' + n.name); continue; }
            }
            saveBlob(r.blob, n.name);
            if (n.ro) await del(n.id);
        }
        await refresh();
    };

    const zipName = (out, p) => {
        if (!out[p]) return p;
        const d = p.lastIndexOf('.'), s = p.lastIndexOf('/'), b = d > s + 1 ? p.slice(0, d) : p, e = d > s + 1 ? p.slice(d) : '';
        let i = 2; while (out[`${b} (${i})${e}`]) i++;
        return `${b} (${i})${e}`;
    };
    const gatherZip = async (nd, prefix, out) => {
        if (nd.kind === 'folder') {
            const base = prefix + nd.name + '/';
            out[base] = new Uint8Array(0);
            for (const k of await list(nd.id)) await gatherZip(k, base, out);
            return;
        }
        const r = await openNode(nd);
        if (r) out[zipName(out, prefix + nd.name)] = new Uint8Array(await r.blob.arrayBuffer());
    };

    const pasteItems = async () => {
        if (!clipboard.action || !clipboard.ids.length || !canWrite()) return;
        stat('Pasting...');
        const copyNode = async (n, pid) => {
            if (n.kind === 'folder') {
                const nd = { id: uid(), parentId: pid, name: await uniq(n.name, pid), kind: 'folder', size: 0, compSize: 0, created: Date.now(), modified: Date.now() };
                if (n.tag) nd.tag = n.tag;
                await req(sto(N, 'readwrite').add(nd));
                for (const k of await list(n.id)) await copyNode(k, nd.id);
            } else {
                const r = await openNode(n);
                if (r) await add(new File([r.blob], n.name, { type: n.mime }), pid, r.pwd, { hint: n.hint, tag: n.tag });
            }
        };
        let refused = 0;
        try {
            for (const id of clipboard.ids) {
                const n = await node(id);
                if (!n || n.parentId === TRASH) continue;
                if (n.kind === 'folder' && await isInside(st.cwd, n.id)) { refused++; continue; }
                if (clipboard.action === 'copy') await copyNode(n, st.cwd);
                else if (n.parentId !== st.cwd) {
                    n.parentId = st.cwd; n.name = await uniq(n.name, st.cwd, n.id);
                    await put(n);
                }
            }
            if (clipboard.action === 'cut' && !refused) clipboard = { action: null, ids: [] };
            stat(refused ? 'Cannot paste a folder into itself or one of its subfolders.' : 'Paste complete.');
        } catch (e) { stat('Paste failed: ' + e.message); }
        await refresh();
    };

    const moveIds = async (ids, target) => {
        for (const id of ids) {
            if (target === TRASH) { await moveToTrash(id); continue; }
            const n = await node(id);
            if (!n || id === target || n.parentId === target) continue;
            if (n.kind === 'folder' && await isInside(target, id)) continue;
            n.parentId = target; n.name = await uniq(n.name, target, n.id);
            await put(n);
        }
        st.sel.clear();
        await refresh();
    };

    const selNodes = () => st.items.filter(i => st.sel.has(i.id));

    // Returns an async fn(parts[]) -> id of the (created-on-demand) nested folder under `dest`.
    const dirResolver = dest => {
        const cache = new Map();
        return async parts => {
            let path = '', parent = dest;
            for (const raw of parts) {
                const p = clean(raw);
                if (!p || p === '.' || p === '..') continue;
                path += '/' + p;
                if (!cache.has(path)) {
                    const nd = { id: uid(), parentId: parent, name: await uniq(p, parent), kind: 'folder', size: 0, compSize: 0, created: Date.now(), modified: Date.now() };
                    await req(sto(N, 'readwrite').add(nd)); cache.set(path, nd.id);
                }
                parent = cache.get(path);
            }
            return parent;
        };
    };

    // items: [{ dirs: ['a','b'], file: File | null }]  (file === null means an empty folder)
    const importItems = async (items, failedPre = 0) => {
        if (!items.length) return stat('Nothing to upload.');
        if (busy) return stat('Another operation is still running.');
        if (!canWrite()) return;
        busy = true;
        try {
            const files = items.filter(i => i.file);
            const label = files.length === 1 && !items.some(i => i.dirs.length) ? files[0].file.name : `${files.length} file(s)`;
            const o = files.length ? await offer(label) : null;
            const resolve = dirResolver(st.cwd);
            let ok = 0, failed = failedPre, n = 0, lastErr = '';
            for (const it of items) {
                try {
                    const parent = await resolve(it.dirs);
                    if (!it.file) continue;
                    stat(`Uploading ${++n}/${files.length}: ${it.file.name}`);
                    await add(it.file, parent, o && o.pwd || null, { hint: o && o.hint, ro: o && o.ro });
                    ok++;
                } catch (e) { failed++; lastErr = e.message; console.error(e); stat(`Failed: ${it.file ? it.file.name : 'folder'} — ${e.message}`); await sleep(800); }
            }
            await refresh();
            stat(`Added ${ok} of ${files.length} file(s).${failed ? ' ' + failed + ' failed' + (lastErr ? ' (' + lastErr + ')' : ' or were unreadable') + '.' : ''}`);
        } finally { busy = false; }
    };

    // Recursively read a dropped FileSystemEntry (must be obtained synchronously inside the drop event).
    const readAllEntries = dir => new Promise((res, rej) => {
        const r = dir.createReader(), all = [];
        const next = () => r.readEntries(b => { if (!b.length) res(all); else { all.push(...b); next(); } }, rej);
        next();
    });
    const walkEntry = async (entry, dirs, out) => {
        if (entry.isFile) {
            try { out.push({ dirs, file: await new Promise((res, rej) => entry.file(res, rej)) }); }
            catch (e) { out.failed = (out.failed || 0) + 1; }
        } else if (entry.isDirectory) {
            const d = [...dirs, entry.name];
            let kids = [];
            try { kids = await readAllEntries(entry); } catch (e) { out.failed = (out.failed || 0) + 1; }
            if (!kids.length) out.push({ dirs: d, file: null });
            for (const k of kids) await walkEntry(k, d, out);
        }
    };

    const act = {
        upload: () => { if (canWrite()) $('#fileInput').click(); },
        uploadfolder: () => { if (canWrite()) $('#folderInput').click(); },
        newfolder: () => {
            if (!canWrite()) return;
            dlg({ title: 'New Folder', label: 'Name:', value: 'New Folder' }).then(async n => {
                n = n && clean(n); if (!n) return;
                const nd = { id: uid(), parentId: st.cwd, name: await uniq(n, st.cwd), kind: 'folder', size: 0, compSize: 0, created: Date.now(), modified: Date.now() };
                await req(sto(N, 'readwrite').add(nd));
                await refresh();
            });
        },
        extractzip: () => { if (canWrite()) $('#zipInput').click(); },
        download: () => { const ns = selNodes(); if (ns.some(i => i.kind === 'folder')) return act.downloadzip(); return dlNodes(ns); },
        downloadzip: async () => {
            if (typeof fflate === 'undefined') return stat('ZIP library failed to load.');
            const ns = selNodes(); if (!ns.length) return;
            const out = {};
            for (const n of ns) await gatherZip(n, '', out);
            if (!Object.keys(out).length) return stat('Nothing to save.');
            saveBlob(new Blob([fflate.zipSync(out)], { type: 'application/zip' }), ns.length === 1 && ns[0].kind === 'folder' ? ns[0].name + '.zip' : 'Export.zip');
        },
        delete: () => {
            const ids = Array.from(st.sel);
            if (!ids.length) return;
            const inTr = st.cwd === TRASH;
            confirmDlg('Confirm', inTr ? `Permanently DELETE ${ids.length} item(s)?` : `Move ${ids.length} item(s) to Trash?`).then(async ok => {
                if (!ok) return;
                for (const id of ids) { if (inTr) await del(id); else await moveToTrash(id); }
                st.sel.clear(); await refresh();
            });
        },
        restore: async () => {
            if (st.cwd !== TRASH) return;
            for (const id of Array.from(st.sel)) await restoreNode(id);
            st.sel.clear(); await refresh(); stat('Restored.');
        },
        batchrename: () => {
            const ns = selNodes(); if (!ns.length || st.cwd === TRASH) return;
            dlg({ title: 'Batch Rename', label: 'Prefix (e.g. File_):', value: 'File_' }).then(async p => {
                p = p && clean(p); if (!p) return;
                const w = Math.max(2, String(ns.length).length);
                for (let i = 0; i < ns.length; i++) {
                    const n = ns[i], e = n.kind === 'file' && extOf(n.name) ? '.' + extOf(n.name) : '';
                    n.name = await uniq(p + String(i + 1).padStart(w, '0') + e, n.parentId, n.id);
                    n.modified = Date.now();
                    await put(n);
                }
                await refresh();
            });
        },
        shred: () => {
            const ids = Array.from(st.sel);
            if (!ids.length) return;
            confirmDlg('Secure Shred', `Overwrite and permanently delete ${ids.length} item(s)? This cannot be undone. (Best effort: browsers and SSDs can't guarantee physical erasure.)`, 'SHRED').then(async ok => {
                if (!ok) return;
                stat('Shredding...');
                for (const id of ids) await shredNode(id);
                st.sel.clear(); await refresh(); stat('Shredded.');
            });
        },
        up: () => nav(st.path.length ? (st.path[st.path.length - 1].parentId || R) : R),
        trash: () => nav(TRASH),
        empty_trash: () => {
            confirmDlg('Empty Trash', 'Permanently delete ALL items in Trash?', 'Empty').then(async ok => {
                if (!ok) return;
                for (const item of await list(TRASH)) await del(item.id);
                await refresh(); stat('Trash emptied.');
            });
        },
        rename: () => {
            const n = selNodes()[0]; if (!n || st.cwd === TRASH) return;
            const e = n.kind === 'file' && extOf(n.name) ? '.' + extOf(n.name) : '', b = e ? n.name.slice(0, -e.length) : n.name;
            dlg({ title: 'Rename', label: 'New name:', value: b, hint: e ? `Extension preserved: ${e}` : '' }).then(async v => {
                v = v && clean(v); if (!v || v === b) return;
                n.name = await uniq(v + e, n.parentId, n.id);
                n.modified = Date.now();
                await put(n); await refresh();
            });
        },
        toggle_view: () => { st.isGrid = !st.isGrid; ls.set('rd_grid', st.isGrid ? '1' : '0'); $('#btnView').textContent = st.isGrid ? 'List' : 'Grid'; render(); },
        clear_wallpaper: () => { $('#app').style.backgroundImage = ''; $('#app').classList.remove('wp'); ls.del('rd_wallpaper'); },
        theme_default: () => setTheme('default'),
        theme_win98: () => setTheme('win98'),
        theme_mac: () => setTheme('mac'),
        theme_dark: () => setTheme('dark'),
        webrtc: () => { $('#webrtc-modal').hidden = false; },
        about: () => showAbout('about'),
        features: () => showAbout('features'),
        tutorial: () => showAbout('tutorial'),
        steganography: () => { $('#steg-modal').hidden = false; },
        find_duplicates: async () => {
            $('#dup-modal').hidden = false;
            $('#dup-list').textContent = 'Scanning...';
            const all = await req(sto(N).getAll()), tr = trashedIds(all);
            const groups = {};
            all.filter(n => n.kind === 'file' && n.hash && n.size > 0 && !tr.has(n.id)).forEach(f => (groups[f.hash] = groups[f.hash] || []).push(f));
            const dups = Object.values(groups).filter(g => g.length > 1);
            if (!dups.length) { $('#dup-list').innerHTML = '<div style="text-align:center;padding:20px;color:var(--tx-m);">No duplicates found.</div>'; return; }
            $('#dup-list').innerHTML = dups.map((g, i) => `
                <div class="dup-group" style="margin-bottom:15px;border:1px solid var(--bd-l);padding:10px;border-radius:4px;background:var(--pn);">
                    <b>Group ${i + 1} (${fmtSz(g[0].size)})</b><br>
                    ${g.map((f, j) => `<label style="display:block;margin:4px 0;"><input type="checkbox" class="dup-chk" data-g="${i}" value="${esc(f.id)}" ${j > 0 ? 'checked' : ''} style="width:auto;margin:0 6px 0 0;"> ${esc(f.name)}</label>`).join('')}
                </div>`).join('');
        }
    };

    const showAbout = tab => {
        document.querySelectorAll('.about-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.about-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
        $('#aboutBody').scrollTop = 0;
        $('#about-modal').hidden = false;
    };

    const setTheme = t => { document.body.dataset.theme = t; ls.set('rd_theme', t); };

    const showProps = async () => {
        const n = selNodes()[0]; if (!n) return;
        $('#prop-table').innerHTML = `
            <tr><td>Name</td><td>${esc(n.name)}</td></tr>
            <tr><td>Type</td><td>${cat(n).label}</td></tr>
            <tr><td>Size</td><td>${n.kind === 'folder' ? '—' : `${fmtSz(n.size)} (Stored: ${fmtSz(n.compSize)})`}</td></tr>
            <tr><td>Created</td><td>${fmtDt(n.created)}</td></tr>
            <tr><td>Modified</td><td>${fmtDt(n.modified)}</td></tr>
            <tr><td>Encrypted</td><td>${n.encrypted ? 'Yes (AES-256-GCM)' : 'No'}</td></tr>
            <tr><td>Compressed</td><td>${n.compressed ? 'Yes (Gzip)' : 'No'}</td></tr>
            <tr><td>SHA-256</td><td style="font-family:monospace;word-break:break-all;">${esc(n.hash || '—')}</td></tr>`;
        $('#prop-modal').hidden = false;
    };

    const nav = async id => {
        if (id !== R && id !== TRASH && !(await node(id))) return;
        st.cwd = id; st.sel.clear(); sQuery = ''; $('#searchInput').value = '';
        await refresh();
    };

    // Writes a new version of a file, then removes the old one (so a failure never loses data).
    const replaceNode = async (n, file, pwd) => {
        const nd = await add(file, n.parentId, pwd, { exclude: n.id, hint: n.hint, ro: n.ro, tag: n.tag, created: n.created });
        await del(n.id);
        st.quickAccess = st.quickAccess.map(i => i === n.id ? nd.id : i); saveQuick();
        return nd;
    };

    // ---------- image editor ----------
    const closeImgEditor = () => {
        $('#img-editor-modal').hidden = true;
        if (imgUrl) { URL.revokeObjectURL(imgUrl); imgUrl = null; }
    };
    const openImgEditor = async (n, b, pwd) => {
        const img = new Image(); imgUrl = URL.createObjectURL(b);
        try { img.src = imgUrl; await img.decode(); } catch (e) { closeImgEditor(); return stat('Cannot open this image.'); }
        $('#img-editor-modal').hidden = false;
        const c = $('#imgCanvas'), ctx = c.getContext('2d'); let rot = 0;
        const draw = () => {
            const sw = rot % 180 !== 0;
            c.width = sw ? img.height : img.width; c.height = sw ? img.width : img.height;
            ctx.translate(c.width / 2, c.height / 2); ctx.rotate(rot * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        };
        draw();
        $('#imgRotate').onclick = () => { rot = (rot + 90) % 360; draw(); };
        $('#imgSave').onclick = () => {
            if (!rot) { closeImgEditor(); return stat('No changes to save.'); }
            const ext = extOf(n.name);
            const type = ext === 'webp' ? 'image/webp' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
            const name = (type === 'image/png' && ext !== 'png') ? n.name.replace(/\.[^.]*$/, '') + '.png' : n.name;
            c.toBlob(async blob => {
                if (!blob) return stat('Export failed.');
                try {
                    const t = blob.type || type, nm = t === type ? name : n.name.replace(/\.[^.]*$/, '') + '.png';
                    await replaceNode(n, new File([blob], nm, { type: t }), pwd);
                    pvNode = null; closePreview(); closeImgEditor(); await refresh(); stat('Image saved.');
                } catch (e) { stat('Save failed: ' + e.message); }
            }, type, 0.92);
        };
    };

    // ---------- preview ----------
    const closePreview = () => {
        $('#modal').hidden = true; $('#modalBody').innerHTML = '';
        purls.forEach(u => URL.revokeObjectURL(u)); purls = [];
        const n = pvNode; pvNode = null;
        if (n && n.ro) del(n.id).then(refresh);
    };

    const prev = async (n, o = {}) => {
        if (n.kind !== 'file') return;
        if (pvNode) closePreview();
        const r = await openNode(n);
        if (!r) return;
        const b = r.blob, pwd = r.pwd, c = cat(n).cat, u = URL.createObjectURL(b);
        purls.push(u); pvNode = n;

        $('#modalTitle').textContent = n.name;
        $('#modalInfo').textContent = `${cat(n).label} • ${fmtSz(n.size)}${n.ro ? ' • Read-once: deleted when closed' : ''}`;
        $('#modalSaveBtn').hidden = true; $('#modalSaveAsBtn').hidden = true;
        $('#modalDownloadBtn').onclick = () => saveBlob(b, n.name);
        $('#modal').hidden = false;

        if (c === 'image') {
            $('#modalBody').innerHTML = `<img src="${u}">`;
            if (EDITABLE_IMG.includes(extOf(n.name))) {
                $('#modalSaveAsBtn').hidden = false; $('#modalSaveAsBtn').textContent = 'Edit Image';
                $('#modalSaveAsBtn').onclick = () => openImgEditor(n, b, pwd);
            }
        } else if (c === 'video') {
            $('#modalBody').innerHTML = `<video controls autoplay src="${u}"></video>`;
        } else if (c === 'audio') {
            $('#modalBody').innerHTML = `<audio controls autoplay src="${u}"></audio>`;
            const q = st.items.filter(i => cat(i).cat === 'audio'), idx = q.findIndex(i => i.id === n.id);
            $('#modalBody audio').onended = () => { if (idx >= 0 && idx < q.length - 1) prev(q[idx + 1]); };
        } else if (c === 'pdf') {
            $('#modalBody').innerHTML = `<iframe src="${u}"></iframe>`;
        } else if (c === 'text') {
            const big = b.size > MAX_TEXT;
            const text = await (big ? b.slice(0, 200 * 1024) : b).text();
            const ext = extOf(n.name), sb = $('#modalSaveBtn');
            const crlf = text.includes('\r\n');
            const enterEdit = () => {
                $('#modalBody').innerHTML = '<textarea class="editor" spellcheck="false"></textarea>';
                $('#modalBody textarea').value = text;   // set via .value: innerHTML would drop a leading newline
                sb.textContent = 'Save';
                sb.onclick = async () => {
                    sb.disabled = true;
                    try {
                        let v = $('#modalBody textarea').value;
                        if (crlf) v = v.replace(/\r?\n/g, '\r\n');
                        await replaceNode(n, new File([v], n.name, { type: n.mime }), pwd);
                        pvNode = null; closePreview(); await refresh(); stat('Saved.');
                    } catch (e) { stat('Save failed: ' + e.message); }
                    sb.disabled = false;
                };
            };
            if (!big && (ext === 'md' || ext === 'markdown')) {
                $('#modalBody').innerHTML = '<div class="markdown-view"></div>';
                const v = $('#modalBody .markdown-view');
                // Markdown can contain raw HTML, so it must be sanitised (or shown as plain text).
                if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    v.innerHTML = DOMPurify.sanitize(marked.parse(text));
                    v.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
                    v.querySelectorAll('img').forEach(im => {           // no remote requests from stored documents
                        if (!/^(data|blob):/i.test(im.getAttribute('src') || '')) im.replaceWith(document.createTextNode('[image: ' + (im.alt || 'blocked') + ']'));
                    });
                } else v.textContent = text;
                sb.textContent = 'Edit Raw';
            } else {
                const lang = { js: 'javascript', py: 'python', html: 'html', css: 'css', json: 'json', xml: 'xml' }[ext] || 'plaintext';
                $('#modalBody').innerHTML = `<div style="flex:1;align-self:stretch;overflow:auto;background:#10151a;padding:16px;"><pre style="margin:0;padding:0;"><code class="language-${lang}">${esc(text)}</code></pre></div>`;
                if (typeof hljs !== 'undefined') { try { hljs.highlightElement($('#modalBody code')); } catch (e) { } }
                sb.textContent = 'Edit';
            }
            if (big) { $('#modalInfo').textContent += ' • Showing first 200 KB (read-only)'; }
            else { sb.hidden = false; sb.onclick = enterEdit; if (o.edit) enterEdit(); }
        } else {
            $('#modalBody').innerHTML = '<div class="nopreview">No preview available.</div>';
        }
    };

    // ---------- WebRTC file share ----------
    const waitIce = p => new Promise(res => {
        if (p.iceGatheringState === 'complete') return res();
        const f = () => { if (p.iceGatheringState === 'complete') { p.removeEventListener('icegatheringstatechange', f); res(); } };
        p.addEventListener('icegatheringstatechange', f);
        setTimeout(res, 5000);
    });
    const rtcStatus = m => { $('#webrtcStatus').textContent = m; stat(m); };

    const setupChannel = ch => {
        dc = ch; ch.binaryType = 'arraybuffer';
        ch.onopen = () => rtcStatus('Peer connected. Select files and press "Send Selected Files".');
        ch.onclose = () => rtcStatus('Peer disconnected.');
        ch.onmessage = async e => {
            if (typeof e.data === 'string') {
                let m; try { m = JSON.parse(e.data); } catch (x) { return; }
                if (m.t === 'file') { rx = { name: String(m.name || 'file'), mime: String(m.mime || ''), size: Number(m.size) || 0, parts: [], got: 0 }; rtcStatus('Receiving ' + rx.name + '…'); }
                else if (m.t === 'end' && rx) {
                    const f = rx; rx = null;
                    if (f.got !== f.size) return rtcStatus('Transfer of ' + f.name + ' was incomplete.');
                    try {
                        await add(new File(f.parts, f.name, { type: f.mime }), st.cwd === TRASH ? R : st.cwd, null);
                        await refresh(); rtcStatus('Received ' + f.name);
                    } catch (x) { rtcStatus('Could not save ' + f.name + ': ' + x.message); }
                }
            } else if (rx) { rx.parts.push(e.data); rx.got += e.data.byteLength; }
        };
    };
    const newPC = () => {
        if (pc) { try { pc.close(); } catch (e) { } }
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.ondatachannel = e => setupChannel(e.channel);
        pc.onconnectionstatechange = () => { if (pc && pc.connectionState === 'failed') rtcStatus('Connection failed.'); };
    };
    const parseSDP = () => { try { return JSON.parse($('#webrtcInput').value.trim()); } catch (e) { rtcStatus('That is not a valid offer/answer.'); return null; } };

    // ---------- steganography (LSB of R,G,B; alpha untouched) ----------
    const lsbIdx = k => ((k / 3) | 0) * 4 + (k % 3);
    const loadPixels = async file => {
        const img = new Image(), u = URL.createObjectURL(file);
        try { img.src = u; await img.decode(); } finally { URL.revokeObjectURL(u); }
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        return { c, ctx, id: ctx.getImageData(0, 0, c.width, c.height) };
    };
    const STEG_MAGIC = [0x52, 0x44, 0x53, 0x31]; // "RDS1"

    // ---------- event wiring ----------
    const anyModal = () => !!document.querySelector('.modal-back:not([hidden])') || !!document.querySelector('.toast-panel');

    const showCtx = (x, y, full) => {
        const c = $('#ctx-menu'), sel = selNodes(), one = sel.length === 1 ? sel[0] : null, tr = st.cwd === TRASH;
        const isImg = !!one && one.kind === 'file' && cat(one).cat === 'image';
        const vis = {
            open: !!one && (!tr || one.kind === 'folder'), edit: !!one && one.kind === 'file' && cat(one).cat === 'text' && !tr,
            download: sel.some(i => i.kind === 'file'), properties: !!one, copy: sel.length > 0 && !tr, cut: sel.length > 0 && !tr,
            paste: !!clipboard.action && !tr, quickaccess: !!one && !tr, tag: sel.length > 0 && !tr,
            wallpaper: isImg && !tr, img_edit: isImg && EDITABLE_IMG.includes(extOf(one.name)) && !tr,
            rename: !!one && !tr, batchrename: sel.length > 1 && !tr, restore: tr && sel.length > 0, delete: sel.length > 0
        };
        if (!full) for (const k in vis) vis[k] = k === 'paste';
        c.querySelectorAll('[data-ctx]').forEach(el => { el.style.display = vis[el.dataset.ctx] ? 'block' : 'none'; });
        c.querySelectorAll('.sep').forEach(el => { el.style.display = full ? 'block' : 'none'; });
        const q = c.querySelector('[data-ctx="quickaccess"]');
        if (q) q.textContent = sel.length && sel.every(i => st.quickAccess.includes(i.id)) ? 'Unpin from Quick Access' : 'Pin to Quick Access';
        const d = c.querySelector('[data-ctx="delete"]');
        if (d) d.textContent = tr ? 'Delete Permanently' : 'Move to Trash';
        c.style.display = 'block';
        c.style.left = Math.max(0, Math.min(x, innerWidth - c.offsetWidth - 4)) + 'px';
        c.style.top = Math.max(0, Math.min(y, innerHeight - c.offsetHeight - 4)) + 'px';
    };

    const setClip = action => {
        if (!st.sel.size || st.cwd === TRASH) return false;
        clipboard = { action, ids: Array.from(st.sel) };
        $('#ctx-paste').style.display = 'block';
        stat(action === 'copy' ? 'Copied.' : 'Cut.');
        return true;
    };

    const imp = fs => importItems(fs.map(f => ({ dirs: [], file: f })));

    const bind = () => {
        $('#btnFullscreen').onclick = toggleFullscreen;

        $('#menubar').addEventListener('click', e => {
            const t = e.target.closest('.menu-title'), m = e.target.closest('.mi');
            if (t) {
                const mu = t.parentElement, w = mu.classList.contains('open');
                $('#menubar').querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
                if (!w) mu.classList.add('open');
                e.stopPropagation();
            } else if (m && act[m.dataset.act]) {
                $('#menubar').querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
                act[m.dataset.act]();
            }
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('#menubar')) $('#menubar').querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
            if (!e.target.closest('#ctx-menu')) $('#ctx-menu').style.display = 'none';
            const b = e.target.closest('[data-act]');
            if (b && !b.closest('#menubar') && act[b.dataset.act] && !b.disabled) act[b.dataset.act]();
        });

        document.addEventListener('contextmenu', e => {
            if (!e.target.closest('#listbody')) return;
            const r = e.target.closest('.row');
            if (r) {
                e.preventDefault();
                if (!st.sel.has(r.dataset.id)) { st.sel = new Set([r.dataset.id]); selChanged(); }
                showCtx(e.clientX, e.clientY, true);
            } else if (clipboard.action && st.cwd !== TRASH) {
                e.preventDefault(); showCtx(e.clientX, e.clientY, false);
            }
        });

        $('#ctx-menu').addEventListener('click', async e => {
            const a = e.target.closest('[data-ctx]')?.dataset.ctx;
            $('#ctx-menu').style.display = 'none';
            if (!a) return;
            const n = selNodes()[0];
            try {
                if (a === 'open') { if (n) n.kind === 'folder' ? nav(n.id) : prev(n); }
                else if (a === 'edit') { if (n) prev(n, { edit: true }); }
                else if (a === 'properties') showProps();
                else if (a === 'quickaccess') {
                    const ids = Array.from(st.sel);
                    if (ids.every(id => st.quickAccess.includes(id))) st.quickAccess = st.quickAccess.filter(id => !ids.includes(id));
                    else ids.forEach(id => { if (!st.quickAccess.includes(id)) st.quickAccess.push(id); });
                    saveQuick(); renderQuick();
                }
                else if (a === 'tag') {
                    const v = await dlg({ title: 'Tag Color', label: 'Color name or hex (e.g. red, #ff0000), or "none":', value: 'red' });
                    if (!v) return;
                    if (v !== 'none' && !CSS.supports('color', v)) return stat('Not a valid color.');
                    for (const x of selNodes()) { if (v === 'none') delete x.tag; else x.tag = v; await put(x); }
                    await refresh();
                }
                else if (a === 'copy') setClip('copy');
                else if (a === 'cut') setClip('cut');
                else if (a === 'paste') await pasteItems();
                else if (a === 'wallpaper') {
                    if (!n) return;
                    const r = await openNode(n); if (!r) return;
                    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(r.blob); });
                    $('#app').style.backgroundImage = `url("${url}")`; $('#app').classList.add('wp');
                    if (!ls.set('rd_wallpaper', url)) stat('Wallpaper applied, but it is too large to remember after reload.');
                }
                else if (a === 'img_edit') { if (n) { const r = await openNode(n); if (r) openImgEditor(n, r.blob, r.pwd); } }
                else if (act[a]) act[a]();
            } catch (err) { console.error(err); stat('Error: ' + err.message); }
        });

        $('#listheader').onclick = e => {
            const c = e.target.closest('.col');
            if (c && c.dataset.sort) { sCol === c.dataset.sort ? sAsc = !sAsc : (sCol = c.dataset.sort, sAsc = true); render(); }
        };

        $('#searchInput').oninput = e => { sQuery = e.target.value; clearTimeout(searchT); searchT = setTimeout(refresh, 150); };

        $('#listbody').onclick = e => {
            const r = e.target.closest('.row');
            if (!r) { st.sel.clear(); selChanged(); return; }
            const id = r.dataset.id;
            if (e.ctrlKey || e.metaKey) st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id);
            else st.sel = new Set([id]);
            selChanged();
        };
        $('#listbody').ondblclick = e => {
            const r = e.target.closest('.row'); if (!r) return;
            const n = st.items.find(i => i.id === r.dataset.id);
            if (n) n.kind === 'folder' ? nav(n.id) : prev(n);
        };
        $('#quick-list').onclick = e => {
            const el = e.target.closest('.quick-item'); if (!el) return;
            node(el.dataset.id).then(n => { if (n) n.kind === 'folder' ? nav(n.id) : (n.parentId === TRASH ? stat('That file is in the Trash.') : prev(n)); });
        };
        $('#crumbs').onclick = e => { const cr = e.target.closest('.cr'); if (cr) nav(cr.dataset.id); };

        // internal drag & drop (move)
        $('#listbody').ondragstart = e => {
            const r = e.target.closest('.row');
            if (!r || st.cwd === TRASH) return e.preventDefault();
            dragIds = st.sel.has(r.dataset.id) ? Array.from(st.sel) : [r.dataset.id];
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragIds.join(','));
        };
        const clearOver = () => document.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
        $('#listbody').ondragend = () => { dragIds = null; clearOver(); };
        $('#listbody').ondragover = e => {
            if (!dragIds) return;
            const r = e.target.closest('.row');
            const n = r && st.items.find(i => i.id === r.dataset.id);
            if (!n || n.kind !== 'folder' || dragIds.includes(n.id)) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            clearOver(); r.classList.add('drag-over');
        };
        $('#listbody').ondrop = async e => {
            if (!dragIds) return;
            const ids = dragIds; dragIds = null; clearOver();
            const r = e.target.closest('.row');
            const n = r && st.items.find(i => i.id === r.dataset.id);
            if (n && n.kind === 'folder' && !ids.includes(n.id)) { e.preventDefault(); e.stopPropagation(); await moveIds(ids, n.id); }
        };
        $('#crumbs').ondragover = e => {
            const cr = e.target.closest('.cr');
            if (!dragIds || !cr) return;
            e.preventDefault(); clearOver(); cr.classList.add('drag-over');
        };
        $('#crumbs').ondragleave = clearOver;
        $('#crumbs').ondrop = async e => {
            const cr = e.target.closest('.cr');
            if (!dragIds || !cr) return;
            e.preventDefault(); const ids = dragIds; dragIds = null; clearOver();
            await moveIds(ids, cr.dataset.id);
        };

        // external files dropped from the OS
        ['dragenter', 'dragover'].forEach(v => $('#listbody').addEventListener(v, e => {
            if (dragIds) return; e.preventDefault(); $('#listbody').classList.add('drag');
        }));
        ['dragleave', 'dragend'].forEach(v => $('#listbody').addEventListener(v, e => {
            if (v === 'dragleave' && $('#listbody').contains(e.relatedTarget)) return;
            $('#listbody').classList.remove('drag');
        }));
        $('#listbody').addEventListener('drop', e => {
            if (dragIds) return;
            e.preventDefault(); $('#listbody').classList.remove('drag');
            // everything that touches the DataTransfer must happen synchronously, before the first await
            const dt = e.dataTransfer, files = Array.from(dt.files);
            const entries = dt.items && dt.items.length && dt.items[0].webkitGetAsEntry
                ? Array.from(dt.items).filter(i => i.kind === 'file').map(i => i.webkitGetAsEntry()).filter(Boolean) : [];
            (async () => {
                let items = [];
                if (entries.length) {
                    stat('Reading dropped items…');
                    for (const en of entries) await walkEntry(en, [], items);
                } else items = files.map(f => ({ dirs: [], file: f }));
                await importItems(items, items.failed || 0);
            })().catch(err => stat('Drop failed: ' + err.message));
        });
        window.ondragover = e => e.preventDefault();
        window.ondrop = e => e.preventDefault();

        $('#modalClose').onclick = $('#modalOk').onclick = closePreview;
        $('#dlgOk').onclick = () => { const i = $('#dlgInput'); dlgCl(i ? (i.value.trim() || null) : true); };
        $('#dlgCancel').onclick = $('#dlgX').onclick = () => dlgCl(null);
        $('#dlg').addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#dlgOk').click(); }
        });

        $('#fileInput').onchange = e => { const fs = Array.from(e.target.files); e.target.value = ''; imp(fs); };
        $('#folderInput').onchange = e => {
            const fs = Array.from(e.target.files); e.target.value = '';
            importItems(fs.map(f => ({ dirs: (f.webkitRelativePath || '').split('/').slice(0, -1), file: f })));
        };

        $('#zipInput').onchange = async e => {
            const f = e.target.files[0]; e.target.value = '';
            if (!f || busy || !canWrite()) return;
            if (typeof fflate === 'undefined') return stat('ZIP library failed to load.');
            busy = true;
            try {
                stat('Reading ZIP…');
                const un = fflate.unzipSync(new Uint8Array(await f.arrayBuffer()));
                const resolve = dirResolver(st.cwd);
                let cnt = 0;
                for (const [name, data] of Object.entries(un)) {
                    if (name.startsWith('__MACOSX/')) continue;
                    const parts = name.split('/').filter(p => p && p !== '.' && p !== '..').map(clean).filter(Boolean);
                    if (!parts.length) continue;
                    const isDir = name.endsWith('/');
                    const fileName = isDir ? null : parts.pop();
                    const parent = await resolve(parts);
                    if (!isDir) { await add(new File([data], fileName), parent, null); stat(`Extracting… ${++cnt} file(s)`); }
                }
                stat(`ZIP extracted (${cnt} files).`);
            } catch (err) { console.error(err); stat('ZIP error: ' + err.message); }
            finally { busy = false; await refresh(); }
        };

        $('#sbDelete').onclick = act.delete;
        $('#sbDownload').onclick = act.download;
        $('#sbDownloadZip').onclick = act.downloadzip;
        $('#sbPreview').onclick = () => { const n = selNodes()[0]; if (n) prev(n); };
        $('#btnEmptyTrash').onclick = act.empty_trash;

        $('#aboutClose').onclick = $('#aboutOk').onclick = () => { $('#about-modal').hidden = true; };
        $('#aboutTabs').onclick = e => { const b = e.target.closest('.about-tab'); if (b) showAbout(b.dataset.tab); };
        $('#propClose').onclick = $('#propOk').onclick = () => { $('#prop-modal').hidden = true; };
        $('#imgClose').onclick = closeImgEditor;
        $('#webrtcClose').onclick = $('#webrtcOk').onclick = () => { $('#webrtc-modal').hidden = true; };

        $('#webrtcGenerate').onclick = async () => {
            try {
                newPC(); setupChannel(pc.createDataChannel('file'));
                await pc.setLocalDescription(await pc.createOffer());
                rtcStatus('Gathering network info…'); await waitIce(pc);
                $('#webrtcOutput').value = JSON.stringify(pc.localDescription);
                rtcStatus('Offer ready. Send it to the receiver, then paste their answer above and press "Apply Answer".');
            } catch (e) { rtcStatus('WebRTC error: ' + e.message); }
        };
        $('#webrtcAccept').onclick = async () => {
            const offerSdp = parseSDP(); if (!offerSdp) return;
            try {
                newPC();
                await pc.setRemoteDescription(offerSdp);
                await pc.setLocalDescription(await pc.createAnswer());
                rtcStatus('Gathering network info…'); await waitIce(pc);
                $('#webrtcOutput').value = JSON.stringify(pc.localDescription);
                rtcStatus('Answer ready. Send it back to the host.');
            } catch (e) { rtcStatus('WebRTC error: ' + e.message); }
        };
        $('#webrtcApply').onclick = async () => {
            const ans = parseSDP(); if (!ans) return;
            if (!pc) return rtcStatus('Generate an offer first.');
            try { await pc.setRemoteDescription(ans); rtcStatus('Connecting…'); } catch (e) { rtcStatus('WebRTC error: ' + e.message); }
        };
        $('#webrtcSend').onclick = async () => {
            if (!dc || dc.readyState !== 'open') return rtcStatus('Not connected yet.');
            const fs = selNodes().filter(i => i.kind === 'file');
            if (!fs.length) return rtcStatus('Select one or more files in the main window first.');
            for (const n of fs) {
                const r = await openNode(n); if (!r) continue;
                const b = r.blob;
                dc.send(JSON.stringify({ t: 'file', name: n.name, mime: n.mime, size: b.size }));
                for (let o = 0; o < b.size; o += 16384) {
                    while (dc.bufferedAmount > 1048576) await sleep(20);
                    dc.send(await b.slice(o, o + 16384).arrayBuffer());
                    if ((o / 16384) % 64 === 0) rtcStatus(`Sending ${n.name}: ${Math.round(o / b.size * 100)}%`);
                }
                dc.send(JSON.stringify({ t: 'end' }));
                rtcStatus('Sent ' + n.name);
            }
        };

        $('#stegClose').onclick = $('#stegOk').onclick = () => { $('#steg-modal').hidden = true; };
        $('#stegHide').onclick = async () => {
            const file = $('#stegImg').files[0], text = $('#stegText').value;
            if (!file || !text) return alert('Select an image and enter text.');
            if (!canWrite()) return;
            try {
                const { c, ctx, id } = await loadPixels(file), d = id.data;
                for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return alert('This image has transparent pixels, which cannot hold hidden data reliably. Use an opaque PNG.');
                const body = new TextEncoder().encode(text), len = body.length;
                const bytes = new Uint8Array(8 + len);
                bytes.set(STEG_MAGIC, 0);
                bytes.set([(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255], 4);
                bytes.set(body, 8);
                const bits = bytes.length * 8;
                if (bits > Math.floor(d.length / 4) * 3) return alert('Text too long for this image.');
                for (let k = 0; k < bits; k++) {
                    const bit = (bytes[k >> 3] >> (7 - (k & 7))) & 1, i = lsbIdx(k);
                    d[i] = (d[i] & 0xFE) | bit;
                }
                ctx.putImageData(id, 0, 0);
                c.toBlob(async b => {
                    if (!b) return alert('Could not create image.');
                    try {
                        await add(new File([b], 'secret_' + file.name.replace(/\.[^.]*$/, '') + '.png', { type: 'image/png' }), st.cwd, null);
                        await refresh(); alert('Image saved with hidden text.');
                    } catch (e) { alert('Save failed: ' + e.message); }
                }, 'image/png');
            } catch (e) { alert('Could not read that image: ' + e.message); }
        };
        $('#stegExtract').onclick = async () => {
            const file = $('#stegImg').files[0];
            if (!file) return alert('Select an image.');
            try {
                const d = (await loadPixels(file)).id.data, cap = Math.floor(d.length / 4) * 3;
                const readByte = k0 => { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | (d[lsbIdx(k0 + j)] & 1); return v; };
                if (cap < 64 || STEG_MAGIC.some((m, i) => readByte(i * 8) !== m)) return alert('No hidden text found in this image.');
                let len = 0; for (let i = 4; i < 8; i++) len = len * 256 + readByte(i * 8);
                if (len * 8 + 64 > cap) return alert('Hidden data looks corrupted.');
                const out = new Uint8Array(len);
                for (let i = 0; i < len; i++) out[i] = readByte((8 + i) * 8);
                alert('Extracted Text:\n' + new TextDecoder().decode(out));
            } catch (e) { alert('Could not read that image: ' + e.message); }
        };

        $('#dupClose').onclick = $('#dupOk').onclick = () => { $('#dup-modal').hidden = true; };
        $('#dupClean').onclick = async () => {
            const chks = Array.from(document.querySelectorAll('.dup-chk:checked'));
            if (!chks.length) return;
            const total = {}, checked = {};
            document.querySelectorAll('.dup-chk').forEach(c => { total[c.dataset.g] = (total[c.dataset.g] || 0) + 1; });
            chks.forEach(c => { checked[c.dataset.g] = (checked[c.dataset.g] || 0) + 1; });
            if (Object.keys(checked).some(g => checked[g] >= total[g])) return alert('Keep at least one copy in every group.');
            for (const c of chks) await moveToTrash(c.value);
            $('#dup-modal').hidden = true;
            await refresh(); stat(`${chks.length} duplicate(s) moved to Trash.`);
        };

        document.addEventListener('keydown', async e => {
            if (e.key === 'Escape') {
                if (!$('#dlg').hidden) { dlgCl(null); return; }
                for (const [id, fn] of [['#about-modal', () => { $('#about-modal').hidden = true; }], ['#img-editor-modal', closeImgEditor], ['#modal', closePreview], ['#prop-modal', () => { $('#prop-modal').hidden = true; }], ['#webrtc-modal', () => { $('#webrtc-modal').hidden = true; }], ['#steg-modal', () => { $('#steg-modal').hidden = true; }], ['#dup-modal', () => { $('#dup-modal').hidden = true; }]]) {
                    if (!$(id).hidden) { fn(); return; }
                }
                $('#ctx-menu').style.display = 'none';
                return;
            }
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || anyModal()) return;
            if (e.ctrlKey || e.metaKey) {
                const k = e.key.toLowerCase();
                if (k === 'c') setClip('copy');
                else if (k === 'x') setClip('cut');
                else if (k === 'v') { e.preventDefault(); await pasteItems(); }
                else if (k === 'a') { e.preventDefault(); st.sel = new Set(st.items.map(i => i.id)); selChanged(); }
            } else if (e.key === 'Delete') act.delete();
            else if (e.key === 'F2') act.rename();
        });

        window.addEventListener('beforeunload', e => { if (busy) { e.preventDefault(); e.returnValue = ''; } });
    };

    // ---------- performance widget ----------
    const initPerfWidget = () => {
        const memBtn = $('#btn-mem'), diskBtn = $('#btn-disk'), memBox = $('#mem-chart'), diskBox = $('#disk-chart');
        let active = null;
        const closeAll = () => { memBox.classList.add('hidden'); diskBox.classList.add('hidden'); active = null; };
        const toggle = (name, box) => () => {
            if (active === name) return closeAll();
            const openIt = () => { box.classList.remove('hidden'); active = name; };
            if (active) { closeAll(); setTimeout(openIt, 250); } else openIt();
        };
        memBtn.onclick = toggle('mem', memBox);
        diskBtn.onclick = toggle('disk', diskBox);

        const memCanvas = $('#mem-canvas'), diskCanvas = $('#disk-canvas');
        const memCtx = memCanvas.getContext('2d'), diskCtx = diskCanvas.getContext('2d');
        const w = 320, h = 140;
        memCanvas.width = diskCanvas.width = w; memCanvas.height = diskCanvas.height = h;
        const memData = new Array(50).fill(0), diskData = new Array(50).fill(0);
        const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

        const draw = (ctx, data, color) => {
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = css('--chart-grid'); ctx.fillStyle = css('--chart-text');
            ctx.font = '10px Tahoma'; ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = i * (h / 4);
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                ctx.fillText((100 - i * 25) + '%', 5, y + 11);
            }
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
            data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = h - v * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.stroke();
            ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
            ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = color; ctx.fill(); ctx.restore();
        };
        const stats4 = (data, prefix) => {
            $(`#${prefix}-peak`).textContent = pct(Math.max(...data));
            $(`#${prefix}-avg`).textContent = pct(data.reduce((a, b) => a + b, 0) / data.length);
        };

        setInterval(() => {
            if (!memBox.classList.contains('hidden')) {
                if (performance.memory) {
                    const lim = performance.memory.jsHeapSizeLimit, used = performance.memory.usedJSHeapSize, f = used / lim;
                    memData.push(f); memData.shift();
                    $('#mem-current-label').textContent = pct(f);
                    $('#mem-used').textContent = fmtSz(used); $('#mem-limit').textContent = fmtSz(lim);
                    stats4(memData, 'mem');
                } else {
                    $('#mem-current-label').textContent = 'N/A';
                    ['used', 'limit', 'peak', 'avg'].forEach(k => { $('#mem-' + k).textContent = 'N/A'; });
                }
                draw(memCtx, memData, css('--chart-line-mem'));
            }
            if (!diskBox.classList.contains('hidden') && navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(est => {
                    if (!est.quota) return;
                    const f = est.usage / est.quota;
                    diskData.push(f); diskData.shift();
                    $('#disk-current-label').textContent = pct(f);
                    $('#disk-used').textContent = fmtSz(est.usage); $('#disk-quota').textContent = fmtSz(est.quota);
                    stats4(diskData, 'disk');
                    draw(diskCtx, diskData, css('--chart-line-disk'));
                }).catch(() => { });
            }
        }, 1000);
    };

    // ---------- startup ----------
    document.body.dataset.theme = ls.get('rd_theme', 'default');
    st.isGrid = ls.get('rd_grid') === '1';
    try { st.quickAccess = JSON.parse(ls.get('rd_quick', '[]')) || []; } catch (e) { st.quickAccess = []; }
    const wp = ls.get('rd_wallpaper');
    if (wp) { $('#app').style.backgroundImage = `url("${wp}")`; $('#app').classList.add('wp'); }

    window.addEventListener('unhandledrejection', e => { console.error(e.reason); stat('Error: ' + ((e.reason && e.reason.message) || e.reason)); });
    window.addEventListener('error', e => { stat('Error: ' + e.message); });

    bind();
    initPerfWidget();

    try {
        await mountStorage();
        if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (e) { } }
        db = await open();
        db.onversionchange = () => db.close();
        await refresh();

        $('#backendBadge').textContent = 'Backend: ' + activeBackend;
        $('#backendBadge').style.background = activeBackend === 'OPFS' ? '#d4edda' : '#fff3cd';
        stat(!subtleOK() ? 'Ready. Warning: not a secure context (use HTTPS or localhost) — encryption and integrity checks are unavailable.'
            : activeBackend === 'OPFS' ? 'Ready. (OPFS mounted)' : 'Ready. (IndexedDB fallback active)');
    } catch (e) {
        console.error(e);
        $('#listbody').innerHTML = '<div class="empty">Critical Error: Failed to mount storage. ' + esc(e.message) + '</div>';
        stat('Error mounting storage.');
    }
})();
