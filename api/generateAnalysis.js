export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }
  
  // Gunakan model yang lebih baru jika tersedia, atau flash untuk kecepatan
  const generationApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  // Ambil data jawaban dari front-end
  const { answers } = req.body; 

  const systemPrompt = `Anda adalah Analis Performa Rekrutmen. Analisis hasil kuis TKB BUMN.
BERIKAN ANALISIS YANG MENDALAM:
1.  Identifikasi kategori soal kuat/lemah.
2.  Pujian untuk jawaban benar sulit.
3.  Jelaskan kesalahan konsep untuk jawaban salah.
4.  Saran konkret.
ATURAN FORMATTING: JANGAN GUNAKAN LATEX. Gunakan teks biasa.`;

  const userQuery = `Analisis hasil ini:\n${JSON.stringify(answers, null, 2)}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
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
    
    // Kirimkan hasil (teks biasa) kembali ke front-end
    res.status(200).json({ text: result.candidates[0].content.parts[0].text });

  } catch (error) {
    console.error("Error di backend generateAnalysis:", error);
    res.status(500).json({ error: error.message });
  }
}