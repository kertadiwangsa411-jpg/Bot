import { config } from "./config.js";

/**
 * @param {import('@thehackingguard/mahiru-baileys').WASocket} sock 
 * @param {import('@thehackingguard/mahiru-baileys').proto.IWebMessageInfo} m 
 */
export async function handler(sock, m) {
    try {
        if (!m.message) return;

        // 1. IDENTIFIKASI TIPE & ISI PESAN
        const type = Object.keys(m.message)[0];
        
        // Mengambil teks dari berbagai jenis chat
        const body = (
            type === 'conversation' ? m.message.conversation :
            type === 'extendedTextMessage' ? m.message.extendedTextMessage.text :
            type === 'imageMessage' ? m.message.imageMessage.caption :
            type === 'videoMessage' ? m.message.videoMessage.caption :
            type === 'buttonsResponseMessage' ? m.message.buttonsResponseMessage.selectedButtonId :
            type === 'listResponseMessage' ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            type === 'templateButtonReplyMessage' ? m.message.templateButtonReplyMessage.selectedId :
            ''
        ) || '';

        // 2. SETUP VARIABEL DASAR
        // Mencari prefix yang cocok dari config
        const prefix = config.prefix.find(p => body.startsWith(p)) || "";
        const isCmd = body.startsWith(prefix) && prefix !== "";
        
        // Logika pemotongan command: menghapus prefix dan mengambil kata pertama
        const command = isCmd 
            ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() 
            : "";
            
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(" ");
        
        const from = m.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        
        // Penanganan ID Pengirim (Support LID & Multi-device)
        let sender = isGroup ? (m.key.participant || m.participant) : m.key.remoteJid;
        if (m.key.fromMe) sender = sock.user.id;
        
        // Bersihkan ID agar hanya angka saja untuk pengecekan config.owner
        const senderNumber = sender.split('@')[0].split(':')[0]; 
        const pushname = m.pushName || "User";
        
        // Cek status Owner
        const isOwner = config.owner.some(ownerNum => senderNumber === ownerNum.replace(/[^0-9]/g, ""));

        // --- DEBUGGER TERMINAL ---
        if (isCmd) {
            console.log(`\x1b[36m[ COMMAND ]\x1b[0m From: ${pushname} (${senderNumber}) | Cmd: ${command}`);
        }

        // 3. LOGIKA PEMANGGILAN PLUGIN
        if (!isCmd || !command) return; 

        for (let name in global.plugins) {
            let plugin = global.plugins[name];

            // Cek apakah plugin valid dan command-nya cocok
            if (plugin.command && (
                Array.isArray(plugin.command) 
                ? plugin.command.includes(command) 
                : plugin.command === command
            )) {
                
                // Cek Izin Akses Owner
                if (plugin.owner && !isOwner) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini khusus Owner!" }, { quoted: m });
                    break;
                }

                // Cek Izin Akses Grup
                if (plugin.group && !isGroup) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini hanya untuk di dalam Grup!" }, { quoted: m });
                    break;
                }

                // Eksekusi Plugin
                await plugin.exec(sock, m, { 
                    command, 
                    args, 
                    text, 
                    from, 
                    isGroup, 
                    sender, 
                    pushname,
                    isOwner,
                    config 
                });
                
                break; // Stop loop jika sudah ketemu
            }
        }

    } catch (err) {
        console.error("Handler Error:", err);
    }
}
