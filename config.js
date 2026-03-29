/**
 * Konfigurasi Utama Bot
 */

export const config = {
    // Nama Bot kamu
    name: "Kynay-Bot", 

    // Daftar nomor owner (tulis tanpa simbol + atau spasi)
    // Masukkan nomor WhatsApp kamu di sini
    owner: ["6282336479077", "6281330029099"], 

    // Simbol awalan untuk menjalankan perintah
    prefix: ["!", ".", "/"], 

    // Pengaturan tambahan (opsional)
    pairing: {
        usePairingCode: true,
        pairingNumber: "6282336479077" // Nomor bot
    },

    // Pesan respon otomatis untuk bot
    msg: {
        owner: "❌ Fitur ini hanya bisa digunakan oleh Owner!",
        group: "❌ Fitur ini hanya bisa digunakan di dalam grup!",
        wait: "⏳ Mohon tunggu, sedang diproses...",
        error: "❌ Terjadi kesalahan saat menjalankan fitur."
    }
};
