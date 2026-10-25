// =========================================================================
// RDPlayer Integration (Custom Media Viewer)
// =========================================================================
(function () {
    'use strict';

    const P = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    const CIRC = 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z';
    const IC = {
        play: P('M8 5v14l11-7z'),
        pause: P('M6 19h4V5H6v14zm8-14v14h4V5h-4z'),
        replay: P(CIRC),
        back10: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CIRC}"/><text x="12" y="16.2" font-size="7" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif">10</text></svg>`,
        fwd10: `<svg viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(24 0) scale(-1 1)" d="${CIRC}"/><text x="12" y="16.2" font-size="7" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif">10</text></svg>`,
        volHi: P('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'),
        volLo: P('M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z'),
        volOff: P('M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'),
        fs: P('M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'),
        fsOff: P('M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'),
        pip: P('M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z'),
        loop: P('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'),
        prev: P('M6 6h2v12H6zm3.5 6l8.5 6V6z'),
        next: P('M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z'),
        chevL: P('M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'),
        chevR: P('M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'),
        close: P('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'),
        zoomIn: P('M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z'),
        zoomOut: P('M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z'),
        fit: P('M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z'),
        actual: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v12h14V6H5z"/><text x="12" y="15.4" font-size="8" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif">1:1</text></svg>`,
        rotL: P('M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z'),
        rotR: `<svg viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(24 0) scale(-1 1)" d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>`,
        download: P('M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'),
        edit: P('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'),
        slide: P('M10 8v8l6-4-6-4zm9-5H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'),
        note: P('M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'),
        warn: P('M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z')
    };

    const VIDEO_TYPES = {
        mp4: ['video/mp4'], m4v: ['video/mp4', 'video/x-m4v'], mov: ['video/quicktime', 'video/mp4'], webm: ['video/webm'],
        mkv: ['video/x-matroska', 'video/webm', 'video/mp4'], avi: ['video/x-msvideo', 'video/avi', 'video/mp4'],
        ogv: ['video/ogg'], ogg: ['video/ogg'], '3gp': ['video/3gpp', 'video/mp4'], mpg: ['video/mpeg', 'video/mp4'],
        mpeg: ['video/mpeg', 'video/mp4'], wmv: ['video/x-ms-wmv', 'video/mp4'], flv: ['video/x-flv', 'video/mp4'], ts: ['video/mp2t', 'video/mp4']
    };
    const AUDIO_TYPES = {
        mp3: ['audio/mpeg'], wav: ['audio/wav', 'audio/x-wav'], ogg: ['audio/ogg'], oga: ['audio/ogg'], flac: ['audio/flac', 'audio/x-flac'],
        aac: ['audio/aac', 'audio/mp4'], m4a: ['audio/mp4', 'audio/x-m4a', 'audio/aac'], opus: ['audio/ogg; codecs=opus', 'audio/opus', 'audio/webm'],
        wma: ['audio/x-ms-wma', 'audio/mp4'], mid: ['audio/midi'], midi: ['audio/midi'], weba: ['audio/webm']
    };
    const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtT = s => {
        if (!isFinite(s) || s < 0) s = 0;
        s = Math.floor(s);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
        return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
    };
    const fmtSz = b => {
        if (b == null) return '';
        if (b < 1024) return b + ' B';
        const u = ['KB', 'MB', 'GB', 'TB']; let n = b, i = -1;
        do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
        return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n)) + ' ' + u[i];
    };
    const store = {
        get(k, d) { try { const v = localStorage.getItem('rdp_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem('rdp_' + k, JSON.stringify(v)); } catch (e) { } }
    };

    let root = null, S = null, ui = {};

    function build() {
        if (root) return;
        root = document.createElement('div');
        root.className = 'rdp'; root.hidden = true; root.tabIndex = -1;
        root.innerHTML = `
            <div class="rdp-stage"></div>
            <div class="rdp-top">
                <div class="rdp-title"><b class="rdp-name"></b><span class="rdp-sub"></span></div>
                <div class="rdp-tools"></div>
            </div>
            <button class="rdp-nav rdp-prev" data-a="prev" title="Previous (P)">${IC.chevL}</button>
            <button class="rdp-nav rdp-next" data-a="next" title="Next (N)">${IC.chevR}</button>
            <div class="rdp-bar" hidden>
                <div class="rdp-seek" role="slider" aria-label="Seek" tabindex="-1">
                    <div class="rdp-track"><div class="rdp-buf"></div><div class="rdp-prog"></div></div>
                    <div class="rdp-thumb"></div><div class="rdp-tip">0:00</div>
                </div>
                <div class="rdp-row">
                    <button class="rdp-btn rdp-big" data-a="play" title="Play / Pause (Space)">${IC.play}</button>
                    <button class="rdp-btn" data-a="back" title="Back 10 s (J)">${IC.back10}</button>
                    <button class="rdp-btn" data-a="fwd" title="Forward 10 s (L)">${IC.fwd10}</button>
                    <div class="rdp-vol"><button class="rdp-btn" data-a="mute" title="Mute (M)">${IC.volHi}</button><input class="rdp-volr" type="range" min="0" max="1" step="0.01" aria-label="Volume"></div>
                    <div class="rdp-time"><span class="rdp-cur">0:00</span><span class="rdp-slash">/</span><span class="rdp-dur">0:00</span></div>
                    <span class="rdp-sp"></span>
                    <button class="rdp-btn rdp-pl" data-a="prev" title="Previous (P)">${IC.prev}</button>
                    <button class="rdp-btn rdp-pl" data-a="next" title="Next (N)">${IC.next}</button>
                    <button class="rdp-btn" data-a="loop" title="Loop (Shift+L)">${IC.loop}</button>
                    <div class="rdp-spdwrap"><button class="rdp-btn rdp-spd" data-a="speed" title="Playback speed (&lt; &gt;)">1×</button><div class="rdp-menu" hidden></div></div>
                    <button class="rdp-btn rdp-pipb" data-a="pip" title="Picture in picture">${IC.pip}</button>
                    <button class="rdp-btn rdp-fsb" data-a="fs" title="Fullscreen (F)">${IC.fs}</button>
                </div>
            </div>
            <div class="rdp-load"><div class="rdp-spin"></div></div>
            <div class="rdp-err" hidden><div class="rdp-card"><div class="rdp-eico">${IC.warn}</div><h3></h3><p></p><div class="rdp-ebtns"></div></div></div>
            <div class="rdp-toast"></div>
            <div class="rdp-help" hidden><div class="rdp-card rdp-hcard"><h3>Keyboard shortcuts</h3><div class="rdp-hgrid"></div><p class="rdp-hfoot">Press Esc or ? to close</p></div></div>`;
        document.body.appendChild(root);
        const q = s => root.querySelector(s);
        ui = {
            stage: q('.rdp-stage'), top: q('.rdp-top'), name: q('.rdp-name'), sub: q('.rdp-sub'), tools: q('.rdp-tools'),
            bar: q('.rdp-bar'), seek: q('.rdp-seek'), buf: q('.rdp-buf'), prog: q('.rdp-prog'), thumb: q('.rdp-thumb'), tip: q('.rdp-tip'),
            play: q('[data-a="play"]'), mute: q('[data-a="mute"]'), vol: q('.rdp-volr'), cur: q('.rdp-cur'), dur: q('.rdp-dur'),
            loop: q('[data-a="loop"]'), spd: q('.rdp-spd'), menu: q('.rdp-menu'), pip: q('.rdp-pipb'), fsb: q('.rdp-fsb'),
            load: q('.rdp-load'), err: q('.rdp-err'), toast: q('.rdp-toast'), help: q('.rdp-help'), prevB: q('.rdp-prev'), nextB: q('.rdp-next')
        };
        ui.menu.innerHTML = SPEEDS.map(s => `<button data-a="setspd" data-v="${s}">${s === 1 ? 'Normal' : s + '×'}</button>`).join('');
        q('.rdp-hgrid').innerHTML = [
            ['Space / K', 'Play or pause'], ['← →', 'Seek 5 s (photos: previous / next)'], ['J / L', 'Back / forward 10 s'], ['↑ ↓', 'Volume'],
            ['M', 'Mute'], ['0 – 9', 'Jump to 0 – 90 %'], [', .', 'Step one frame (paused)'], ['< >', 'Slower / faster'], ['Shift+L', 'Loop'],
            ['N / P', 'Next / previous file'], ['F', 'Fullscreen'], ['+ −', 'Zoom photo'], ['0 / 1', 'Fit / actual size'], ['R / Shift+R', 'Rotate view'],
            ['S', 'Slideshow'], ['Esc', 'Close']
        ].map(([k, d]) => `<div><kbd>${esc(k)}</kbd><span>${esc(d)}</span></div>`).join('');

        root.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
        root.addEventListener('click', onClick);
        root.addEventListener('pointermove', wake);
        root.addEventListener('pointerdown', wake);
        ui.vol.addEventListener('input', () => {
            const m = S && S.media; if (!m) return;
            const v = +ui.vol.value; m.volume = v; m.muted = v === 0;
        });
        bindSeek();
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('fullscreenchange', onFS);
        window.addEventListener('resize', () => { if (S && S.im) { layoutImage(false); } });
        document.addEventListener('click', e => { if (S && !ui.menu.hidden && !e.target.closest('.rdp-spdwrap')) closeMenu(); }, true);
    }

    function toast(t) {
        ui.toast.textContent = t; ui.toast.classList.add('show');
        clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), 900);
    }
    const setLoading = on => ui.load.classList.toggle('on', !!on);
    const menuOpen = () => !ui.menu.hidden;
    function closeMenu() { ui.menu.hidden = true; }

    function wake() {
        if (!S) return;
        root.classList.remove('idle');
        clearTimeout(S.idleT);
        const playing = S.media && !S.media.paused && S.mode === 'video';
        const fsImg = S.mode === 'image' && document.fullscreenElement === root;
        if (playing || fsImg) {
            S.idleT = setTimeout(() => {
                if (!S || menuOpen() || root.querySelector('.rdp-bar:hover,.rdp-top:hover,.rdp-nav:hover')) return wake();
                root.classList.add('idle');
            }, 2600);
        }
    }

    function onFS() {
        if (!S) return;
        const on = document.fullscreenElement === root;
        ui.fsb.innerHTML = on ? IC.fsOff : IC.fs;
        const b = ui.tools.querySelector('[data-a="fs"]'); if (b) b.innerHTML = on ? IC.fsOff : IC.fs;
        if (S.im) setTimeout(() => layoutImage(false), 60);
        wake();
    }
    function toggleFS() {
        if (document.fullscreenElement === root) document.exitFullscreen();
        else if (root.requestFullscreen) root.requestFullscreen().catch(() => toast('Fullscreen is not available'));
    }

    function renderTools() {
        const it = S.list[S.idx];
        const t = (a, icon, title, cls = '') => `<button class="rdp-btn ${cls}" data-a="${a}" title="${title}">${icon}</button>`;
        let h = '';
        if (it.kind === 'image') {
            h += t('zoomout', IC.zoomOut, 'Zoom out (−)') + '<span class="rdp-zoom">100%</span>' + t('zoomin', IC.zoomIn, 'Zoom in (+)') +
                t('fit', IC.fit, 'Fit to window (0)') + t('actual', IC.actual, 'Actual size (1)') +
                t('rotl', IC.rotL, 'Rotate left (Shift+R)') + t('rotr', IC.rotR, 'Rotate right (R)');
            if (S.list.length > 1) h += t('slide', IC.slide, 'Slideshow (S)', S.slideT ? 'on' : '');
            if (it.editable && S.opts.onEdit) h += t('edit', IC.edit, 'Edit image');
        }
        h += t('save', IC.download, 'Save to device') + t('fs', document.fullscreenElement === root ? IC.fsOff : IC.fs, 'Fullscreen (F)') +
            '<button class="rdp-btn rdp-q" data-a="help" title="Keyboard shortcuts (?)">?</button>' + t('close', IC.close, 'Close (Esc)');
        ui.tools.innerHTML = h;
    }

    function open(opts) {
        build();
        if (S) close(true);
        const list = opts.list || [];
        if (!list.length) return;
        S = {
            opts, list, idx: 0, tok: 0, mode: null, cur: null, url: null, media: null, im: null, raf: 0, idleT: 0, slideT: 0,
            loop: false, prevFocus: document.activeElement
        };
        root.hidden = false; root.classList.remove('idle');
        ui.prevB.hidden = ui.nextB.hidden = list.length < 2;
        root.querySelectorAll('.rdp-pl').forEach(b => { b.hidden = list.length < 2; });
        ui.stage.innerHTML = ''; ui.err.hidden = true; ui.bar.hidden = true;
        root.focus({ preventScroll: true });
        show(clamp(opts.index || 0, 0, list.length - 1), true);
    }

    async function show(i, first) {
        const s = S; if (!s) return;
        const my = ++s.tok;
        i = ((i % s.list.length) + s.list.length) % s.list.length;
        const item = s.list[i];
        
        // If the file is still uploading, don't load it, just show the friendly message
        if (item.isUploading) {
            s.idx = i;
            s.cur = { item, blob: null, pwd: null };
            s.mode = item.kind === 'image' ? 'image' : item.kind === 'audio' ? 'audio' : 'video';
            ui.name.textContent = item.name;
            ui.sub.textContent = [s.list.length > 1 ? `${i + 1} / ${s.list.length}` : '', fmtSz(item.size)].filter(Boolean).join('  ·  ');
            showError(s.mode);
            return;
        }
        
        setLoading(true);
        let r = null;
        try { r = await s.opts.load(item); } catch (e) { r = null; }
        if (S !== s || my !== s.tok) return;
        setLoading(false);
        if (!r || !r.blob) { if (first) close(); else wake(); return; }

        teardown();
        s.idx = i; s.cur = { item, blob: r.blob, pwd: r.pwd };
        s.mode = item.kind === 'image' ? 'image' : item.kind === 'audio' ? 'audio' : 'video';
        ui.err.hidden = true;
        ui.name.textContent = item.name;
        ui.sub.textContent = [s.list.length > 1 ? `${i + 1} / ${s.list.length}` : '', fmtSz(item.size)].filter(Boolean).join('  ·  ');
        root.dataset.mode = s.mode;
        renderTools();
        ui.bar.hidden = s.mode === 'image';
        if (s.mode === 'image') mountImage(my); else mountMedia(my);
        wake();
    }

    function teardown() {
        const s = S; if (!s) return;
        cancelAnimationFrame(s.raf); s.raf = 0;
        if (s.media) {
            const m = s.media; m._dead = true;
            try { m.pause(); } catch (e) { }
            m.removeAttribute('src'); try { m.load(); } catch (e) { }
            s.media = null;
        }
        if (s.viz) { cancelAnimationFrame(s.viz.raf); try { s.viz.src.disconnect(); } catch (e) { } s.viz = null; }
        if (s.url) { URL.revokeObjectURL(s.url); s.url = null; }
        s.im = null; s.scrub = null;
        ui.stage.innerHTML = ''; ui.stage.className = 'rdp-stage';
        closeMenu();
    }

    function close(silent) {
        const s = S; if (!s) return;
        S = null; s.tok++;
        clearTimeout(s.idleT); clearInterval(s.slideT);
        S = s; teardown(); S = null;
        if (document.fullscreenElement === root) document.exitFullscreen().catch(() => { });
        root.hidden = true; root.classList.remove('idle'); ui.stage.innerHTML = '';
        setLoading(false); ui.err.hidden = true; ui.help.hidden = true;
        try { if (s.prevFocus && s.prevFocus.focus) s.prevFocus.focus({ preventScroll: true }); } catch (e) { }
        if (!silent && s.opts.onClose) s.opts.onClose();
    }

    const step = d => { if (S && S.list.length > 1) show(S.idx + d); };

    function mountImage(my) {
        const s = S, item = s.cur.item;
        ui.stage.innerHTML = '<div class="rdp-view"><img class="rdp-img" alt="" draggable="false"></div>';
        const view = ui.stage.querySelector('.rdp-view'), img = view.querySelector('img');
        s.url = URL.createObjectURL(s.cur.blob);
        img.src = s.url;
        
        img.onload = () => {
            if (S !== s || my !== s.tok) return;
            const w = img.naturalWidth || 300, h = img.naturalHeight || 150;
            img.style.width = w + 'px'; img.style.height = h + 'px'; img.style.marginLeft = -w / 2 + 'px'; img.style.marginTop = -h / 2 + 'px';
            s.im = { view, img, w, h, scale: 1, tx: 0, ty: 0, rot: 0, fit: true, svg: item.ext === 'svg', ptr: new Map() };
            ui.sub.textContent = [s.list.length > 1 ? `${s.idx + 1} / ${s.list.length}` : '', `${w} × ${h}`, fmtSz(item.size)].filter(Boolean).join('  ·  ');
            layoutImage(true);
            requestAnimationFrame(() => img.classList.add('ready'));

            view.addEventListener('wheel', e => {
                e.preventDefault();
                const im = s.im; if (!im) return;
                let dy = e.deltaY; if (e.deltaMode === 1) dy *= 33;
                const r = view.getBoundingClientRect();
                zoomTo(im.scale * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, false);
            }, { passive: false });
            view.addEventListener('dblclick', e => {
                const im = s.im; if (!im) return;
                const r = view.getBoundingClientRect(), f = fitScale();
                if (im.scale > f * 1.02) fitImage(true);
                else zoomTo(f >= 0.98 ? 2 : 1, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, true);
            });
            view.addEventListener('pointerdown', e => {
                const im = s.im; if (!im || e.button > 0) return;
                view.setPointerCapture(e.pointerId);
                im.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, type: e.pointerType });
                im.drag = { tx: im.tx, ty: im.ty, moved: false };
                if (im.ptr.size === 2) { const [a, b] = [...im.ptr.values()]; im.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: im.scale }; }
                view.classList.add('dragging'); im.img.classList.remove('anim');
            });
            view.addEventListener('pointermove', e => {
                const im = s.im; if (!im || !im.ptr.has(e.pointerId)) return;
                const p = im.ptr.get(e.pointerId); const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
                if (im.ptr.size === 2 && im.pinch) {
                    const [a, b] = [...im.ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, r = view.getBoundingClientRect();
                    zoomTo(im.pinch.scale * d / im.pinch.d, (a.x + b.x) / 2 - r.left - r.width / 2, (a.y + b.y) / 2 - r.top - r.height / 2, false);
                    im.drag.moved = true; return;
                }
                if (Math.abs(e.clientX - p.sx) + Math.abs(e.clientY - p.sy) > 3) im.drag.moved = true;
                if (im.scale > fitScale() * 1.001) { im.tx += dx; im.ty += dy; im.fit = false; clampPan(); applyImage(false); }
            });
            const up = e => {
                const im = s.im; if (!im || !im.ptr.has(e.pointerId)) return;
                const p = im.ptr.get(e.pointerId); im.ptr.delete(e.pointerId);
                if (im.ptr.size < 2) im.pinch = null;
                if (!im.ptr.size) {
                    view.classList.remove('dragging');
                    const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
                    if (p.type === 'touch' && im.scale <= fitScale() * 1.02 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
                }
            };
            view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
        };
        img.onerror = () => { if (S === s && my === s.tok) showError('image'); };
    }

    const imDims = im => (im.rot % 180 !== 0 ? [im.h, im.w] : [im.w, im.h]);
    function fitScale() {
        const im = S.im, vw = im.view.clientWidth, vh = im.view.clientHeight, [iw, ih] = imDims(im);
        let f = Math.min(vw / iw, vh / ih);
        if (!im.svg) f = Math.min(f, 1);
        return f > 0 && isFinite(f) ? f : 1;
    }
    function clampPan() {
        const im = S.im, vw = im.view.clientWidth, vh = im.view.clientHeight, [iw, ih] = imDims(im);
        const mx = Math.max(0, (iw * im.scale - vw) / 2), my = Math.max(0, (ih * im.scale - vh) / 2);
        im.tx = clamp(im.tx, -mx, mx); im.ty = clamp(im.ty, -my, my);
    }
    function applyImage(animate) {
        const im = S.im; if (!im) return;
        im.img.classList.toggle('anim', !!animate);
        im.img.classList.toggle('pix', im.scale >= 3);
        im.img.style.transform = `translate(${im.tx}px,${im.ty}px) rotate(${im.rot}deg) scale(${im.scale})`;
        im.view.classList.toggle('zoomed', im.scale > fitScale() * 1.001);
        const z = ui.tools.querySelector('.rdp-zoom'); if (z) z.textContent = Math.round(im.scale * 100) + '%';
    }
    function layoutImage(reset) {
        const im = S.im; if (!im) return;
        if (reset || im.fit) { im.scale = fitScale(); im.tx = im.ty = 0; im.fit = true; }
        else { im.scale = Math.max(im.scale, fitScale()); clampPan(); }
        applyImage(false);
    }
    function fitImage(animate) { const im = S.im; if (!im) return; im.scale = fitScale(); im.tx = im.ty = 0; im.fit = true; applyImage(animate); }
    function zoomTo(ns, px, py, animate) {
        const im = S.im; if (!im) return;
        const f = fitScale(); ns = clamp(ns, f, Math.max(32, f));
        const k = ns / im.scale;
        im.tx = px - (px - im.tx) * k; im.ty = py - (py - im.ty) * k; im.scale = ns;
        if (ns <= f * 1.001) { im.tx = im.ty = 0; im.fit = true; } else im.fit = false;
        clampPan(); applyImage(animate);
    }
    const zoomBy = k => { const im = S.im; if (im) zoomTo(im.scale * k, 0, 0, true); };
    function rotate(d) { const im = S.im; if (!im) return; im.rot += d; layoutImageAfterRotate(); }
    function layoutImageAfterRotate() {
        const im = S.im; const f = fitScale();
        if (im.fit || im.scale < f) { im.scale = f; im.tx = im.ty = 0; im.fit = true; } else clampPan();
        applyImage(true);
    }
    function toggleSlide() {
        if (S.slideT) { clearInterval(S.slideT); S.slideT = 0; toast('Slideshow off'); }
        else {
            S.slideT = setInterval(() => {
                if (!S || S.mode !== 'image') { clearInterval(S && S.slideT); if (S) S.slideT = 0; return; }
                const nx = S.list[(S.idx + 1) % S.list.length];
                if (nx.kind !== 'image') { clearInterval(S.slideT); S.slideT = 0; renderTools(); toast('Slideshow stopped'); return; }
                show(S.idx + 1);
            }, 3500);
            toast('Slideshow on');
        }
        renderTools();
    }

    function candidates(item, blob) {
        const table = item.kind === 'audio' ? AUDIO_TYPES : VIDEO_TYPES, out = [];
        const own = (blob.type || '').toLowerCase();
        if (/^(video|audio)\//.test(own)) out.push(own);
        (table[item.ext] || []).forEach(t => { if (!out.includes(t)) out.push(t); });
        out.push('');
        return out;
    }

    function mountMedia(my) {
        const s = S, item = s.cur.item, isVideo = s.mode === 'video';
        let media;
        if (isVideo) {
            ui.stage.innerHTML = '<div class="rdp-vwrap"><video class="rdp-video" playsinline preload="auto"></video><div class="rdp-bigplay">' + IC.play + '</div></div>';
            media = ui.stage.querySelector('video');
            const wrap = ui.stage.querySelector('.rdp-vwrap');
            let clickT = 0;
            wrap.addEventListener('click', e => {
                if (e.detail > 1) return;
                clearTimeout(clickT); clickT = setTimeout(togglePlay, 220);
            });
            wrap.addEventListener('dblclick', () => { clearTimeout(clickT); toggleFS(); });
        } else {
            ui.stage.innerHTML = `<div class="rdp-acard"><canvas class="rdp-viz" width="560" height="200"></canvas><div class="rdp-aname">${esc(item.name.replace(/\.[^.]+$/, ''))}</div><div class="rdp-asub">${esc((item.ext || 'audio').toUpperCase())} audio</div></div>`;
            media = document.createElement('audio'); media.preload = 'auto';
        }
        s.media = media; s.loaded = false; s.started = false; s.lastSec = -1;
        media.volume = clamp(store.get('vol', 1), 0, 1); media.muted = !!store.get('muted', false);
        media.loop = s.loop; media.playbackRate = 1;
        ui.pip.hidden = !isVideo || !document.pictureInPictureEnabled;
        ui.loop.classList.toggle('on', s.loop);
        ui.spd.textContent = '1×';
        syncVol(); syncPlay(); updateProgress(true);
        ui.dur.textContent = '0:00'; ui.cur.textContent = '0:00';
        setBuffering(true);

        const ok = () => S === s && my === s.tok && s.media === media;
        const cands = candidates(item, s.cur.blob); let ci = 0;
        const tryNext = () => {
            if (!ok()) return;
            if (ci >= cands.length) { showError(s.mode); return; }
            if (s.url) URL.revokeObjectURL(s.url);
            const type = cands[ci++];
            s.url = URL.createObjectURL(s.cur.blob.slice(0, s.cur.blob.size, type));
            media.src = s.url;
            try { media.load(); } catch (e) { }
        };
        media.addEventListener('error', () => {
            if (!ok()) return;
            if (!s.loaded) tryNext();
            else { setBuffering(false); toast('Playback error'); }
        });
        media.addEventListener('loadedmetadata', () => {
            if (!ok()) return;
            s.loaded = true; setBuffering(false);
            ui.dur.textContent = fmtT(media.duration);
            if (isVideo) {
                if (!media.videoWidth) ui.stage.classList.add('audioonly');
                const d = `${media.videoWidth || 0} × ${media.videoHeight || 0}`;
                ui.sub.textContent = [s.list.length > 1 ? `${s.idx + 1} / ${s.list.length}` : '', media.videoWidth ? d : 'audio only', fmtT(media.duration), fmtSz(item.size)].filter(Boolean).join('  ·  ');
            } else {
                ui.sub.textContent = [s.list.length > 1 ? `${s.idx + 1} / ${s.list.length}` : '', fmtT(media.duration), fmtSz(item.size)].filter(Boolean).join('  ·  ');
            }
        });
        media.addEventListener('canplay', () => {
            if (!ok()) return;
            setBuffering(false);
            if (!s.started) { s.started = true; const p = media.play(); if (p && p.catch) p.catch(() => { syncPlay(); }); }
        });
        media.addEventListener('durationchange', () => { if (ok()) ui.dur.textContent = fmtT(media.duration); });
        media.addEventListener('waiting', () => { if (ok() && s.loaded) setBuffering(true); });
        media.addEventListener('playing', () => { if (ok()) setBuffering(false); });
        media.addEventListener('seeked', () => { if (ok()) { setBuffering(false); updateProgress(true); } });
        media.addEventListener('play', () => { if (!ok()) return; syncPlay(); startTick(); startViz(); wake(); });
        media.addEventListener('pause', () => { if (!ok()) return; syncPlay(); updateProgress(true); wake(); });
        media.addEventListener('timeupdate', () => { if (ok() && media.paused) updateProgress(true); });
        media.addEventListener('progress', () => { if (ok()) updateBuffered(); });
        media.addEventListener('ended', () => {
            if (!ok()) return;
            syncPlay(); updateProgress(true);
            if (s.mode === 'audio' && !media.loop && s.list.length > 1) show(s.idx + 1);
        });
        media.addEventListener('volumechange', () => {
            if (!ok()) return;
            syncVol(); store.set('vol', media.volume); store.set('muted', media.muted);
        });
        media.addEventListener('ratechange', () => { if (ok()) ui.spd.textContent = media.playbackRate + '×'; });
        tryNext();
    }

    function setBuffering(on) { root.classList.toggle('buffering', !!on); }
    function syncPlay() {
        const m = S && S.media; if (!m) return;
        const paused = S.scrub ? !S.scrub.was : m.paused;
        ui.play.innerHTML = m.ended ? IC.replay : (paused ? IC.play : IC.pause);
        root.classList.toggle('paused', paused);
    }
    function syncVol() {
        const m = S && S.media; if (!m) return;
        const v = m.muted ? 0 : m.volume;
        ui.vol.value = v; ui.vol.style.setProperty('--p', (v * 100) + '%');
        ui.mute.innerHTML = v === 0 ? IC.volOff : v < 0.5 ? IC.volLo : IC.volHi;
    }
    function updateBuffered() {
        const m = S && S.media; if (!m || !m.duration || !isFinite(m.duration)) { ui.buf.style.transform = 'scaleX(0)'; return; }
        let end = 0;
        for (let i = 0; i < m.buffered.length; i++) if (m.buffered.start(i) <= m.currentTime + 0.5) end = Math.max(end, m.buffered.end(i));
        ui.buf.style.transform = `scaleX(${clamp(end / m.duration, 0, 1)})`;
    }
    function updateProgress(force) {
        const m = S && S.media; if (!m) { ui.prog.style.transform = 'scaleX(0)'; ui.thumb.style.left = '0%'; return; }
        const d = m.duration, c = S.scrub && S.scrub.t != null ? S.scrub.t : m.currentTime;
        const p = d && isFinite(d) ? clamp(c / d, 0, 1) : 0;
        ui.prog.style.transform = `scaleX(${p})`; ui.thumb.style.left = (p * 100) + '%';
        const sec = Math.floor(c);
        if (force || sec !== S.lastSec) { S.lastSec = sec; ui.cur.textContent = fmtT(c); }
        updateBuffered();
    }
    function startTick() {
        const s = S; if (!s || s.raf) return;
        const loop = () => {
            if (S !== s || !s.media || s.media.paused) { s.raf = 0; return; }
            updateProgress(false); s.raf = requestAnimationFrame(loop);
        };
        s.raf = requestAnimationFrame(loop);
    }
    function togglePlay() {
        const m = S && S.media; if (!m) return;
        if (m.ended) { m.currentTime = 0; }
        if (m.paused) { const p = m.play(); if (p && p.catch) p.catch(() => { }); } else m.pause();
    }
    function seekBy(d) {
        const m = S && S.media; if (!m || !isFinite(m.duration)) return;
        m.currentTime = clamp(m.currentTime + d, 0, m.duration);
        toast((d > 0 ? '+' : '−') + Math.abs(d) + ' s'); updateProgress(true);
    }
    function setVolume(v) {
        const m = S && S.media; if (!m) return;
        v = clamp(v, 0, 1); m.volume = v; m.muted = v === 0; toast('Volume ' + Math.round(v * 100) + '%');
    }
    function setSpeed(r) {
        const m = S && S.media; if (!m) return;
        m.playbackRate = r; toast(r + '×');
    }
    function stepSpeed(d) {
        const m = S && S.media; if (!m) return;
        let i = SPEEDS.findIndex(x => x >= m.playbackRate - 1e-6); if (i < 0) i = SPEEDS.length - 1;
        setSpeed(SPEEDS[clamp(i + d, 0, SPEEDS.length - 1)]);
    }
    function toggleLoop() {
        const m = S && S.media; if (!S) return;
        S.loop = !S.loop; if (m) m.loop = S.loop; ui.loop.classList.toggle('on', S.loop); toast(S.loop ? 'Loop on' : 'Loop off');
    }
    function togglePip() {
        const m = S && S.media; if (!m || S.mode !== 'video') return;
        if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { });
        else if (m.requestPictureInPicture) m.requestPictureInPicture().catch(() => toast('Picture-in-picture is not available'));
    }

    function bindSeek() {
        const seek = ui.seek, frac = e => { const r = seek.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
        const flush = () => {
            const sc = S && S.scrub; if (!sc) return;
            sc.f = 0;
            if (S.media && sc.t != null) { try { S.media.currentTime = sc.t; } catch (e) { } }
        };
        seek.addEventListener('pointerdown', e => {
            const m = S && S.media; if (!m || !isFinite(m.duration) || e.button > 0) return;
            e.preventDefault(); seek.setPointerCapture(e.pointerId);
            S.scrub = { was: !m.paused, t: frac(e) * m.duration, f: 0 };
            if (S.scrub.was) m.pause();
            seek.classList.add('active'); updateProgress(true);
            S.scrub.f = requestAnimationFrame(flush);
        });
        seek.addEventListener('pointermove', e => {
            const m = S && S.media, r = seek.getBoundingClientRect();
            if (m && isFinite(m.duration)) {
                const f = frac(e);
                ui.tip.textContent = fmtT(f * m.duration); ui.tip.style.left = clamp(e.clientX - r.left, 24, r.width - 24) + 'px';
                if (S.scrub) { S.scrub.t = f * m.duration; updateProgress(true); if (!S.scrub.f) S.scrub.f = requestAnimationFrame(flush); }
            }
        });
        const end = e => {
            const sc = S && S.scrub; if (!sc) return;
            cancelAnimationFrame(sc.f);
            if (S.media && sc.t != null) { try { S.media.currentTime = sc.t; } catch (x) { } }
            const was = sc.was; S.scrub = null; seek.classList.remove('active'); updateProgress(true);
            if (was && S.media) { const p = S.media.play(); if (p && p.catch) p.catch(() => { }); }
        };
        seek.addEventListener('pointerup', end); seek.addEventListener('pointercancel', end);
    }

    function startViz() {
        const s = S; if (!s || s.mode !== 'audio' || !s.media || s.viz) return;
        const cv = ui.stage.querySelector('.rdp-viz'); if (!cv) return;
        const ctx = cv.getContext('2d');
        let an = null;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                if (!startViz.ac) startViz.ac = new AC();
                if (startViz.ac.state === 'suspended') startViz.ac.resume().catch(() => { });
                if (startViz.ac.state === 'running') {
                    const src = startViz.ac.createMediaElementSource(s.media);
                    an = startViz.ac.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = 0.8;
                    src.connect(an); an.connect(startViz.ac.destination);
                    s.viz = { src, raf: 0 };
                }
            }
        } catch (e) { an = null; }
        if (!s.viz) s.viz = { src: { disconnect() { } }, raf: 0 };
        const bars = 40, data = an ? new Uint8Array(an.frequencyBinCount) : null, vals = new Array(bars).fill(0);
        const draw = () => {
            if (S !== s || !s.viz) return;
            const w = cv.width, h = cv.height; ctx.clearRect(0, 0, w, h);
            if (an) an.getByteFrequencyData(data);
            const bw = w / bars;
            for (let i = 0; i < bars; i++) {
                const target = an && !s.media.paused ? (data[Math.floor(i * data.length * 0.7 / bars)] / 255) : (s.media.paused ? 0 : 0.15 + 0.1 * Math.sin(Date.now() / 200 + i));
                vals[i] += (target - vals[i]) * 0.35;
                const bh = Math.max(3, vals[i] * h * 0.95);
                ctx.fillStyle = `hsl(${210 + i * 2}, 85%, ${55 + vals[i] * 15}%)`;
                const x = i * bw + bw * 0.15, y = (h - bh) / 2, ww = bw * 0.7, r = Math.min(ww / 2, bh / 2);
                ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + bh, r); ctx.arcTo(x + ww, y + bh, x, y + bh, r);
                ctx.arcTo(x, y + bh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.fill();
            }
            s.viz.raf = requestAnimationFrame(draw);
        };
        draw();
    }

    function showError(kind) {
        const s = S; if (!s) return;
        const it = s.cur.item, ext = (it.ext || '').toUpperCase() || 'this';
        setLoading(false); setBuffering(false);
        ui.stage.innerHTML = ''; ui.bar.hidden = true;
        const h = ui.err.querySelector('h3'), p = ui.err.querySelector('p'), b = ui.err.querySelector('.rdp-ebtns');
        
        // Fallback check: if `it.isUploading` wasn't passed for some reason, check the current state in the list
        const isUp = it.isUploading || (s.list.find(x => x.id === it.id) || {}).isUploading;
        
        if (isUp) {
            h.textContent = "File is still uploading";
            p.textContent = "This file is still being uploaded. You cannot preview it properly until the upload is complete.";
            b.innerHTML = '<button class="rdp-pill ghost" data-a="close">Close</button>';
            ui.err.hidden = false;
            return;
        }
        
        if (kind === 'image') {
            h.textContent = "This picture can't be displayed";
            p.textContent = `Your browser couldn't decode this ${ext} image. Formats such as HEIC, TIFF or RAW are only supported by some browsers (Safari opens HEIC and TIFF). You can still save the file.`;
        } else {
            h.textContent = "This file can't be played here";
            p.textContent = `Your browser couldn't decode this ${ext} ${kind}. The container or codec (for example HEVC/H.265, AC-3, DTS, or an old AVI/WMV/FLV codec) isn't supported. Chrome and Edge play H.264, VP8/VP9 and AV1; Safari plays HEVC. Save the file and open it in a desktop player such as VLC.`;
        }
        b.innerHTML = '<button class="rdp-pill" data-a="save">Save to device</button>' + (s.list.length > 1 ? '<button class="rdp-pill ghost" data-a="next">Next file</button>' : '') + '<button class="rdp-pill ghost" data-a="close">Close</button>';
        ui.err.hidden = false;
    }

    function toggleHelp(force) { ui.help.hidden = force == null ? !ui.help.hidden : !force; }

    function onClick(e) {
        const b = e.target.closest('[data-a]'); if (!b || !S) return;
        const a = b.dataset.a; e.stopPropagation(); wake();
        switch (a) {
            case 'close': close(); break;
            case 'prev': step(-1); break;
            case 'next': step(1); break;
            case 'play': togglePlay(); break;
            case 'back': seekBy(-10); break;
            case 'fwd': seekBy(10); break;
            case 'mute': { const m = S.media; if (m) { m.muted = !m.muted; if (!m.muted && m.volume === 0) m.volume = 0.5; } break; }
            case 'loop': toggleLoop(); break;
            case 'speed': ui.menu.hidden = !ui.menu.hidden; break;
            case 'setspd': setSpeed(+b.dataset.v); closeMenu(); break;
            case 'pip': togglePip(); break;
            case 'fs': toggleFS(); break;
            case 'zoomin': zoomBy(1.25); break;
            case 'zoomout': zoomBy(0.8); break;
            case 'fit': fitImage(true); break;
            case 'actual': if (S.im) zoomTo(1, 0, 0, true); break;
            case 'rotl': rotate(-90); break;
            case 'rotr': rotate(90); break;
            case 'slide': toggleSlide(); break;
            case 'save': if (S.cur && S.opts.onSave) S.opts.onSave(S.cur.item, S.cur.blob); break;
            case 'edit': {
                const c = S.cur, o = S.opts; close(true);
                if (o.onEdit) o.onEdit(c.item, c.blob, c.pwd);
                break;
            }
            case 'help': toggleHelp(); break;
        }
    }

    function onKey(e) {
        if (!S) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (document.querySelector('.ask-overlay,.toast-panel,#dlg:not([hidden])')) return;
        const t = e.target;
        if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'range'))) return;
        const k = e.key, kind = S.list[S.idx].kind, m = S.media;
        const use = fn => { e.preventDefault(); e.stopPropagation(); fn && fn(); wake(); };

        if (k === 'Escape') return use(() => { if (!ui.help.hidden) toggleHelp(false); else if (menuOpen()) closeMenu(); else close(); });
        if (k === '?') return use(() => toggleHelp());
        if (!ui.help.hidden) return use();
        if (k === 'f' || k === 'F') return use(toggleFS);
        if (k === 'PageUp') return use(() => step(-1));
        if (k === 'PageDown') return use(() => step(1));
        if (k === 'n' || k === 'N') return use(() => step(1));
        if (k === 'p' || k === 'P') return use(() => step(-1));

        if (kind === 'image') {
            switch (k) {
                case 'ArrowLeft': return use(() => step(-1));
                case 'ArrowRight': return use(() => step(1));
                case '+': case '=': return use(() => zoomBy(1.25));
                case '-': case '_': return use(() => zoomBy(0.8));
                case '0': return use(() => fitImage(true));
                case '1': return use(() => { if (S.im) zoomTo(1, 0, 0, true); });
                case 'r': return use(() => rotate(90));
                case 'R': return use(() => rotate(-90));
                case 's': case 'S': return use(() => { if (S.list.length > 1) toggleSlide(); });
                case 'Home': return use(() => show(0));
                case 'End': return use(() => show(S.list.length - 1));
            }
            return;
        }
        if (!m) return;
        switch (k) {
            case ' ': case 'k': case 'K': return use(togglePlay);
            case 'ArrowLeft': return use(() => seekBy(-5));
            case 'ArrowRight': return use(() => seekBy(5));
            case 'j': case 'J': return use(() => seekBy(-10));
            case 'l': return use(() => seekBy(10));
            case 'L': return use(toggleLoop);
            case 'ArrowUp': return use(() => setVolume((m.muted ? 0 : m.volume) + 0.05));
            case 'ArrowDown': return use(() => setVolume((m.muted ? 0 : m.volume) - 0.05));
            case 'm': case 'M': return use(() => { m.muted = !m.muted; toast(m.muted ? 'Muted' : 'Volume ' + Math.round(m.volume * 100) + '%'); });
            case '<': return use(() => stepSpeed(-1));
            case '>': return use(() => stepSpeed(1));
            case ',': if (!m.paused) return; return use(() => { m.currentTime = Math.max(0, m.currentTime - 1 / 30); });
            case '.': if (!m.paused) return; return use(() => { m.currentTime = Math.min(m.duration || 0, m.currentTime + 1 / 30); });
            case 'Home': return use(() => { m.currentTime = 0; });
            case 'End': return use(() => { if (isFinite(m.duration)) m.currentTime = m.duration; });
        }
        if (/^[0-9]$/.test(k) && isFinite(m.duration)) return use(() => { m.currentTime = m.duration * (+k / 10); updateProgress(true); toast(k + '0%'); });
    }

    window.RDPlayer = { open, close: () => close(), isOpen: () => !!S };
})();


