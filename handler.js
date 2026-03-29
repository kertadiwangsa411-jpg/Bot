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
        
        // Penanganan ID Pengirim (Support LID)
        const sender = isGroup 
            ? (m.key.participant || m.participant || from) 
            : (m.key.fromMe ? sock.user.id : from);

        const pushname = m.pushName || "User";
        const isOwner = config.owner.some(ownerNum => sender.includes(ownerNum));

        // 3. LOGIKA PEMANGGILAN PLUGIN (FULL AUTO-LOAD)
        if (!isCmd) return; // Jika bukan command, abaikan saja

        for (let name in global.plugins) {
            let plugin = global.plugins[name];

            // Cek kecocokan command di file plugin
            if (plugin.command && (
                Array.isArray(plugin.command) 
                ? plugin.command.includes(command) 
                : plugin.command === command
            )) {
                
                // Cek Izin Akses (Hanya Owner/Grup)
                if (plugin.owner && !isOwner) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini khusus Owner!" }, { quoted: m });
                    break;
                }

                if (plugin.group && !isGroup) {
                    await sock.sendMessage(from, { text: "❌ Fitur ini hanya untuk di dalam Grup!" }, { quoted: m });
                    break;
                }

                // Eksekusi fungsi utama di file plugin
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
                
                break; // Hentikan loop jika command sudah ditemukan dan dieksekusi
            }
        }

    } catch (err) {
        console.error("Handler Error:", err);
    }
}