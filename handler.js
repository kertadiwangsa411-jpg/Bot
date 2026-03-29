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
        const prefix = config.prefix.find(p => body.startsWith(p)) || "";
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : "";
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(" ");
        
        const from = m.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        
        // Penanganan ID Pengirim (Support LID & Cleaning)
        let sender = isGroup ? m.key.participant : m.key.remoteJid;
        if (m.key.fromMe) sender = sock.user.id;
        
        // Bersihkan ID agar hanya angka saja (untuk pengecekan owner)
        const senderNumber = sender.replace(/[^0-9]/g, "");
        const pushname = m.pushName || "User";
        
        // Cek Owner dengan lebih teliti
        const isOwner = config.owner.some(ownerNum => senderNumber.includes(ownerNum.replace(/[^0-9]/g, "")));

        // --- DEBUGGER (Lihat di terminal apakah pesan terbaca) ---
        if (isCmd) {
            console.log(`[ COMMAND ] From: ${pushname} (${senderNumber}) | Cmd: ${command}`);
        }

        // 3. LOGIKA PEMANGGILAN PLUGIN
        if (!isCmd) return; 

        for (let name in global.plugins) {
            let plugin = global.plugins[name];

            if (plugin.command && (
                Array.isArray(plugin.command) 
                ? plugin.command.includes(command) 
                : plugin.command === command
            )) {
                
                // Izin akses Owner
                if (plugin.owner && !isOwner) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini khusus Owner!" }, { quoted: m });
                    break;
                }

                // Izin akses Grup
                if (plugin.group && !isGroup) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini hanya untuk di dalam Grup!" }, { quoted: m });
                    break;
                }

                // Eksekusi
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
                
                break; 
            }
        }

    } catch (err) {
        console.error("Handler Error:", err);
    }
}
