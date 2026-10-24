// Load Argon2 for encryption inside the worker
try {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/argon2-browser/1.18.0/argon2-bundled.min.js');
} catch (e) { console.warn('Argon2 not available in worker'); }

let opfDirHandle = null;

self.onmessage = async (e) => {
    const { action, opfDir, chunk, compress, password, salt, algorithm, kdf, fileId, offset } = e.data;
    
    // 1. Initialize with OPFS Directory Handle
    if (action === 'init') {
        opfDirHandle = opfDir;
        self.postMessage({ ok: true, type: 'init' });
        return;
    }

    // 2. Process and Write Chunk
    if (action === 'process') {
        try {
            let buf = chunk;
            
            // Compression
            if (compress) {
                const cs = new CompressionStream('gzip');
                buf = await new Response(new Blob([buf]).stream().pipeThrough(cs)).arrayBuffer();
            }

            let encryptedBuf = buf;
            let iv = null;

            // Encryption
            if (password) {
                let keyBytes;
                if (kdf === 'argon2id' && typeof argon2 !== 'undefined') {
                    const result = await argon2.hash({
                        pass: password, salt: salt, time: 3, mem: 65536, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id
                    });
                    keyBytes = result.hash;
                } else {
                    const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
                    const key = await crypto.subtle.deriveKey(
                        { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 600000, hash: 'SHA-256' },
                        baseKey, { name: algorithm, length: 256 }, true, ['encrypt']
                    );
                    keyBytes = await crypto.subtle.exportKey('raw', key);
                }

                const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: algorithm }, false, ['encrypt']);
                iv = crypto.getRandomValues(new Uint8Array(12));
                encryptedBuf = await crypto.subtle.encrypt({ name: algorithm, iv }, cryptoKey, buf);
            }

            const finalBuffer = new Uint8Array(encryptedBuf);

            // SUPER-FAST SYNC DISK WRITE (Chromium only)
            if (opfDirHandle && fileId) {
                try {
                    const fileHandle = await opfDirHandle.getFileHandle(fileId, { create: true });
                    // This bypasses the main thread completely and writes directly to disk
                    const accessHandle = await fileHandle.createSyncAccessHandle();
                    accessHandle.write(finalBuffer, { at: offset });
                    accessHandle.flush();
                    accessHandle.close();
                    
                    self.postMessage({ 
                        ok: true, 
                        syncWritten: true, 
                        size: finalBuffer.byteLength, 
                        iv: iv ? Array.from(iv) : null, 
                        algorithm: password ? algorithm : null, 
                        kdf: password ? kdf : null, 
                        compressed: compress 
                    });
                    return; // Exit early since we already wrote to disk
                } catch (diskErr) {
                    console.warn("Sync write failed, falling back to main thread", diskErr);
                }
            }

            // Fallback for Firefox/Safari (Return buffer to main thread to write)
            self.postMessage({ 
                ok: true, 
                syncWritten: false,
                buf: encryptedBuf, 
                iv: iv ? Array.from(iv) : null, 
                algorithm: password ? algorithm : null, 
                kdf: password ? kdf : null, 
                compressed: compress 
            });

        } catch (err) {
            self.postMessage({ ok: false, error: err.message });
        }
    }
};
