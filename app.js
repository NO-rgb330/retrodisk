(async function () {
    'use strict';

    // =========================================================================
    // Browser & capability detection
    // =========================================================================
    const detectBrowser = () => {
        const ua = navigator.userAgent || '';
        let name = 'Unknown', engine = 'Unknown', os = 'Unknown';
        if (/Firefox\/(\d+)/.test(ua)) name = 'Firefox';
        else if (/Edg\//.test(ua)) name = 'Edge';
        else if (/OPR\/|Opera/.test(ua)) name = 'Opera';
        else if (/Chrome\//.test(ua)) name = 'Chrome';
        else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) name = 'Safari';
        if (/Gecko\//.test(ua) && /Firefox\//.test(ua)) engine = 'Gecko';
        else if (/AppleWebKit\//.test(ua) && /Chrome\//.test(ua)) engine = 'Blink';
        else if (/AppleWebKit\//.test(ua)) engine = 'WebKit';
        else if (/Trident\//.test(ua)) engine = 'Trident';
        if (/Windows/.test(ua)) os = 'Windows';
        else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
        else if (/Android/.test(ua)) os = 'Android';
        else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
        else if (/Linux/.test(ua)) os = 'Linux';
        return { name, engine, os, ua };
    };

    const BROWSER_THEMES = { Chrome: 'default', Firefox: 'win98', Safari: 'mac', Edge: 'dark', Opera: 'dark', Unknown: 'default' };
    const BROWSER_LABELS = { Chrome: 'Chrome', Firefox: 'Firefox', Safari: 'Safari', Edge: 'Edge', Opera: 'Opera', Unknown: 'Browser' };
    const THEME_KEY = 'rd9_theme';
    const browserInfo = detectBrowser();

    // =========================================================================
    // Core Helpers (Defined early to prevent hoisting issues)
    // =========================================================================
    const $ = s => document.querySelector(s);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const yieldUI = () => new Promise(r => setTimeout(r, 0));

    const getCapabilities = () => ({
        opfs: !!(navigator.storage && navigator.storage.getDirectory),
        webCrypto: !!(window.crypto && window.crypto.subtle),
        compression: typeof CompressionStream !== 'undefined',
        decompression: typeof DecompressionStream !== 'undefined',
        workers: typeof Worker !== 'undefined',
        localStorage: (() => { try { localStorage.setItem('__rd_t', '1'); localStorage.removeItem('__rd_t'); return true; } catch (e) { return false; } })(),
        fullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
        webrtc: typeof RTCPeerConnection !== 'undefined',
        storageEstimate: !!(navigator.storage && navigator.storage.estimate),
        indexedDB: !!window.indexedDB,
        secureContext: window.isSecureContext,
        chacha: !!(crypto.subtle && crypto.subtle.encrypt && crypto.subtle.encrypt({ name: 'ChaCha20-Poly1305' }, { name: 'ChaCha20-Poly1305' }, new Uint8Array(0)).catch(() => true))
    });

    // =========================================================================
    // DIALOGS & SYSTEM INFO (Defined BEFORE bind)
    // =========================================================================
    function showCompatInfo() {
        const modal = $('#compat-modal'), body = $('#compatBody');
        if (!modal || !body) return;
        const c = getCapabilities(), b = browserInfo;
        const rows = [
            ['Browser', b.name], ['Engine', b.engine], ['OS', b.os], ['Secure Context', c.secureContext ? 'Yes' : 'No'],
            ['OPFS', c.opfs ? 'Supported' : 'Not available'], ['IndexedDB', c.indexedDB ? 'Supported' : 'Not available'],
            ['Web Crypto', c.webCrypto ? 'Supported' : 'Not available'], ['CompressionStream', c.compression ? 'Supported' : 'Not available'],
            ['Web Workers', c.workers ? 'Supported' : 'Not available'], ['LocalStorage', c.localStorage ? 'Available' : 'Blocked'],
            ['Active Backend', activeBackend || 'Detecting…'], ['Worker Status', wkrOK ? 'Running' : 'Main thread fallback'],
            ['Default Theme', BROWSER_THEMES[b.name] || 'default'],
            ['ChaCha20-Poly1305', c.chacha ? 'Supported' : 'Not available']
        ];
        body.innerHTML = '<table class="prop-table">' + rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') + `</table>`;
        modal.hidden = false;
    }

    // =========================================================================
    // Constants & State
    // =========================================================================
    const DB = 'rd8', V = 1, N = 'n', R = 'r', O = 'opf8', C = 20 * 1024 * 1024, L = 5 * 60 * 1000; // 20 MB chunks
    let db, opf = null, wkr = null, wkrOK = false;
    let st = { cwd: R, items: [], sel: new Set(), path: [], unlocked: new Set(), isGrid: false, hiddenVolume: false, quickAccess: [] };
    let EST = { usage: 0, quota: 0 }, purls = [], dlgRes = null, dragId = null, sCol = 'name', sAsc = true, sQuery = '', lockT, activeBackend = 'none', webrtcPC = null;

    const dirCache = new Map(); 

    const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const tx = t => new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });

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

    const hashPwd = async p => {
        if (!crypto.subtle) return btoa(p);
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
        return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const hashBlob = async b => {
        if (!crypto.subtle) return 'unavailable';
        const buf = await crypto.subtle.digest('SHA-256', await b.arrayBuffer());
        return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const applyTheme = (theme, persist) => {
        document.body.dataset.theme = theme;
        if (persist !== false) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { } }
    };

    const initTheme = () => {
        let saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (e) { }
        const def = BROWSER_THEMES[browserInfo.name] || 'default';
        applyTheme(saved || def, false);
    };

    // =========================================================================
    // CUSTOM RETRO CURSOR LOGIC
    // =========================================================================
    const initCursor = () => {
        const cursor = $('#custom-cursor');
        if (!cursor) return;
        
        const updatePos = (x, y) => {
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
        };
        
        window.addEventListener('mousemove', e => updatePos(e.clientX, e.clientY));
        
        window.addEventListener('mousedown', () => {
            cursor.classList.add('clicking');
        });
        
        window.addEventListener('mouseup', () => {
            cursor.classList.remove('clicking');
        });
        
        window.addEventListener('mouseover', e => {
            const isInteractive = e.target.closest('button, .btn, .row, .mi, .cr, .quick-item, input, select, textarea, .col[data-sort], .winbtns button');
            if (isInteractive) cursor.classList.add('pointer');
            else cursor.classList.remove('pointer');
        });
    };

    // =========================================================================
    // Worker logic (ULTRA-FAST OPFS)
    // =========================================================================
    const processChunkLocal = async ({ chunk, compress, password, salt, algorithm, kdf }) => {
        let buf = chunk;
        if (compress && window.brotliWasm) {
            buf = await window.brotliWasm.compress(new Uint8Array(buf));
        } else if (compress) {
            const cs = new CompressionStream('gzip');
            buf = await new Response(new Blob([buf]).stream().pipeThrough(cs)).arrayBuffer();
        }
        let encryptedBuf = buf;
        if (password) {
            if (!crypto.subtle) throw new Error('Web Crypto is unavailable.');
            const keyBytes = await deriveKey(password, salt, kdf, algorithm);
            const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: algorithm }, false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            encryptedBuf = await crypto.subtle.encrypt({ name: algorithm, iv }, cryptoKey, buf);
            return { ok: true, buf: encryptedBuf, iv: Array.from(iv), algorithm, kdf, compressed: compress };
        }
        return { ok: true, buf: encryptedBuf, iv: null, algorithm: null, kdf: null, compressed: compress };
    };

    const deriveKey = async (password, salt, kdf, algorithm) => {
        if (kdf === 'argon2id' && typeof argon2 !== 'undefined') {
            const result = await argon2.hash({
                pass: password, salt: salt, time: 3, mem: 65536, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id
            });
            return result.hash;
        } else {
            const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
            const key = await crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: salt, iterations: 600000, hash: 'SHA-256' },
                baseKey, { name: algorithm, length: 256 }, true, ['encrypt', 'decrypt']
            );
            return await crypto.subtle.exportKey('raw', key);
        }
    };

    const initWorker = async () => {
        if (typeof Worker === 'undefined') { wkrOK = false; return; }
        try { wkr = new Worker('worker.js'); } catch (e) { wkrOK = false; wkr = null; return; }
        
        wkrOK = await new Promise(res => {
            let done = false;
            const finish = v => { if (done) return; done = true; clearTimeout(to); wkr.removeEventListener('message', onMsg); wkr.removeEventListener('error', onErr); res(v); };
            const to = setTimeout(() => finish(false), 1500);
            const onMsg = () => finish(true);
            const onErr = () => finish(false);
            wkr.addEventListener('message', onMsg);
            wkr.addEventListener('error', onErr);
            try { wkr.postMessage({ action: 'ping' }); } catch (e) { finish(false); }
        });

        if (!wkrOK) {
            try { wkr.terminate(); } catch (e) { }
            wkr = null;
            console.info('Worker.js not usable; running in main thread.');
            return;
        }
        wkr.onerror = () => { wkrOK = false; };

        if (activeBackend === 'OPFS' && opf) {
            try {
                const dirHandle = await opf.getDirectoryHandle(O, { create: true });
                wkr.postMessage({ action: 'init', opfDir: dirHandle });
            } catch (e) { }
        }
    };

    const processChunk = (data) => new Promise((res, rej) => {
        if (!wkrOK || !wkr) { processChunkLocal(data).then(res).catch(rej); return; }
        wkr.onmessage = e => { 
            if (e.data && e.data.ok) res(e.data); 
            else rej(new Error((e.data && e.data.error) || 'Worker failed')); 
        };
        try { wkr.postMessage({ action: 'process', ...data }); } 
        catch (e) { wkr.onmessage = null; processChunkLocal(data).then(res).catch(rej); }
    });

    // =========================================================================
    // File System & Data abstractions
    // =========================================================================
    const EX = {
        image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff', 'avif'],
        video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'mpg', 'mpeg', 'm4v', '3gp'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi', 'opus'],
        text: ['txt', 'md', 'markdown', 'log', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'ini', 'cfg', 'conf', 'yml', 'yaml', 'toml', 'srt', 'vtt', 'tex', 'rtf', 'sql', 'sh', 'bat', 'ps1', 'py', 'rb', 'php', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt'],
        exe: ['exe', 'msi', 'bat', 'cmd', 'com', 'app', 'bin', 'dll', 'apk', 'deb', 'rpm', 'dmg', 'sh'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'cab'],
        pdf: ['pdf'], doc: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'rtf', 'epub']
    };
    const CL = { image: '#4a9bd6', video: '#d05a5a', audio: '#9a6fd0', text: '#5fa347', exe: '#c07a1e', archive: '#8a7a5a', pdf: '#c04a3a', doc: '#3a76ae', other: '#9aa5b1' };

    const cat = n => {
        if (n.kind === 'folder') return { cat: 'folder', label: 'Folder' };
        const e = n.name.split('.').pop().toLowerCase();
        for (const c in EX) if (EX[c].includes(e)) return { cat: c, label: e.toUpperCase() + ' File' };
        return { cat: 'other', label: e ? e.toUpperCase() + ' File' : 'File' };
    };

    const IF = (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16"><path d="M1.5 3.5h4.2l1.3 1.6h7.5v7.4a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5z" fill="#f0c060" stroke="#a67c1e"/><path d="M1.5 5.7h13" stroke="#fff" stroke-opacity=".55"/></svg>`;
    const IL = '<svg width="10" height="10" viewBox="0 0 16 16" style="margin-left:4px" fill="#b03a2a"><path d="M8 1a4 4 0 0 0-4 4v2H3v8h10V7h-1V5a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v2H6V5z"/></svg>';
    const DI = (c, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16"><path d="M3.5 1.5h5.7l3.3 3.3v9.7h-9z" fill="#fff" stroke="#8d9aa8"/><path d="M9.2 1.5v3.3h3.3" fill="#eef2f6" stroke="#8d9aa8"/><rect x="4.6" y="7.3" width="6.8" height="4.8" rx="1" fill="${c}"/></svg>`;

    const icon = (n, s = 16) => {
        let b = n.thumb && !n.pwdHash ? `<img src="${n.thumb}">` : (n.kind === 'folder' ? IF(s) : DI(CL[cat(n).cat] || CL.other, s));
        if (n.pwdHash) b = `<div style="display:flex;align-items:center;">${b}${IL}</div>`;
        if (n.tag) b += `<div class="tag-dot" style="background:${n.tag};"></div>`;
        return b;
    };

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
    const node = id => id === R ? Promise.resolve({ id: R, name: 'My Disk', kind: 'folder', parentId: null }) : req(sto(N).get(id));

    const getSiblings = async (pid) => {
        if (dirCache.has(pid)) return dirCache.get(pid);
        const arr = await list(pid);
        const map = new Map();
        arr.forEach(n => map.set(n.name.toLowerCase(), n.id));
        dirCache.set(pid, map);
        return map;
    };

    const uniq = async (n, pid, ex) => {
        const s = await getSiblings(pid), t = new Set(s.keys());
        if (!t.has(n.toLowerCase())) return n;
        const d = n.lastIndexOf('.'), b = d > 0 ? n.slice(0, d) : n, e = d > 0 ? n.slice(d) : '';
        let i = 2, c; do { c = `${b} (${i})${e}`; i++; } while (t.has(c.toLowerCase()));
        return c;
    };

    const getFhOPFS = async (id, cr) => {
        const d = await opf.getDirectoryHandle(O, { create: true });
        return d.getFileHandle(id, { create: !!cr });
    };

    const mountStorage = async () => {
        try {
            if (navigator.storage && navigator.storage.getDirectory) {
                opf = await navigator.storage.getDirectory();
                const testFh = await opf.getDirectoryHandle(O, { create: true });
                await testFh.getFileHandle('test', { create: true });
                await testFh.removeEntry('test');
                activeBackend = 'OPFS';
                return true;
            }
        } catch (e) { opf = null; }
        activeBackend = 'IndexedDB';
        return true;
    };

    const writeBlob = async (id, data) => {
        if (activeBackend === 'OPFS') {
            const fh = await getFhOPFS(id, true);
            const w = await fh.createWritable(); await w.write(data); await w.close();
        } else {
            const t = db.transaction('blobs', 'readwrite');
            t.objectStore('blobs').put({ id, data });
            await tx(t);
        }
    };

    const readBlob = async (id) => {
        if (activeBackend === 'OPFS') {
            try { return await (await getFhOPFS(id, false)).getFile(); } catch (e) { return null; }
        } else {
            const rec = await req(sto('blobs').get(id)); return rec ? rec.data : null;
        }
    };

    const deleteBlob = async (id) => {
        if (activeBackend === 'OPFS') {
            try { await (await opf.getDirectoryHandle(O)).removeEntry(id); } catch (e) { }
        } else {
            const t = db.transaction('blobs', 'readwrite');
            t.objectStore('blobs').delete(id);
            await tx(t);
        }
    };

    const proc = async (file, pwd, algorithm, kdf) => {
        const tot = Math.ceil(file.size / C);
        const comp = file.size < 100 * 1024 * 1024 && (file.type.startsWith('text/') || file.type === 'application/json');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const cs = [], ivs = [], id = uid();

        let writ = null;
        let chunks = [];
        let currentOffset = 0;

        for (let i = 0; i < tot; i++) {
            const c = await file.slice(i * C, Math.min((i + 1) * C, file.size)).arrayBuffer();
            const res = await processChunk({
                chunk: c, compress: comp, password: pwd, salt: salt, algorithm: algorithm, kdf: kdf,
                fileId: id, offset: currentOffset
            });

            if (res.syncWritten) {
                cs.push(res.size);
                currentOffset += res.size;
            } else {
                cs.push(res.buf.byteLength);
                if (activeBackend === 'OPFS') {
                    if (!writ) writ = await (await getFhOPFS(id, true)).createWritable({ keepExistingData: true });
                    await writ.seek(currentOffset);
                    await writ.write(new Uint8Array(res.buf));
                } else {
                    chunks.push(new Uint8Array(res.buf));
                }
                currentOffset += res.buf.byteLength;
            }
            if (res.iv) ivs.push(res.iv);
        }
        if (writ) await writ.close();
        else if (chunks.length > 0) await writeBlob(id, new Blob(chunks));
        return { id, salt: Array.from(salt), ivs, cs, comp, enc: !!pwd, algorithm, kdf };
    };

    const thumb = async (f, t) => {
        if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return null;
        return new Promise(res => {
            const e = document.createElement(t === 'video' ? 'video' : 'img'), u = URL.createObjectURL(f);
            e.onloadeddata = e.onload = () => {
                const c = document.createElement('canvas'); c.width = c.height = 48;
                const x = c.getContext('2d'), s = Math.min(48 / e.width, 48 / e.height);
                x.drawImage(e, (48 - e.width * s) / 2, (48 - e.height * s) / 2, e.width * s, e.height * s);
                URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .6));
            };
            e.onerror = () => { URL.revokeObjectURL(u); res(null); };
            if (t === 'video') { e.src = u; e.currentTime = 1; } else e.src = u;
        });
    };

    const add = async (f, pid, pwd, algorithm = 'AES-GCM', kdf = 'pbkdf2', bulk = false) => {
        const id = uid(), n = await uniq(f.name || 'untitled', pid);
        
        const th = (pwd || bulk) ? null : await thumb(f, f.type.startsWith('video/') ? 'video' : 'image');
        
        const m = await proc(f, pwd, algorithm, kdf);
        const nd = {
            id: m.id, parentId: pid, name: n, kind: 'file', mime: f.type || 'application/octet-stream',
            size: f.size, compSize: m.cs.reduce((a, b) => a + b, 0), compressed: m.comp,
            encrypted: m.enc, salt: m.salt, ivs: m.ivs, chunkSizes: m.cs, pwdHash: pwd || null,
            thumb: th, hash: await hashBlob(f), created: Date.now(), modified: f.lastModified || Date.now(),
            algorithm: m.algorithm, kdf: m.kdf
        };
        await req(sto(N, 'readwrite').add(nd));
        
        const siblings = await getSiblings(pid);
        siblings.set(n.toLowerCase(), nd.id);
        
        return nd;
    };

    const getBlob = async (nd, pwd) => {
        try {
            let raw = await readBlob(nd.id);
            if (!raw) return null;
            let off = 0, ch = [];
            const algorithm = nd.algorithm || 'AES-GCM';
            const kdf = nd.kdf || 'pbkdf2';
            
            let key = null;
            if (nd.encrypted) {
                const keyBytes = await deriveKey(pwd, new Uint8Array(nd.salt), kdf, algorithm);
                key = await crypto.subtle.importKey('raw', keyBytes, { name: algorithm }, false, ['decrypt']);
            }

            for (let i = 0; i < nd.chunkSizes.length; i++) {
                const sl = raw.slice(off, off + nd.chunkSizes[i]); off += nd.chunkSizes[i];
                let b = await sl.arrayBuffer();
                if (nd.encrypted) {
                    b = await crypto.subtle.decrypt({ name: algorithm, iv: new Uint8Array(nd.ivs[i]) }, key, b);
                }
                if (nd.compressed) {
                    if (window.brotliWasm) {
                        b = await window.brotliWasm.decompress(new Uint8Array(b));
                    } else {
                        const ds = new DecompressionStream('gzip');
                        b = await new Response(new Blob([b]).stream().pipeThrough(ds)).arrayBuffer();
                    }
                }
                ch.push(new Uint8Array(b));
            }
            return new Blob(ch, { type: nd.mime });
        } catch (e) { console.error(e); return null; }
    };

    const del = async id => {
        const k = await list(id);
        for (const c of k) await del(c.id);
        const n = await node(id);
        if (n && n.kind === 'file') await deleteBlob(id);
        await req(sto(N, 'readwrite').delete(id));
        if (n) {
            const siblings = await getSiblings(n.parentId);
            if (siblings) siblings.delete(n.name.toLowerCase());
        }
    };

    const shredNode = async id => {
        const n = await node(id);
        if (n && n.kind === 'file') {
            for (let i = 0; i < 3; i++) {
                const rand = crypto.getRandomValues(new Uint8Array(1024 * 1024));
                await writeBlob(id, rand);
            }
            await deleteBlob(id);
        }
        await req(sto(N, 'readwrite').delete(id));
        const k = await list(id);
        for (const c of k) await shredNode(c.id);
    };

    // =========================================================================
    // UI Rendering & Interaction
    // =========================================================================
    const render = () => {
        const b = $('#listbody');
        if (!b) return;
        b.className = 'listbody ' + (st.isGrid ? 'grid' : 'list');
        const l = sQuery ? st.items.filter(n => n.name.toLowerCase().includes(sQuery.toLowerCase())) : st.items;
        l.sort((a, z) => {
            if (!sQuery && a.kind !== z.kind) return a.kind === 'folder' ? -1 : 1;
            const va = sCol === 'name' ? a.name : sCol === 'size' ? (a.size || 0) : (a.modified || 0);
            const vz = sCol === 'name' ? z.name : sCol === 'size' ? (z.size || 0) : (z.modified || 0);
            return va < vz ? (sAsc ? -1 : 1) : va > vz ? (sAsc ? 1 : -1) : 0;
        });

        document.querySelectorAll('.listheader .col').forEach(e => {
            const arrow = e.querySelector('.sort-arrow');
            if (arrow) arrow.textContent = e.dataset.sort === sCol ? (sAsc ? '▲' : '▼') : '';
        });

        if (!l.length) {
            b.innerHTML = `<div class="empty">${sQuery ? 'No results.' : 'Empty folder.'}</div>`;
            return;
        }

        b.innerHTML = l.map(it => `
            <div class="row${st.sel.has(it.id) ? ' sel' : ''}" data-id="${it.id}" draggable="true">
                <div class="col chk"><input type="checkbox" class="row-chk" ${st.sel.has(it.id) ? 'checked' : ''}></div>
                <div class="col name"><span class="ico">${icon(it, st.isGrid ? 48 : 16)}</span><span class="label">${esc(it.name)}</span></div>
                <div class="col type">${cat(it).label}</div>
                <div class="col size">${it.kind === 'folder' ? '—' : fmtSz(it.size)}</div>
                <div class="col date">${fmtDt(it.modified)}</div>
            </div>
        `).join('');
    };

    const renderQuick = () => {
        const q = $('#quick-list');
        if (!q) return;
        if (!st.quickAccess.length) { q.innerHTML = '<span style="color:#888;font-size:10px;">No pinned items.</span>'; return; }
        q.innerHTML = st.quickAccess.map(id => {
            const n = st.items.find(i => i.id === id);
            if (!n) return '';
            return `<div class="quick-item" data-id="${id}">${IF(14)} <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(n.name)}</span></div>`;
        }).join('');
        q.querySelectorAll('.quick-item').forEach(el => {
            el.onclick = () => {
                const n = st.items.find(i => i.id === el.dataset.id);
                if (n) n.kind === 'folder' ? nav(n.id) : prev(n);
            };
        });
    };

    const stats = async () => {
        const a = await req(sto(N).getAll());
        const f = a.filter(x => x.kind === 'file'), d = a.filter(x => x.kind === 'folder');
        const cb = a.reduce((x, n) => x + (n.compSize || n.size || 0), 0);
        if (navigator.storage && navigator.storage.estimate) EST = await navigator.storage.estimate();
        const q = EST.quota || 0, p = q ? Math.min(100, (cb / q) * 100) : 0;
        if ($('#meterFill')) $('#meterFill').style.width = p + '%';
        if ($('#meterFill')) $('#meterFill').style.background = p > 85 ? '#e79a8c' : p > 60 ? '#f0d27a' : '#96d873';
        if ($('#sbUsed')) $('#sbUsed').textContent = fmtSz(cb);
        if ($('#sbQuota')) $('#sbQuota').textContent = q ? fmtSz(q) : 'Unlimited';
        if ($('#sbCount')) $('#sbCount').textContent = `${f.length} files, ${d.length} folders`;
        if ($('#stItems')) $('#stItems').textContent = st.items.length + ' objects';
        renderQuick();
    };

    const side = () => {
        const n = st.items.filter(i => st.sel.has(i.id)), one = n.length === 1 ? n[0] : null;
        if ($('#sbSel')) {
            if (one) {
                const r = (one.kind === 'file' && one.size) ? Math.round((1 - (one.compSize / one.size)) * 100) : 0;
                $('#sbSel').innerHTML = `<b>${esc(one.name)}</b><br>${cat(one).label}<br>${one.kind === 'folder' ? '—' : fmtSz(one.size)}${r > 0 ? `<br><span style="color:#4c9a2a">${r}% smaller</span>` : ''}`;
            } else if (n.length > 1) {
                $('#sbSel').innerHTML = `<b>${n.length} items</b>`;
            } else {
                $('#sbSel').textContent = 'Nothing selected.';
            }
        }
        const hf = n.some(i => i.kind === 'file');
        if ($('#sbPreview')) $('#sbPreview').disabled = !(one && one.kind === 'file');
        if ($('#sbDownload')) $('#sbDownload').disabled = !hf;
        if ($('#tbDownload')) $('#tbDownload').disabled = !hf;
        if ($('#sbDownloadZip')) $('#sbDownloadZip').disabled = !hf;
        if ($('#tbDownloadZip')) $('#tbDownloadZip').disabled = !hf;
        if ($('#sbDelete')) $('#sbDelete').disabled = !n.length;
        if ($('#tbDelete')) $('#tbDelete').disabled = !n.length;
        if ($('#stSel')) $('#stSel').textContent = n.length ? n.length + ' selected' : 'None selected';
    };

    const refresh = async () => {
        if (!db) return;
        st.items = sQuery ? await req(sto(N).getAll()) : await list(st.cwd);
        st.path = await (async function walk(id) {
            if (!id || id === R) return [];
            const n = await node(id);
            return n ? [...(await walk(n.parentId)), n] : [];
        })(st.cwd);
        const ids = new Set(st.items.map(i => i.id));
        st.sel = new Set(Array.from(st.sel).filter(i => ids.has(i)));
        if ($('#crumbs')) {
            $('#crumbs').innerHTML = `<span class="cr" data-id="${R}">${st.hiddenVolume ? 'Hidden Volume' : 'My Disk'}</span>` + st.path.map(n => `<span class="sep">▸</span><span class="cr" data-id="${n.id}">${esc(n.name)}</span>`).join('');
        }
        render();
        await stats();
        side();
    };

    const stat = m => { if ($('#stMsg')) $('#stMsg').textContent = m || 'Ready'; };

    const dlg = o => new Promise(res => {
        dlgRes = res;
        if ($('#dlgTitle')) $('#dlgTitle').textContent = o.title || 'RetroDisk';
        if ($('#dlgLabel')) $('#dlgLabel').innerHTML = o.label || '';
        if ($('#dlgInputContainer')) $('#dlgInputContainer').innerHTML = o.input === false ? '' : `<input type="text" id="dlgInput" value="${o.value || ''}">`;
        if ($('#dlgHint')) { $('#dlgHint').textContent = o.hint || ''; $('#dlgHint').hidden = !o.hint; }
        if ($('#dlgOk')) $('#dlgOk').textContent = o.okText || 'OK';
        if ($('#dlg')) $('#dlg').hidden = false;
        setTimeout(() => { const inp = $('#dlgInput'); if (inp) inp.focus(); }, 20);
    });

    const dlgCl = v => {
        if ($('#dlg')) $('#dlg').hidden = true;
        if (dlgRes) { const r = dlgRes; dlgRes = null; r(v); }
    };

    const ask = nd => new Promise(res => {
        const b = document.createElement('div'); b.className = 'modal-back'; b.style.zIndex = '300';
        b.innerHTML = `
            <div class="modalwin dlgwin">
                <div class="titlebar"><div class="title"><span class="logo"></span>Password Required</div><div class="winbtns"><button class="close" id="pwc">✕</button></div></div>
                <div class="dlgbody">
                    <label>Enter password for <b>${esc(nd.name)}</b>:</label>
                    <input type="password" id="pwi">
                    <div class="hint" id="pwe" style="color:#b03a2a" hidden>Incorrect.</div>
                </div>
                <div class="dlgfoot"><button class="btn" id="pwo">OK</button><button class="btn" id="pwx">Cancel</button></div>
            </div>
        `;
        document.body.appendChild(b);
        const inp = b.querySelector('#pwi'); inp.focus();
        const cl = s => { b.remove(); res(s); };
        b.querySelector('#pwc').onclick = b.querySelector('#pwx').onclick = () => cl(false);
        b.querySelector('#pwo').onclick = async () => {
            const h = await hashPwd(inp.value);
            if (h === nd.pwdHash) cl(h);
            else { b.querySelector('#pwe').hidden = false; inp.value = ''; }
        };
    });

    const getKdfOptions = () => {
        const opts = [{ id: 'pbkdf2', label: 'PBKDF2 (SHA-256, 600k iterations)' }];
        if (typeof argon2 !== 'undefined') opts.push({ id: 'argon2id', label: 'Argon2id (Memory-hard, stronger)' });
        return opts;
    };

    const offer = nd => new Promise(res => {
        const kdfOpts = getKdfOptions().map(o => `<option value="${o.id}">${o.label}</option>`).join('');
        const p = document.createElement('div'); p.className = 'toast-panel';
        p.innerHTML = `
            <div class="titlebar"><div class="title"><span class="logo"></span>Password Protect</div><div class="winbtns"><button class="close" id="tc">✕</button></div></div>
            <div class="toast-body">
                <p>Protect <b>${esc(nd.name)}</b>?</p>
                <input type="password" id="tp" placeholder="Password">
                <input type="text" id="th" placeholder="Hint (optional)">
                <label style="font-size:10px;display:block;margin-bottom:4px;">KDF:</label>
                <select id="tkdf">${kdfOpts}</select>
                <label style="font-size:10px;display:block;margin-bottom:4px;">Cipher:</label>
                <select id="talg">
                    <option value="AES-GCM">AES-256-GCM (Fast)</option>
                    <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (Modern)</option>
                </select>
                <label style="font-size:10px;display:block;margin-bottom:8px;"><input type="checkbox" id="tr"> Self-destruct (Read Once)</label>
                <div class="toast-btns"><button class="btn" id="ts">Skip</button><button class="btn" id="tpr">Protect</button></div>
            </div>
        `;
        document.body.appendChild(p);
        const tp = p.querySelector('#tp'); tp.focus();
        const cl = v => { p.remove(); res(v); };
        p.querySelector('#tc').onclick = p.querySelector('#ts').onclick = () => cl(null);
        p.querySelector('#tpr').onclick = () => cl({
            pwd: tp.value, hint: p.querySelector('#th').value, ro: p.querySelector('#tr').checked,
            kdf: p.querySelector('#tkdf').value, algorithm: p.querySelector('#talg').value
        });
    });

    const offerBatch = count => new Promise(res => {
        const kdfOpts = getKdfOptions().map(o => `<option value="${o.id}">${o.label}</option>`).join('');
        const p = document.createElement('div'); p.className = 'toast-panel';
        p.innerHTML = `
            <div class="titlebar"><div class="title"><span class="logo"></span>Batch Protect</div><div class="winbtns"><button class="close" id="tc">✕</button></div></div>
            <div class="toast-body">
                <p>You are uploading <b>${count} files</b>.<br>Protect all of them with a single password?</p>
                <input type="password" id="tp" placeholder="Password (leave blank to skip)">
                <input type="text" id="th" placeholder="Hint (optional)">
                <label style="font-size:10px;display:block;margin-bottom:4px;">KDF:</label>
                <select id="tkdf">${kdfOpts}</select>
                <label style="font-size:10px;display:block;margin-bottom:4px;">Cipher:</label>
                <select id="talg">
                    <option value="AES-GCM">AES-256-GCM (Fast)</option>
                    <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (Modern)</option>
                </select>
                <label style="font-size:10px;display:block;margin-bottom:8px;"><input type="checkbox" id="tr"> Self-destruct (Read Once)</label>
                <div class="toast-btns"><button class="btn" id="ts">Skip All</button><button class="btn" id="tpr">Apply to All</button></div>
            </div>
        `;
        document.body.appendChild(p);
        const tp = p.querySelector('#tp'); tp.focus();
        const cl = v => { p.remove(); res(v); };
        p.querySelector('#tc').onclick = p.querySelector('#ts').onclick = () => cl('skip_all');
        p.querySelector('#tpr').onclick = () => {
            if (!tp.value) return cl('skip_all');
            cl({ pwd: tp.value, hint: p.querySelector('#th').value, ro: p.querySelector('#tr').checked, kdf: p.querySelector('#tkdf').value, algorithm: p.querySelector('#talg').value });
        };
    });

    // =========================================================================
    // Complex Actions & Optimized Path Creation
    // =========================================================================
    const ensureFolderPath = async (pathStr, parentId) => {
        const parts = pathStr.replace(/\\/g, '/').split('/').filter(p => p && p !== '.' && p !== '..');
        let currentId = parentId;
        for (const part of parts) {
            const siblings = await getSiblings(currentId);
            let folderId = siblings.get(part.toLowerCase());
            if (!folderId) {
                folderId = uid();
                const folder = { id: folderId, parentId: currentId, name: part, kind: 'folder', size: 0, compSize: 0, created: Date.now(), modified: Date.now() };
                await req(sto(N, 'readwrite').add(folder));
                siblings.set(part.toLowerCase(), folderId);
            }
            currentId = folderId;
        }
        return currentId;
    };

    const act = {
        upload: () => $('#fileInput').click(),
        uploadfolder: () => $('#folderInput').click(),
        newfolder: () => dlg({ title: 'New Folder', label: 'Name:', value: 'New Folder' }).then(async n => {
            if (!n) return;
            const nd = { id: uid(), parentId: st.cwd, name: await uniq(n, st.cwd), kind: 'folder', size: 0, compSize: 0, created: Date.now(), modified: Date.now() };
            await req(sto(N, 'readwrite').add(nd));
            await refresh();
        }),
        extractzip: () => $('#zipInput').click(),
        download: () => dlNodes(st.items.filter(i => st.sel.has(i.id) && i.kind === 'file')),
        downloadzip: async () => {
            const f = {};
            for (const n of st.items.filter(i => st.sel.has(i.id) && i.kind === 'file')) {
                const p = n.pwdHash ? await ask(n) : null;
                if (n.pwdHash && !p) continue;
                const b = await getBlob(n, p);
                if (b) f[n.name] = new Uint8Array(await b.arrayBuffer());
            }
            if (!Object.keys(f).length) return;
            const z = fflate.zipSync(f), a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([z])); a.download = 'Export.zip'; a.click();
        },
        delete: () => {
            const ids = Array.from(st.sel);
            if (!ids.length) return;
            dlg({ title: 'Confirm', label: `DELETE ${ids.length} item(s)?`, input: false, okText: 'DELETE' }).then(async ok => {
                if (!ok) return;
                for (const id of ids) await del(id);
                st.sel.clear(); await refresh();
            });
        },
        batchrename: () => {
            const ids = Array.from(st.sel);
            if (!ids.length) return;
            dlg({ title: 'Batch Rename', label: 'Prefix (e.g. File_):', value: 'File_' }).then(async p => {
                if (!p) return;
                for (let i = 0; i < ids.length; i++) {
                    const n = st.items.find(x => x.id === ids[i]);
                    if (!n) continue;
                    const e = n.name.includes('.') ? n.name.slice(n.name.lastIndexOf('.')) : '';
                    n.name = p + String(i + 1).padStart(2, '0') + e;
                    await req(sto(N, 'readwrite').put(n));
                }
                await refresh();
            });
        },
        shred: () => {
            const ids = Array.from(st.sel);
            if (!ids.length) return;
            dlg({ title: 'Secure Shred', label: `Irreversibly SHRED ${ids.length} item(s)? This cannot be undone.`, input: false, okText: 'SHRED' }).then(async ok => {
                if (!ok) return;
                for (const id of ids) await shredNode(id);
                st.sel.clear(); await refresh();
            });
        },
        up: () => nav(st.path[st.path.length - 1]?.parentId || R),
        rename: () => {
            const n = st.items.find(i => i.id === Array.from(st.sel)[0]);
            if (!n) return;
            const d = n.kind === 'file' ? n.name.lastIndexOf('.') : -1;
            const b = d > 0 ? n.name.slice(0, d) : n.name, e = d > 0 ? n.name.slice(d) : '';
            dlg({ title: 'Rename', label: 'New name:', value: b, hint: e ? `Ext preserved: ${e}` : '' }).then(async v => {
                if (!v || v === b) return;
                n.name = await uniq(v + e, n.parentId, n.id);
                n.modified = Date.now();
                await req(sto(N, 'readwrite').put(n));
                await refresh();
            });
        },
        toggle_view: () => { st.isGrid = !st.isGrid; render(); },
        theme_default: () => applyTheme('default'), theme_win98: () => applyTheme('win98'), theme_mac: () => applyTheme('mac'), theme_dark: () => applyTheme('dark'),
        hidden_volume: () => dlg({ title: 'Hidden Volume', label: 'Enter hidden master password:' }).then(async p => {
            if (!p) return;
            const h = await hashPwd(p);
            const stored = await req(sto('s').get('hiddenMaster'));
            if (stored && stored.v === h) {
                st.hiddenVolume = !st.hiddenVolume; await initStorage(); await refresh();
                stat(st.hiddenVolume ? 'Hidden Volume Unlocked' : 'Switched to Public Volume');
            } else if (!stored) {
                await req(sto('s', 'readwrite').put({ k: 'hiddenMaster', v: h }));
                st.hiddenVolume = true; await initStorage(); await refresh(); stat('Hidden Volume created and unlocked');
            } else { stat('Incorrect hidden password'); }
        }),
        lock: () => { st.unlocked.clear(); st.cwd = R; refresh(); },
        webrtc: () => { $('#webrtc-modal').hidden = false; },
        find_duplicates: async () => {
            $('#dup-modal').hidden = false; $('#dup-list').innerHTML = 'Scanning hashes...';
            const all = await req(sto(N).getAll()), files = all.filter(n => n.kind === 'file' && n.hash);
            const groups = {};
            files.forEach(f => { if (!groups[f.hash]) groups[f.hash] = []; groups[f.hash].push(f); });
            const dups = Object.values(groups).filter(g => g.length > 1);
            if (!dups.length) { $('#dup-list').innerHTML = '<div style="text-align:center;padding:20px;color:#888;">No duplicates found!</div>'; return; }
            $('#dup-list').innerHTML = dups.map((g, i) => `
                <div style="margin-bottom:15px;border:1px solid #ccc;padding:10px;border-radius:4px;background:#f9f9f9;">
                    <b>Group ${i + 1} (${fmtSz(g[0].size)})</b><br>
                    ${g.map((f, j) => `<label style="display:block;margin:4px 0;"><input type="checkbox" class="dup-chk" value="${f.id}" ${j > 0 ? 'checked' : ''}> ${esc(f.name)}</label>`).join('')}
                </div>
            `).join('');
        },
        steganography: () => { $('#steg-modal').hidden = false; },
        sysinfo: () => showCompatInfo()
    };

    const dlNodes = async ns => {
        for (const n of ns) {
            const p = n.pwdHash ? await ask(n) : null;
            if (n.pwdHash && !p) continue;
            const b = await getBlob(n, p);
            if (b) {
                if (n.hash && await hashBlob(b) !== n.hash) { alert('Integrity check failed for ' + n.name); continue; }
                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = n.name; a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                if (n.ro) await del(n.id);
            }
        }
        await refresh();
    };

    const showProps = async () => {
        const n = st.items.find(i => i.id === Array.from(st.sel)[0]);
        if (!n) return;
        const p = n.pwdHash ? await ask(n) : null;
        if (n.pwdHash && !p) return;
        let h = n.hash || 'Calculating...';
        if (!h && n.kind === 'file') { const b = await getBlob(n, p); if (b) h = await hashBlob(b); }
        $('#prop-table').innerHTML = `
            <tr><td>Name</td><td>${esc(n.name)}</td></tr>
            <tr><td>Type</td><td>${cat(n).label}</td></tr>
            <tr><td>Size</td><td>${fmtSz(n.size)} (Stored: ${fmtSz(n.compSize)})</td></tr>
            <tr><td>Created</td><td>${fmtDt(n.created)}</td></tr>
            <tr><td>Modified</td><td>${fmtDt(n.modified)}</td></tr>
            <tr><td>Encrypted</td><td>${n.encrypted ? `Yes (${n.algorithm || 'AES-GCM'})` : 'No'}</td></tr>
            <tr><td>KDF</td><td>${n.kdf || 'pbkdf2'}</td></tr>
            <tr><td>Compressed</td><td>${n.compressed ? 'Yes (Brotli/Gzip)' : 'No'}</td></tr>
            <tr><td>SHA-256</td><td style="font-family:monospace;word-break:break-all;">${h}</td></tr>
        `;
        $('#prop-modal').hidden = false;
    };

    const nav = async id => {
        if (id !== R) {
            const n = await node(id);
            if (n && n.pwdHash && !st.unlocked.has(id)) {
                if (!await ask(n)) return;
                st.unlocked.add(id);
            }
        }
        st.cwd = id; st.sel.clear(); sQuery = ''; if ($('#searchInput')) $('#searchInput').value = '';
        await refresh();
    };

    const openImgEditor = async (n, b) => {
        if ($('#img-editor-modal')) $('#img-editor-modal').hidden = false;
        const img = new Image(); img.src = URL.createObjectURL(b);
        await new Promise(r => img.onload = r);
        const c = $('#imgCanvas'); 
        if (!c) return;
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        let rot = 0;
        if ($('#imgRotate')) $('#imgRotate').onclick = () => {
            rot = (rot + 90) % 360; c.width = img.height; c.height = img.width;
            ctx.translate(c.width / 2, c.height / 2); ctx.rotate(rot * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        };
        if ($('#imgSave')) $('#imgSave').onclick = async () => {
            c.toBlob(async (blob) => {
                const f = new File([blob], n.name, { type: 'image/jpeg' });
                await del(n.id); await add(f, n.parentId, n.pwdHash);
                await refresh(); if ($('#img-editor-modal')) $('#img-editor-modal').hidden = true;
            }, 'image/jpeg', 0.85);
        };
    };

    const prev = async n => {
        $('#modal').hidden = false; $('#modalTitle').textContent = n.name;
        $('#modalSaveBtn').hidden = true; $('#modalSaveAsBtn').hidden = true;
        const p = n.pwdHash ? await ask(n) : null;
        if (n.pwdHash && !p) { $('#modal').hidden = true; return; }
        const b = await getBlob(n, p);
        if (!b) { $('#modalBody').innerHTML = '<div class="nopreview">Decryption failed.</div>'; return; }
        const c = cat(n).cat, u = URL.createObjectURL(b); purls.push(u);
        if (['image', 'video', 'audio'].includes(c)) {
            if (c === 'image') {
                $('#modalSaveAsBtn').hidden = false; $('#modalSaveAsBtn').textContent = 'Edit Image';
                $('#modalSaveAsBtn').onclick = () => openImgEditor(n, b);
            }
            $('#modalBody').innerHTML = `<${c} controls autoplay src="${u}"></${c}>`;
            if (c === 'audio') {
                const audioQueue = st.items.filter(i => cat(i).cat === 'audio');
                const audioIndex = audioQueue.findIndex(i => i.id === n.id);
                const audioEl = $('#modalBody audio');
                if (audioEl) audioEl.onended = () => { if (audioIndex < audioQueue.length - 1) prev(audioQueue[audioIndex + 1]); };
            }
        } else if (c === 'pdf') {
            $('#modalBody').innerHTML = `<iframe src="${u}"></iframe>`;
        } else if (c === 'text') {
            const text = await b.text(), ext = n.name.split('.').pop().toLowerCase();
            if (ext === 'md' || ext === 'markdown') {
                $('#modalBody').innerHTML = '<div class="markdown-view"></div>';
                if (typeof marked !== 'undefined') $('#modalBody .markdown-view').innerHTML = marked.parse(text);
                else $('#modalBody .markdown-view').innerText = text;
                $('#modalSaveBtn').hidden = false; $('#modalSaveBtn').textContent = 'Edit Raw';
                $('#modalSaveBtn').onclick = () => {
                    $('#modalBody').innerHTML = `<textarea class="editor" spellcheck="false">${esc(text)}</textarea>`;
                    $('#modalSaveBtn').textContent = 'Save';
                    $('#modalSaveBtn').onclick = async () => {
                        const f = new File([$('#modalBody textarea').value], n.name, { type: n.mime });
                        await del(n.id); await add(f, n.parentId, p || null);
                        await refresh(); $('#modal').hidden = true;
                    };
                };
            } else {
                const lang = ext === 'js' ? 'javascript' : ext === 'py' ? 'python' : ext === 'html' ? 'html' : ext === 'css' ? 'css' : 'plaintext';
                $('#modalBody').innerHTML = `<div style="flex:1;align-self:stretch;overflow:auto;background:#10151a;padding:16px;"><pre style="margin:0;"><code class="language-${lang}">${esc(text)}</code></pre></div>`;
                if (typeof hljs !== 'undefined') { try { hljs.highlightElement($('#modalBody code')); } catch (e) { } }
                $('#modalSaveBtn').hidden = false; $('#modalSaveBtn').textContent = 'Edit';
                $('#modalSaveBtn').onclick = () => {
                    $('#modalBody').innerHTML = `<textarea class="editor" spellcheck="false">${esc(text)}</textarea>`;
                    $('#modalSaveBtn').textContent = 'Save';
                    $('#modalSaveBtn').onclick = async () => {
                        const f = new File([$('#modalBody textarea').value], n.name, { type: n.mime });
                        await del(n.id); await add(f, n.parentId, p || null);
                        await refresh(); $('#modal').hidden = true;
                    };
                };
            }
        } else {
            $('#modalBody').innerHTML = '<div class="nopreview">No preview.</div>';
        }
    };

    // =========================================================================
    // Robust Import & Drag-Drop Logic with Parallel Uploads
    // =========================================================================
    let isMarquee = false, mqStart = { x: 0, y: 0 }, mqBox = null;

    const updateProgressUI = (currIdx, total, bytesProcessed, totalBytes, currFile) => {
        const percent = total === 0 ? 0 : Math.round((currIdx / total) * 100);
        if ($('#upload-progress-bar')) $('#upload-progress-bar').style.width = percent + '%';
        if ($('#upload-status-text')) $('#upload-status-text').textContent = `Uploading ${currIdx} of ${total} files...`;
        if (currFile && $('#upload-file-name')) $('#upload-file-name').textContent = currFile;
        if ($('#upload-stats')) $('#upload-stats').textContent = `${fmtSz(bytesProcessed)} / ${fmtSz(totalBytes)} (${percent}%)`;
        if ($('#upload-mini-progress-bar')) $('#upload-mini-progress-bar').style.width = percent + '%';
        if (currFile && $('#upload-mini-file-name')) $('#upload-mini-file-name').textContent = currFile;
    };

    const imp = async (fs, preservePaths = false) => {
        if (!fs.length) return;
        
        const startDir = st.cwd; 
        
        let sharedPwd = null, sharedHint = null, sharedRo = false, sharedKdf = 'pbkdf2', sharedAlg = 'AES-GCM';
        if (fs.length > 1) {
            const res = await offerBatch(fs.length);
            if (res !== 'skip_all' && res) { sharedPwd = res.pwd; sharedHint = res.hint; sharedRo = res.ro; sharedKdf = res.kdf; sharedAlg = res.algorithm; }
        } else if (fs.length === 1) {
            const o = await offer(fs[0]);
            if (o) { sharedPwd = o.pwd; sharedHint = o.hint; sharedRo = o.ro; sharedKdf = o.kdf; sharedAlg = o.algorithm; }
        }

        const progressModal = $('#upload-progress-modal');
        const miniWidget = $('#upload-minimized-widget');
        if (progressModal) progressModal.hidden = false;
        if (miniWidget) miniWidget.hidden = true;

        const btnMinimize = $('#btnMinimizeUpload');
        const btnRestore = $('#btnRestoreUpload');
        if (btnMinimize) {
            btnMinimize.onclick = () => {
                if (progressModal) progressModal.hidden = true;
                if (miniWidget) miniWidget.hidden = false;
            };
        }
        if (btnRestore) {
            btnRestore.onclick = () => {
                if (miniWidget) miniWidget.hidden = true;
                if (progressModal) progressModal.hidden = false;
            };
        }

        let totalBytes = fs.reduce((acc, f) => acc + f.size, 0);
        let bytesProcessed = 0, completedCount = 0;
        let failedFiles = [];
        
        // Skip thumbnails if there are many files (performance optimization)
        const bulk = fs.length > 30;

        if (preservePaths) {
            fs.sort((a, b) => (a.webkitRelativePath || '').localeCompare(b.webkitRelativePath || ''));
        }

        // CONCURRENCY LIMIT: Process 3 files simultaneously
        const concurrency = 3;
        let active = 0, index = 0;

        const processQueue = async () => {
            if (index >= fs.length && active === 0) return;

            while (active < concurrency && index < fs.length) {
                const f = fs[index++];
                active++;
                
                const relPath = (f.webkitRelativePath || '').replace(/\\/g, '/');
                const displayPath = relPath ? relPath : f.name;

                updateProgressUI(completedCount, fs.length, bytesProcessed, totalBytes, displayPath);
                
                (async () => {
                    try {
                        let targetPid = startDir;
                        if (preservePaths && relPath) {
                            const parts = relPath.split('/');
                            parts.pop();
                            targetPid = await ensureFolderPath(parts.join('/'), startDir);
                        }

                        const pwdHash = sharedPwd ? await hashPwd(sharedPwd) : null;
                        const n = await add(f, targetPid, pwdHash, sharedAlg, sharedKdf, bulk);
                        
                        if (sharedHint) { n.hint = sharedHint; await req(sto(N, 'readwrite').put(n)); }
                        if (sharedRo) { n.ro = true; await req(sto(N, 'readwrite').put(n)); }
                    } catch (err) {
                        console.error("Failed to upload:", f.name, err);
                        failedFiles.push(displayPath);
                    } finally {
                        active--;
                        completedCount++;
                        bytesProcessed += f.size;
                        updateProgressUI(completedCount, fs.length, bytesProcessed, totalBytes, displayPath);
                        
                        if (index < fs.length) processQueue();
                        else if (active === 0) {
                            // DONE
                            if (progressModal) progressModal.hidden = true;
                            if (miniWidget) miniWidget.hidden = true;
                            if (st.cwd === startDir) refresh();
                            
                            if (failedFiles.length > 0) {
                                alert(`Upload completed with errors.\n${failedFiles.length} files failed to save:\n` + failedFiles.slice(0, 5).join('\n') + (failedFiles.length > 5 ? '\n...' : ''));
                                stat(`Upload partially complete. ${failedFiles.length} failed.`);
                            } else {
                                stat('Upload complete. All files saved successfully.');
                            }
                        }
                    }
                })();
            }
        };
        processQueue();
    };

    const initWebRTC = () => {
        if (typeof RTCPeerConnection === 'undefined') { alert('WebRTC is not available.'); return; }
        webrtcPC = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        webrtcPC.onicecandidate = e => { if (e.candidate && $('#webrtcOutput')) $('#webrtcOutput').value += JSON.stringify(e.candidate) + '\n'; };
        webrtcPC.ondatachannel = e => { e.channel.onmessage = m => stat('Received: ' + m.data); };
    };

    // =========================================================================
    // Main Event Binds
    // =========================================================================
    function bind() {
        // Disable native right click menu globally
        window.addEventListener('contextmenu', e => e.preventDefault());

        const badge = $('#browserBadge');
        if (badge) { badge.onclick = showCompatInfo; badge.textContent = BROWSER_LABELS[browserInfo.name]; }
        if ($('#compatClose')) $('#compatClose').onclick = () => $('#compat-modal').hidden = true;
        if ($('#compatOk')) $('#compatOk').onclick = () => $('#compat-modal').hidden = true;

        const toolsAnchor = document.querySelector('.menu .dropdown .mi[data-act="webrtc"]');
        if (toolsAnchor && toolsAnchor.parentElement && !toolsAnchor.parentElement.querySelector('[data-act="sysinfo"]')) {
            const sep = document.createElement('div'); sep.className = 'mi sep';
            const item = document.createElement('div'); item.className = 'mi'; item.dataset.act = 'sysinfo'; item.textContent = 'System Info…';
            toolsAnchor.parentElement.appendChild(sep); toolsAnchor.parentElement.appendChild(item);
        }

        if ($('#btnFullscreen')) $('#btnFullscreen').onclick = () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
            else if (document.exitFullscreen) document.exitFullscreen();
        };
        document.addEventListener('fullscreenchange', () => {
            const btn = $('#btnFullscreen');
            if (btn) btn.textContent = document.fullscreenElement ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
        });

        const menubar = $('#menubar');
        if (menubar) {
            menubar.addEventListener('click', e => {
                const t = e.target.closest('.menu-title'), m = e.target.closest('.mi');
                if (t) {
                    const mu = t.parentElement, w = mu.classList.contains('open');
                    menubar.querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
                    if (!w) mu.classList.add('open');
                    e.stopPropagation();
                } else if (m && act[m.dataset.act]) {
                    menubar.querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
                    act[m.dataset.act]();
                }
            });
        }

        document.addEventListener('click', e => {
            if (menubar && !e.target.closest('#menubar')) menubar.querySelectorAll('.menu').forEach(x => x.classList.remove('open'));
            if (!e.target.closest('#ctx-menu') && $('#ctx-menu')) $('#ctx-menu').style.display = 'none';
            const b = e.target.closest('[data-act]');
            if (b && (!menubar || !b.closest('#menubar')) && act[b.dataset.act] && !b.disabled) act[b.dataset.act]();
        });

        document.addEventListener('contextmenu', e => {
            const r = e.target.closest('.row');
            if (!r || !$('#ctx-menu')) return;
            if (!st.sel.has(r.dataset.id)) { st.sel = new Set([r.dataset.id]); render(); side(); }
            const c = $('#ctx-menu');
            c.style.display = 'block';
            c.style.left = e.pageX + 'px'; c.style.top = e.pageY + 'px';
        });

        const ctxMenu = $('#ctx-menu');
        if (ctxMenu) {
            ctxMenu.addEventListener('click', async e => {
                const a = e.target.closest('[data-ctx]')?.dataset.ctx;
                if (a === 'open') {
                    const n = st.items.find(i => i.id === Array.from(st.sel)[0]);
                    if (n) n.kind === 'folder' ? nav(n.id) : prev(n);
                } else if (a === 'properties') showProps();
                else if (a === 'quickaccess') { Array.from(st.sel).forEach(id => { if (!st.quickAccess.includes(id)) st.quickAccess.push(id); }); renderQuick(); }
                else if (a === 'tag') {
                    const col = prompt('Enter color (hex like #ff0000, or "none" to remove):');
                    if (col) {
                        for (const id of st.sel) {
                            const n = st.items.find(i => i.id === id);
                            if (n) { n.tag = col === 'none' ? null : col; await req(sto(N, 'readwrite').put(n)); }
                        }
                        await refresh();
                    }
                } else if (a === 'img_edit') {
                    const n = st.items.find(i => i.id === Array.from(st.sel)[0]);
                    if (n) ask(n).then(async p => { const b = await getBlob(n, p); if (b) openImgEditor(n, b); });
                } else if (a === 'batchrename') act.batchrename();
                else if (act[a]) act[a]();
                ctxMenu.style.display = 'none';
            });
        }

        const listheader = $('#listheader');
        if (listheader) {
            listheader.onclick = e => {
                const c = e.target.closest('.col');
                if (c && c.dataset.sort) {
                    sCol === c.dataset.sort ? sAsc = !sAsc : (sCol = c.dataset.sort, sAsc = true);
                    render();
                }
            };
        }

        const searchInput = $('#searchInput');
        if (searchInput) {
            searchInput.oninput = e => { sQuery = e.target.value; refresh(); };
        }

        const listbody = $('#listbody');
        if (listbody) {
            listbody.onclick = e => {
                if (isMarquee) return;
                const r = e.target.closest('.row');
                if (!r) {
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { st.sel.clear(); render(); side(); }
                    return;
                }
                const id = r.dataset.id;
                if (e.target.classList.contains('row-chk')) {
                    if (e.target.checked) st.sel.add(id); else st.sel.delete(id);
                    render(); side();
                } else {
                    if (e.ctrlKey || e.metaKey) st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id);
                    else st.sel = new Set([id]);
                    render(); side();
                }
            };

            listbody.ondblclick = e => {
                if (isMarquee || e.target.classList.contains('row-chk')) return;
                const r = e.target.closest('.row');
                if (!r) return;
                const n = st.items.find(i => i.id === r.dataset.id);
                if (n) n.kind === 'folder' ? nav(n.id) : prev(n);
            };

            listbody.addEventListener('mousedown', e => {
                if (e.target.closest('.row') || e.button !== 0) return;
                isMarquee = true;
                const rect = listbody.getBoundingClientRect();
                mqStart = { x: e.clientX - rect.left + listbody.scrollLeft, y: e.clientY - rect.top + listbody.scrollTop };
                mqBox = document.createElement('div'); mqBox.className = 'marquee-box';
                Object.assign(mqBox.style, { left: mqStart.x + 'px', top: mqStart.y + 'px', width: '0', height: '0' });
                listbody.appendChild(mqBox);
                if (!e.ctrlKey && !e.metaKey) { st.sel.clear(); render(); side(); }
            });

            window.addEventListener('mousemove', e => {
                if (!isMarquee || !mqBox) return;
                const rect = listbody.getBoundingClientRect();
                const curX = e.clientX - rect.left + listbody.scrollLeft;
                const curY = e.clientY - rect.top + listbody.scrollTop;
                const left = Math.min(mqStart.x, curX), top = Math.min(mqStart.y, curY);
                const width = Math.abs(curX - mqStart.x), height = Math.abs(curY - mqStart.y);
                Object.assign(mqBox.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });
            });

            window.addEventListener('mouseup', e => {
                if (!isMarquee) return;
                isMarquee = false;
                if (mqBox) {
                    const bRect = mqBox.getBoundingClientRect();
                    const rows = listbody.querySelectorAll('.row');
                    rows.forEach(r => {
                        const rRect = r.getBoundingClientRect();
                        if (!(bRect.right < rRect.left || bRect.left > rRect.right || bRect.bottom < rRect.top || bRect.top > rRect.bottom)) {
                            st.sel.add(r.dataset.id);
                        }
                    });
                    mqBox.remove(); mqBox = null;
                    render(); side();
                }
            });

            listbody.ondragstart = e => {
                const r = e.target.closest('.row');
                if (!r) return e.preventDefault();
                if (!st.sel.has(r.dataset.id)) {
                    st.sel = new Set([r.dataset.id]);
                    render(); side();
                }
                dragId = r.dataset.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify(Array.from(st.sel)));
                r.style.opacity = '.5';
            };

            listbody.ondragend = e => {
                const r = e.target.closest('.row');
                if (r) r.style.opacity = '';
                dragId = null;
                listbody.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
            };

            listbody.ondragover = e => {
                if (!dragId) return;
                const r = e.target.closest('.row');
                if (!r || st.sel.has(r.dataset.id) || st.items.find(i => i.id === r.dataset.id)?.kind !== 'folder') return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                listbody.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
                r.classList.add('drag-over');
            };

            listbody.ondrop = async e => {
                const data = e.dataTransfer.getData('text/plain');
                const r = e.target.closest('.row');
                dragId = null;
                listbody.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
                if (!r || !data) return;
                e.preventDefault(); e.stopPropagation();
                
                try {
                    const ids = JSON.parse(data);
                    const targetId = r.dataset.id;
                    if (ids.includes(targetId)) return;
                    
                    const target = await node(targetId);
                    if (target.kind !== 'folder') return;

                    for (const id of ids) {
                        const n = await node(id);
                        if (n && n.id !== targetId) {
                            n.parentId = targetId;
                            n.name = await uniq(n.name, targetId);
                            await req(sto(N, 'readwrite').put(n));
                        }
                    }
                    st.sel.clear();
                    await refresh();
                } catch (err) { }
            };

            ['dragenter', 'dragover'].forEach(v => listbody.addEventListener(v, e => {
                if (dragId) return;
                e.preventDefault();
                listbody.classList.add('drag');
            }));

            ['dragleave', 'dragend'].forEach(v => listbody.addEventListener(v, e => {
                if (v === 'dragleave' && listbody.contains(e.relatedTarget)) return;
                listbody.classList.remove('drag');
            }));

            listbody.addEventListener('drop', e => {
                if (dragId) return;
                e.preventDefault();
                listbody.classList.remove('drag');
                if (e.dataTransfer.files.length) imp(Array.from(e.dataTransfer.files));
            });
        }

        window.ondragover = e => e.preventDefault();
        window.ondrop = e => e.preventDefault();

        if ($('#modalClose')) $('#modalClose').onclick = () => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; purls.forEach(u => URL.revokeObjectURL(u)); purls = []; };
        if ($('#modalOk')) $('#modalOk').onclick = () => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; purls.forEach(u => URL.revokeObjectURL(u)); purls = []; };

        if ($('#dlgOk')) $('#dlgOk').onclick = () => { const i = $('#dlgInput'); if (i) dlgCl(i.value.trim() || null); else dlgCl(true); };
        if ($('#dlgCancel')) $('#dlgCancel').onclick = () => dlgCl(null);
        if ($('#dlgX')) $('#dlgX').onclick = () => dlgCl(null);

        if ($('#fileInput')) $('#fileInput').onchange = e => { imp(Array.from(e.target.files)); e.target.value = ''; };
        if ($('#folderInput')) $('#folderInput').onchange = e => { imp(Array.from(e.target.files), true); e.target.value = ''; };
        
        if ($('#zipInput')) $('#zipInput').onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            try {
                const buf = await f.arrayBuffer();
                const unzipped = fflate.unzipSync(new Uint8Array(buf));
                const startDir = st.cwd; 
                
                for (const [path, data] of Object.entries(unzipped)) {
                    const parts = path.replace(/\\/g, '/').split('/');
                    const name = parts.pop();
                    if (!name) continue;
                    const targetPid = await ensureFolderPath(parts.join('/'), startDir);
                    const file = new File([new Blob([data])], name);
                    await add(file, targetPid, null);
                }
                await refresh();
                stat('ZIP extracted successfully.');
            } catch (err) { alert('Invalid or corrupted ZIP file.'); }
            e.target.value = '';
        };

        if ($('#sbDelete')) $('#sbDelete').onclick = act.delete;
        if ($('#sbDownload')) $('#sbDownload').onclick = act.download;
        if ($('#sbDownloadZip')) $('#sbDownloadZip').onclick = act.downloadzip;
        if ($('#sbPreview')) $('#sbPreview').onclick = () => { const n = st.items.find(i => i.id === Array.from(st.sel)[0]); if (n) prev(n); };

        if ($('#propClose')) $('#propClose').onclick = () => $('#prop-modal').hidden = true;
        if ($('#propOk')) $('#propOk').onclick = () => $('#prop-modal').hidden = true;
        if ($('#webrtcClose')) $('#webrtcClose').onclick = () => $('#webrtc-modal').hidden = true;
        if ($('#webrtcOk')) $('#webrtcOk').onclick = () => $('#webrtc-modal').hidden = true;
        if ($('#webrtcGenerate')) $('#webrtcGenerate').onclick = async () => { initWebRTC(); if (!webrtcPC) return; webrtcPC.createDataChannel('file'); const offer = await webrtcPC.createOffer(); await webrtcPC.setLocalDescription(offer); $('#webrtcOutput').value = JSON.stringify(offer); };
        if ($('#webrtcAccept')) $('#webrtcAccept').onclick = async () => { initWebRTC(); if (!webrtcPC) return; try { const offer = JSON.parse($('#webrtcInput').value); await webrtcPC.setRemoteDescription(offer); const answer = await webrtcPC.createAnswer(); await webrtcPC.setLocalDescription(answer); $('#webrtcOutput').value = JSON.stringify(answer); } catch (err) { alert('Invalid offer JSON.'); } };

        if ($('#imgClose')) $('#imgClose').onclick = () => $('#img-editor-modal').hidden = true;
        if ($('#stegClose')) $('#stegClose').onclick = () => $('#steg-modal').hidden = true;
        if ($('#stegOk')) $('#stegOk').onclick = () => $('#steg-modal').hidden = true;
        if ($('#stegHide')) $('#stegHide').onclick = async () => {
            const file = $('#stegImg').files[0], text = $('#stegText').value;
            if (!file || !text) return alert('Select image and text');
            const img = new Image(); img.src = URL.createObjectURL(file); await new Promise(r => img.onload = r);
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, c.width, c.height), data = id.data;
            const bin = text.split('').map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0')).join('') + '00000000';
            if (bin.length > data.length) return alert('Text too long for image');
            for (let i = 0; i < bin.length; i++) data[i] = (data[i] & 0xFE) | parseInt(bin[i]);
            ctx.putImageData(id, 0, 0);
            c.toBlob(async b => { const f = new File([b], 'secret_' + file.name, { type: 'image/png' }); await add(f, st.cwd, null); await refresh(); alert('Image saved!'); }, 'image/png');
        };
        if ($('#stegExtract')) $('#stegExtract').onclick = async () => {
            const file = $('#stegImg').files[0]; if (!file) return alert('Select image');
            const img = new Image(); img.src = URL.createObjectURL(file); await new Promise(r => img.onload = r);
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
            const id = ctx.getImageData(0, 0, c.width, c.height), data = id.data;
            let bin = '', text = '';
            for (let i = 0; i < data.length; i += 8) {
                let byte = ''; for (let j = 0; j < 8; j++) byte += (data[i + j] & 1);
                bin += byte;
                if (bin.length === 8) { const cc = parseInt(bin, 2); if (cc === 0) break; text += String.fromCharCode(cc); bin = ''; }
            }
            alert('Extracted Text:\n' + text);
        };

        if ($('#dupClose')) $('#dupClose').onclick = () => $('#dup-modal').hidden = true;
        if ($('#dupOk')) $('#dupOk').onclick = () => $('#dup-modal').hidden = true;
        if ($('#dupClean')) $('#dupClean').onclick = async () => {
            const chks = document.querySelectorAll('.dup-chk:checked'); if (!chks.length) return;
            for (const c of chks) await del(c.value);
            await refresh(); alert('Duplicates deleted!'); $('#dup-modal').hidden = true;
        };

        document.onmousemove = document.onkeydown = () => {
            clearTimeout(lockT);
            lockT = setTimeout(() => { act.lock(); stat('Auto-Locked.'); }, L);
        };
    }

    // =========================================================================
    // Performance & Bootstrap
    // =========================================================================
    function initPerfWidget() {
        const memBtn = $('#btn-mem'), diskBtn = $('#btn-disk'), memBox = $('#mem-chart'), diskBox = $('#disk-chart');
        if (!memBtn || !diskBtn || !memBox || !diskBox) return;
        let active = null;
        const closeAll = () => { memBox.classList.add('hidden'); diskBox.classList.add('hidden'); active = null; };
        memBtn.onclick = () => { if (active === 'mem') { closeAll(); return; } const o = () => { memBox.classList.remove('hidden'); active = 'mem'; }; if (active) { closeAll(); setTimeout(o, 250); } else o(); };
        diskBtn.onclick = () => { if (active === 'disk') { closeAll(); return; } const o = () => { diskBox.classList.remove('hidden'); active = 'disk'; }; if (active) { closeAll(); setTimeout(o, 250); } else o(); };
        const memCanvas = $('#mem-canvas'), diskCanvas = $('#disk-canvas');
        if (!memCanvas || !diskCanvas) return;
        const memCtx = memCanvas.getContext('2d'), diskCtx = diskCanvas.getContext('2d');
        const w = 320, h = 140; memCanvas.width = w; memCanvas.height = h; diskCanvas.width = w; diskCanvas.height = h;
        const memData = new Array(50).fill(0), diskData = new Array(50).fill(0);
        const draw = (ctx, data, color) => {
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim();
            ctx.font = '10px Tahoma'; ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) { const y = i * (h / 4); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.fillText((100 - (i * 25)) + '%', 5, y - 4); }
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
            for (let i = 0; i < data.length; i++) { const x = (i / (data.length - 1)) * w, y = h - (data[i] * h); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            ctx.stroke(); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fillStyle = color + '44'; ctx.fill();
        };
        setInterval(() => {
            if (!memBox.classList.contains('hidden')) {
                const hasMem = !!(performance && performance.memory);
                const memUsed = hasMem ? performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit : 0;
                const memLimit = hasMem ? performance.memory.jsHeapSizeLimit : 0;
                const memByteUsed = hasMem ? performance.memory.usedJSHeapSize : 0;
                memData.push(memUsed); memData.shift();
                const peak = Math.max(...memData), avg = memData.reduce((a, b) => a + b, 0) / memData.length;
                if ($('#mem-current-label')) $('#mem-current-label').textContent = hasMem ? Math.round(memUsed * 100) + '%' : 'N/A';
                if ($('#mem-used')) $('#mem-used').textContent = hasMem ? fmtSz(memByteUsed) : 'N/A';
                if ($('#mem-limit')) $('#mem-limit').textContent = hasMem ? fmtSz(memLimit) : 'N/A';
                if ($('#mem-peak')) $('#mem-peak').textContent = hasMem ? Math.round(peak * 100) + '%' : 'N/A';
                if ($('#mem-avg')) $('#mem-avg').textContent = hasMem ? Math.round(avg * 100) + '%' : 'N/A';
                draw(memCtx, memData, getComputedStyle(document.documentElement).getPropertyValue('--chart-line-mem').trim());
            }
            if (!diskBox.classList.contains('hidden') && navigator.storage && navigator.storage.estimate) {
                navigator.storage.estimate().then(est => {
                    const diskUsed = est.usage / est.quota; diskData.push(diskUsed); diskData.shift();
                    const peak = Math.max(...diskData), avg = diskData.reduce((a, b) => a + b, 0) / diskData.length;
                    if ($('#disk-current-label')) $('#disk-current-label').textContent = Math.round(diskUsed * 100) + '%';
                    if ($('#disk-used')) $('#disk-used').textContent = fmtSz(est.usage); 
                    if ($('#disk-quota')) $('#disk-quota').textContent = fmtSz(est.quota);
                    if ($('#disk-peak')) $('#disk-peak').textContent = Math.round(peak * 100) + '%'; 
                    if ($('#disk-avg')) $('#disk-avg').textContent = Math.round(avg * 100) + '%';
                    draw(diskCtx, diskData, getComputedStyle(document.documentElement).getPropertyValue('--chart-line-disk').trim());
                });
            }
        }, 1000);
    }

    const initStorage = async () => {
        if (db) db.close();
        db = await open();
        const dirName = st.hiddenVolume ? O + '_hidden' : O;
        if (activeBackend === 'OPFS') { opf = await navigator.storage.getDirectory(); await opf.getDirectoryHandle(dirName, { create: true }); }
        st.cwd = R; st.sel.clear(); st.unlocked.clear();
    };

    initTheme();
    initCursor();
    document.title = 'RetroDisk 9.0 — ' + browserInfo.name;
    bind();
    initPerfWidget();
    initWorker();

    try {
        await mountStorage();
        if (navigator.storage && navigator.storage.persist) { try { await navigator.storage.persist(); } catch (e) { } }
        await initStorage();
        await refresh();
        const badge = $('#backendBadge');
        if (badge) {
            badge.textContent = 'Backend: ' + activeBackend;
            badge.style.background = activeBackend === 'OPFS' ? '#d4edda' : '#fff3cd';
            stat(`Ready on ${browserInfo.name} · ${activeBackend} mounted.`);
        }
    } catch (e) {
        console.error(e);
        if ($('#listbody')) $('#listbody').innerHTML = '<div class="empty">Critical Error: Failed to mount storage. ' + esc(e.message) + '</div>';
        stat('Error mounting storage.');
    }
})();
