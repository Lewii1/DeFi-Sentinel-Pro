const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

let cacheData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/yields', async (req, res) => {
    try {
        const now = Date.now();
        if (cacheData && (now - lastFetchTime < CACHE_DURATION)) return res.json(cacheData);
        console.log("Descargando datos nuevos (Paciencia: 30s)...");
        const response = await fetchWithTimeout('https://yields.llama.fi/pools');
        const data = await response.json();
        cacheData = data;
        lastFetchTime = now;
        console.log("¡Datos actualizados con éxito!");
        res.json(data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: "Revisa tu conexión" });
    }
});

app.listen(PORT, () => console.log(`Sentinel Pro activo en http://localhost:${PORT}`));