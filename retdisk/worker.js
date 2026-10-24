self.onmessage = async (e) => {
    const { chunk, compress, password, saltHex, ivHex } = e.data;
    try {
        let buf = chunk;
        if (compress) {
            const cs = new CompressionStream('gzip');
            buf = await new Response(new Blob([buf]).stream().pipeThrough(cs)).arrayBuffer();
        }
        let meta = { compressed: compress, encrypted: !!password, salt: null, iv: null };
        if (password) {
            const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
            const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
            meta.salt = Array.from(salt);
            meta.iv = Array.from(iv);
            const key = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
                await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]),
                { name: "AES-GCM", length: 256 }, false, ["encrypt"]
            );
            buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, buf);
        }
        self.postMessage({ ok: true, buf, meta });
    } catch (err) {
        self.postMessage({ ok: false, error: err.message });
    }
};
