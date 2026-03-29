import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore 
} from "@thehackingguard/mahiru-baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

global.plugins = {};

async function startBot() {
    // 1. AUTO-LOAD PLUGINS (Tetap sama)
    const pluginFolder = path.join(__dirname, "Plugin");
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);
    const pluginFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith(".js"));

    for (const file of pluginFiles) {
        try {
            const module = await import(`./Plugin/${file}?update=${Date.now()}`);
            global.plugins[file] = module.default || module;
        } catch (e) {
            console.error(`Gagal memuat plugin ${file}:`, e);
        }
    }

    // 2. SETUP KONEKSI
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket.default({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // Karena pakai pairing
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        // Browser harus Chrome/Safari agar pairing code bekerja
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    // 3. LOGIKA PAIRING CODE (Sesuai spek Mahiru)
    if (!sock.authState.creds.registered) {
        console.log("🛡️✨ MAHIRU-BAILEYS PAIRING ✨🛡️");
        const phoneNumber = await question('Masukkan nomor WhatsApp (628xxx): ');
        
        // Menggunakan key default 'SHINNAMD' sesuai dokumentasi
        const code = await sock.requestPairingCode(phoneNumber.trim(), "SHINNAMD");
        console.log(`\nKODE PAIRING ANDA: ${code}\n`);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Mahiru-Baileys Berhasil Terhubung!");
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.remoteJid === 'status@broadcast') return;

            const { handler } = await import(`./handler.js?update=${Date.now()}`);
            await handler(sock, m);
        } catch (err) {
            console.error(err);
        }
    });
}

startBot();