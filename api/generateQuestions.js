// Ekstensi waktu Vercel (penting agar tidak timeout)
export const config = {
  maxDuration: 30, 
};

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ambil API Key dari Vercel Environment Variable
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  const generationApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  // Ambil settings dari front-end
  const settings = req.body;

  // Logika prompt yang Anda buat (sekarang aman di backend)
  const topicMap = {
    'campuran': 'Campuran (Pengetahuan PLN, Keuangan, Operasional, SDM, Pemasaran, GCG)',
    'pln': 'Pengetahuan Umum PLN, Visi Misi, AKHLAK, RUPTL 2025-2034, dan PLN Indonesia Power',
    'keuangan': 'Manajemen Keuangan (Analisis Rasio, NPV, IRR, WACC, Pasar Modal)',
    'operasional': 'Manajemen Operasional (TQM, Six Sigma, Supply Chain, PERT/CPM, Manajemen Proyek)',
    'pemasaran': 'Manajemen Pemasaran (STP, 4P, 7P, SERVQUAL, Branding)',
    'sdm': 'Manajemen SDM (Rekrutmen, Pelatihan, Kompensasi, Penilaian Kinerja, Hubungan Industrial)',
    'strategis_gcg': 'Manajemen Strategis (SWOT, PESTEL, Porter 5 Forces) dan Good Corporate Governance (GCG, Prinsip TARIF, Teori Agensi)'
  };
  
  const selectedTopic = topicMap[settings.type] || topicMap['campuran'];
  
  const systemPrompt = `Anda adalah Asisten Ahli TKB PLN. Misi Anda adalah membuat soal Tes Kemampuan Bidang (TKB) Non-Teknik untuk rekrutmen PLN (posisi Manajemen).
PERINTAH: Buat ${settings.num} soal pilihan ganda.
TOPIK: ${selectedTopic}.
PENTING: Soal harus relevan, menantang (setara S1 Manajemen), dan fokus pada aplikasi konsep, bukan hanya hafalan.
ATURAN KUALITAS DISTRAKTOR (SANGAT KRITIS):
1.  **KESETARAAN PANJANG:** Panjang kalimat antara jawaban benar dan semua jawaban salah HARUS serupa.
2.  **KOMPLEKSITAS SERUPA:** Distraktor HARUS menggunakan terminologi dan struktur kalimat yang sama kompleksnya.
3.  **PLAUSIBILITAS:** Distraktor harus merupakan kesalahan umum yang logis.
4.  **HINDARI KATA KUNCI:** Jangan gunakan "selalu", "tidak pernah", "hanya".
ATURAN FORMATTING:
JANGAN GUNAKAN FORMAT LATEX (tanda $ atau \\rightarrow). Gunakan simbol teks biasa atau Unicode (misal: "->").
Anda HARUS mengembalikan jawaban HANYA dalam format JSON yang valid.
Pastikan ada 5 pilihan jawaban (A, B, C, D, E) untuk setiap soal.
Pastikan bidang 'a' adalah index (angka 0-4) dari jawaban yang benar.
Pastikan bidang 'e' berisi penjelasan singkat.
Pastikan bidang 't' (topik) diisi dengan kategori soal (misal: "Keuangan", "SDM").`;

  const userQuery = `Buatkan saya ${settings.num} soal TKB PLN Non-Teknik tentang ${selectedTopic}.`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          "questions": {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                "q": { "type": "STRING" },
                "o": { "type": "ARRAY", "items": { "type": "STRING", "minLength": 15 } },
                "a": { "type": "INTEGER" },
                "e": { "type": "STRING", "minLength": 30 },
                "t": { "type": "STRING" } 
              },
              required: ["q", "o", "a", "e", "t"]
            }
          }
        },
        required: ["questions"]
      }
    }
  };

  try {
    const response = await fetch(generationApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorResult = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${errorResult.error?.message || response.statusText}`);
    }

    const result = await response.json();
    
    // Kirimkan hasil (teks JSON yang sudah diparsing) kembali ke front-end
    res.status(200).json(JSON.parse(result.candidates[0].content.parts[0].text));

  } catch (error) {
    console.error("Error di backend generateQuestions:", error);
    res.status(500).json({ error: error.message });
  }
}