// =========================================================================
// RetroDisk App
// =========================================================================
(async function () {
    'use strict';

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
    let wPending = null;
    const useWorker = () => {
        try {
            wkr = new Worker('worker.js');
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

    const isInside = async (id, anc) => {
        let cur = id;
        for (let g = 0; cur && cur !== R && cur !== TRASH && g < 500; g++) {
            if (cur === anc) return true;
            const n = await node(cur); cur = n && n.parentId;
        }
        return cur === anc;
    };

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
        if (activeBackend === 'OPFS') { try { return await (await getFhOPFS(id, false)).getFile(); } catch (e) { } }
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

    const updateStatsUI = async () => {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                EST = await navigator.storage.estimate();
                const q = EST.quota || 0, p = q ? Math.min(100, (EST.usage / q) * 100) : 0;
                $('#meterFill').style.width = p + '%';
                $('#meterFill').style.background = p > 85 ? '#e79a8c' : p > 60 ? '#f0d27a' : '#96d873';
                $('#sbUsed').textContent = fmtSz(EST.usage);
                $('#sbQuota').textContent = q ? fmtSz(q) : 'Unknown';
            }
        } catch (e) {}
    };

    const proc = async (file, pwd, nd) => {
        if (pwd && !subtleOK()) throw new Error('Encryption needs HTTPS or localhost.');
        const tot = Math.ceil(file.size / C);
        const comp = typeof CompressionStream !== 'undefined' && file.size < 100 * 1024 * 1024 && (file.type.startsWith('text/') || file.type === 'application/json');
        const salt = crypto.getRandomValues(new Uint8Array(16)), sHex = bytesToHex(salt);
        nd.salt = Array.from(salt);
        nd.compressed = comp;

        let writ = null;
        let chunks = [];
        
        if (activeBackend === 'OPFS') writ = await (await getFhOPFS(nd.id, true)).createWritable();
        
        for (let i = 0; i < tot; i++) {
            const c = await file.slice(i * C, Math.min((i + 1) * C, file.size)).arrayBuffer();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const buf = await runChunk({ chunk: c, compress: comp, password: pwd || null, saltHex: sHex, ivHex: bytesToHex(iv) });
            
            nd.ivs.push(Array.from(iv));
            nd.chunkSizes.push(buf.byteLength);
            nd.compSize += buf.byteLength;

            if (writ) await writ.write(new Uint8Array(buf)); 
            else chunks.push(new Uint8Array(buf));

            await req(sto(N, 'readwrite').put(nd));
            
            await updateStatsUI(); // Update sidebar live
            
            if (nd.parentId === st.cwd) {
                const item = st.items.find(x => x.id === nd.id);
                if (item) Object.assign(item, nd);
                const label = document.querySelector(`.row[data-id="${nd.id}"] .label`);
                if (label) {
                    const pct = Math.round(((i + 1) / tot) * 100);
                    label.innerHTML = `${esc(nd.name)} <span style="color:var(--t1);font-size:9px;">(${pct}%)</span>`;
                }
            }
            await sleep(0);
        }
        
        if (writ) await writ.close();
        else await writeBlob(nd.id, new Blob(chunks));
        
        // Mark as finished immediately in the DB
        nd.isUploading = false;
        await req(sto(N, 'readwrite').put(nd));
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

    const getBlob = async (nd, pwd) => {
        try {
            const raw = await readBlob(nd.id);
            if (!raw) return null;
            if (!nd.encrypted && !nd.compressed) return raw;
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
        } catch (e) { console.error(e); return null; }
    };

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
            <div class="row${st.sel.has(it.id) ? ' sel' : ''}${it.isUploading ? ' uploading' : ''}" data-id="${esc(it.id)}" draggable="${st.cwd !== TRASH && !it.isUploading}">
                <div class="col name"><span class="ico">${icon(it, st.isGrid ? 48 : 16)}</span><span class="label">${esc(it.name)} ${it.isUploading ? '<span style="color:var(--t1);font-size:9px;">(Uploading...)</span>' : ''}</span></div>
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
        try { if (navigator.storage && navigator.storage.estimate) EST = await navigator.storage.estimate(); } catch (e) { }
        const q = EST.quota || 0, p = q ? Math.min(100, (EST.usage / q) * 100) : 0;
        $('#meterFill').style.width = p + '%';
        $('#meterFill').style.background = p > 85 ? '#e79a8c' : p > 60 ? '#f0d27a' : '#96d873';
        $('#sbUsed').textContent = fmtSz(EST.usage);
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
        $('#sbDownload').disabled = $('#tbDownload').disabled = !any || n.some(i => i.isUploading);
        $('#sbDownloadZip').disabled = $('#tbDownloadZip').disabled = !any || n.some(i => i.isUploading);
        $('#sbDelete').disabled = $('#tbDelete').disabled = !any || n.some(i => i.isUploading);
        $('#stSel').textContent = any ? n.length + ' selected' : 'None selected';
    };

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
        if (seq !== refreshSeq) return;
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

    const ask = (nd, err) => new Promise(res => {
        const b = document.createElement('div'); b.className = 'modal-back ask-overlay'; b.style.zIndex = '6000';
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
                    if (parent === st.cwd) {
                        st.items.push(nd);
                        render();
                    }
                }
                parent = cache.get(path);
            }
            return parent;
        };
    };

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
            
            // Phase 1: Pre-create all nodes so they appear instantly
            stat('Preparing files...');
            const queue = [];
            for (const it of items) {
                const parent = await resolve(it.dirs);
                if (!it.file) continue;
                
                const name = await uniq(clean(it.file.name || 'untitled') || 'untitled', parent);
                const id = uid();
                const nd = {
                    id, parentId: parent, name, kind: 'file', mime: it.file.type || 'application/octet-stream',
                    size: it.file.size, compSize: 0, compressed: false,
                    encrypted: !!o?.pwd, encVer: 2, salt: null, ivs: [], chunkSizes: [],
                    thumb: null, hash: null, created: Date.now(), modified: it.file.lastModified || Date.now(),
                    isUploading: true
                };
                if (o?.hint) nd.hint = o.hint;
                if (o?.ro) nd.ro = true;
                
                await req(sto(N, 'readwrite').add(nd));
                if (parent === st.cwd) {
                    st.items.push(nd);
                    if (st.items.length % 20 === 0) { render(); await sleep(0); }
                }
                queue.push({ file: it.file, nd, pwd: o?.pwd || null });
            }
            render();
            await sleep(50); // yield to UI

            // Phase 2: Process the queue sequentially
            for (const { file, nd, pwd } of queue) {
                try {
                    stat(`Uploading ${++n}/${files.length}: ${file.name}`);
                    await proc(file, pwd, nd);
                    
                    // Mark as finished visually FIRST
                    nd.isUploading = false;
                    if (nd.parentId === st.cwd) {
                        const item = st.items.find(x => x.id === nd.id);
                        if (item) Object.assign(item, nd);
                        render(); // Instant visual update!
                    }
                    
                    // Then compute hash and save to DB
                    nd.hash = await hashBlob(file);
                    await req(sto(N, 'readwrite').put(nd));

                    // Generate thumbnail in background
                    if (!pwd) {
                        thumb(file).then(th => {
                            if (th) {
                                nd.thumb = th;
                                req(sto(N, 'readwrite').put(nd)).then(() => {
                                    if (nd.parentId === st.cwd) {
                                        const ico = document.querySelector(`.row[data-id="${nd.id}"] .ico`);
                                        if (ico) ico.innerHTML = icon(nd, st.isGrid ? 48 : 16);
                                    }
                                });
                            }
                        }).catch(()=>{});
                    }
                    ok++;
                } catch (e) {
                    failed++; lastErr = e.message; console.error(e); stat(`Failed: ${file.name} — ${e.message}`); await sleep(800);
                    if (nd.parentId === st.cwd) {
                        st.items = st.items.filter(x => x.id !== nd.id);
                        render();
                    }
                }
            }
            
            await refresh();
            stat(`Added ${ok} of ${files.length} file(s).${failed ? ' ' + failed + ' failed' + (lastErr ? ' (' + lastErr + ')' : ' or were unreadable') + '.' : ''}`);
        } finally { busy = false; }
    };

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

    const playMedia = (n) => {
        const mediaItems = st.items.filter(i => i.kind === 'file' && ['image', 'video', 'audio'].includes(cat(i).cat));
        const list = mediaItems.map(i => ({
            id: i.id, name: i.name, kind: cat(i).cat, mime: i.mime, size: i.size, ext: extOf(i.name), editable: EDITABLE_IMG.includes(extOf(i.name)),
            isUploading: i.isUploading // <--- Pass this to the player
        }));
        const index = list.findIndex(i => i.id === n.id);
        RDPlayer.open({
            list,
            index: index >= 0 ? index : 0,
            load: async (item) => {
                const realNode = st.items.find(i => i.id === item.id);
                const r = await openNode(realNode);
                if (!r) return null;
                return { blob: r.blob, pwd: r.pwd };
            },
            onSave: (item, blob) => saveBlob(blob, item.name),
            onEdit: (item, blob, pwd) => {
                const realNode = st.items.find(i => i.id === item.id);
                openImgEditor(realNode, blob, pwd);
            },
            onClose: () => { }
        });
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
        const c = cat(n).cat;
        
        if (['image', 'video', 'audio'].includes(c)) {
            playMedia(n);
            return;
        }

        if (pvNode) closePreview();
        const r = await openNode(n);
        if (!r) return;
        const b = r.blob, pwd = r.pwd, u = URL.createObjectURL(b);
        purls.push(u); pvNode = n;

        $('#modalTitle').textContent = n.name;
        $('#modalInfo').textContent = `${cat(n).label} • ${fmtSz(n.size)}${n.ro ? ' • Read-once: deleted when closed' : ''}`;
        $('#modalSaveBtn').hidden = true; $('#modalSaveAsBtn').hidden = true;
        $('#modalDownloadBtn').onclick = () => saveBlob(b, n.name);
        $('#modal').hidden = false;

        if (c === 'pdf') {
            $('#modalBody').innerHTML = `<iframe src="${u}"></iframe>`;
        } else if (c === 'text') {
            const big = b.size > MAX_TEXT;
            const text = await (big ? b.slice(0, 200 * 1024) : b).text();
            const ext = extOf(n.name), sb = $('#modalSaveBtn');
            const crlf = text.includes('\r\n');
            const enterEdit = () => {
                $('#modalBody').innerHTML = '<textarea class="editor" spellcheck="false"></textarea>';
                $('#modalBody textarea').value = text;
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
                if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    v.innerHTML = DOMPurify.sanitize(marked.parse(text));
                    v.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
                    v.querySelectorAll('img').forEach(im => {
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

    // ---------- steganography ----------
    const lsbIdx = k => ((k / 3) | 0) * 4 + (k % 3);
    const loadPixels = async file => {
        const img = new Image(), u = URL.createObjectURL(file);
        try { img.src = u; await img.decode(); } finally { URL.revokeObjectURL(u); }
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        return { c, ctx, id: ctx.getImageData(0, 0, c.width, c.height) };
    };
    const STEG_MAGIC = [0x52, 0x44, 0x53, 0x31];

    // ---------- event wiring ----------
    const anyModal = () => !!document.querySelector('.modal-back:not([hidden])') || !!document.querySelector('.toast-panel');

    const showCtx = (x, y, full) => {
        const c = $('#ctx-menu'), sel = selNodes(), one = sel.length === 1 ? sel[0] : null, tr = st.cwd === TRASH;
        const isImg = !!one && one.kind === 'file' && cat(one).cat === 'image';
        const vis = {
            open: !!one && (!tr || one.kind === 'folder') && !one.isUploading,
            edit: !!one && one.kind === 'file' && cat(one).cat === 'text' && !tr && !one.isUploading,
            download: sel.some(i => i.kind === 'file' && !i.isUploading),
            properties: !!one && !one.isUploading,
            copy: sel.length > 0 && !tr && !sel.some(i => i.isUploading),
            cut: sel.length > 0 && !tr && !sel.some(i => i.isUploading),
            paste: !!clipboard.action && !tr,
            quickaccess: !!one && !tr && !one.isUploading,
            tag: sel.length > 0 && !tr && !sel.some(i => i.isUploading),
            wallpaper: isImg && !tr && !one.isUploading,
            img_edit: isImg && EDITABLE_IMG.includes(extOf(one.name)) && !tr && !one.isUploading,
            rename: !!one && !tr && !one.isUploading,
            batchrename: sel.length > 1 && !tr && !sel.some(i => i.isUploading),
            restore: tr && sel.length > 0 && !sel.some(i => i.isUploading),
            delete: sel.length > 0 && !sel.some(i => i.isUploading)
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
        if (!st.sel.size || st.cwd === TRASH || st.items.filter(i => st.sel.has(i.id)).some(i => i.isUploading)) return false;
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

        // --- MARQUEE SELECTION ---
        let isMarquee = false, mqStart = { x: 0, y: 0 }, mqBox = null;

        $('#listbody').addEventListener('mousedown', e => {
            if (e.target.closest('.row') || e.button !== 0) return;
            isMarquee = true;
            const rect = $('#listbody').getBoundingClientRect();
            mqStart = { x: e.clientX - rect.left + $('#listbody').scrollLeft, y: e.clientY - rect.top + $('#listbody').scrollTop };
            mqBox = document.createElement('div'); mqBox.className = 'marquee-box';
            Object.assign(mqBox.style, { left: mqStart.x + 'px', top: mqStart.y + 'px', width: '0', height: '0' });
            $('#listbody').appendChild(mqBox);
            if (!e.ctrlKey && !e.metaKey) { st.sel.clear(); selChanged(); }
        });

        window.addEventListener('mousemove', e => {
            if (!isMarquee || !mqBox) return;
            const rect = $('#listbody').getBoundingClientRect();
            const curX = e.clientX - rect.left + $('#listbody').scrollLeft;
            const curY = e.clientY - rect.top + $('#listbody').scrollTop;
            const left = Math.min(mqStart.x, curX), top = Math.min(mqStart.y, curY);
            const width = Math.abs(curX - mqStart.x), height = Math.abs(curY - mqStart.y);
            Object.assign(mqBox.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });
            
            const boxRect = { left, top, right: left + width, bottom: top + height };
            let changed = false;
            $('#listbody').querySelectorAll('.row').forEach(r => {
                const rRect = r.getBoundingClientRect();
                const rRel = {
                    left: rRect.left - rect.left + $('#listbody').scrollLeft,
                    top: rRect.top - rect.top + $('#listbody').scrollTop,
                    right: rRect.right - rect.left + $('#listbody').scrollLeft,
                    bottom: rRect.bottom - rect.top + $('#listbody').scrollTop
                };
                const isInside = !(boxRect.right < rRel.left || boxRect.left > rRel.right || boxRect.bottom < rRel.top || boxRect.top > rRel.bottom);
                const has = st.sel.has(r.dataset.id);
                if (isInside && !has) { st.sel.add(r.dataset.id); changed = true; }
                else if (!isInside && has && !e.ctrlKey && !e.metaKey) { st.sel.delete(r.dataset.id); changed = true; }
            });
            if (changed) selChanged();
        });

        window.addEventListener('mouseup', e => {
            if (!isMarquee) return;
            isMarquee = false;
            if (mqBox) { mqBox.remove(); mqBox = null; }
        });

        // internal drag & drop (move)
        $('#listbody').ondragstart = e => {
            const r = e.target.closest('.row');
            if (!r || st.cwd === TRASH || st.items.filter(i => st.sel.has(i.id)).some(i => i.isUploading)) return e.preventDefault();
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
            if (!n || n.kind !== 'folder' || dragIds.includes(n.id) || n.isUploading) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            clearOver(); r.classList.add('drag-over');
        };
        $('#listbody').ondrop = async e => {
            if (!dragIds) return;
            const ids = dragIds; dragIds = null; clearOver();
            const r = e.target.closest('.row');
            const n = r && st.items.find(i => i.id === r.dataset.id);
            if (n && n.kind === 'folder' && !ids.includes(n.id) && !n.isUploading) { e.preventDefault(); e.stopPropagation(); await moveIds(ids, n.id); }
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
            const fs = selNodes().filter(i => i.kind === 'file' && !i.isUploading);
            if (!fs.length) return rtcStatus('Select one or more finished files in the main window first.');
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
