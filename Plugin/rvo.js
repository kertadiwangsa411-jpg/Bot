import { downloadContentFromMessage } from "@thehackingguard/mahiru-baileys";

const plugin = {
    command: ["rvo", "lihat", "viewonce"],
    exec: async (sock, m, { from }) => {
        try {
            // 1. Ambil data pesan yang di-reply (quoted)
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // 2. Cek apakah ada pesan yang di-reply
            if (!quoted) return sock.sendMessage(from, { text: "Reply pesan view once-nya!" }, { quoted: m });

            // 3. Ambil konten view once (mendukung versi V2 atau lama)
            const viewOnce = quoted.viewOnceMessageV2?.message || quoted.viewOnceMessage?.message;
            if (!viewOnce) return sock.sendMessage(from, { text: "Itu bukan pesan View Once!" }, { quoted: m });

            // 4. Tentukan tipe media (image atau video)
            const mimeType = Object.keys(viewOnce)[0]; // Menghasilkan 'imageMessage' atau 'videoMessage'
            const mediaData = viewOnce[mimeType];

            // 5. Proses Download Manual di dalam Plugin
            const stream = await downloadContentFromMessage(
                mediaData, 
                mimeType.replace('Message', '') // Mengubah 'imageMessage' jadi 'image'
            );

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 6. Kirim Balik
            const caption = mediaData.caption || "";
            if (mimeType === 'imageMessage') {
                await sock.sendMessage(from, { image: buffer, caption: `[ RVO SUCCESS ]\n${caption}` }, { quoted: m });
            } else if (mimeType === 'videoMessage') {
                await sock.sendMessage(from, { video: buffer, caption: `[ RVO SUCCESS ]\n${caption}` }, { quoted: m });
            }

        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: "Gagal mengambil media. Mungkin sudah kadaluwarsa." }, { quoted: m });
        }
    }
};

export default plugin;
