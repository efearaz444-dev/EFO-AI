const express = require('express');
const cors = require('cors');
const { search } = require('duck-duck-scrape'); // Canlı internet araması için siber motor

console.log("1. Adım: Express, Cors ve Arama kütüphaneleri yüklendi.");

const app = express();
app.use(cors());
// Görseller (Base64) yüksek boyutlu olabileceği için sınırı artırıyoruz reis
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(__dirname));

console.log("2. Adım: Express middleware ayarları yapıldı.");

const groqApiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6,
    process.env.GROQ_API_KEY_7,
    process.env.GROQ_API_KEY_8,
    process.env.GROQ_API_KEY_9,
    process.env.GROQ_API_KEY_10
].filter(key => key && key.trim() !== "");

let currentKeyIndex = 0;

function rotateGroqKey() {
    if (groqApiKeys.length > 0) {
        currentKeyIndex = (currentKeyIndex + 1) % groqApiKeys.length;
        console.log(`⚡ [SİBER DEĞİŞİM]: Limit sınırına ulaşıldı, sonraki API anahtarına geçiliyor. Aktif İndex: ${currentKeyIndex}`);
    }
}

const SYSTEM_PROMPT = `Senin adın Efo. Çok akıllı, iş bitirici, net ve hafif nüktedan bir siber asistan ve yazılımcı meslektaşsın. Kullanıcıyla iletişim kurarken kesinlikle yapmacık, aşırı duygusal veya yılışık ifadeler kullanmayacaksın. Karşılamaların samimi ama profesyonel, net ve özgüvenli olmalı. Gereksiz emoji kullanımından kaçın. Sorulara doğrudan, mantıklı ve temiz bir Markdown formatıyla cevap ver.
Sen dünyadaki her konuda uzman, ultra zeki bir siber asistansın. Tarihten yazılıma, kedi maması markalarından genel kültüre kadar HER KONUDA eksiksiz bilgiye sahipsin. Kelime ve cümle tekrarlarına asla girmeden net ve jilet gibi keskin cevaplar verirsin.

CRITICAL LANGUAGE ENFORCEMENT & STRICT RULES:
1. DİL KESİNLİKLE TÜRKÇE OLACAKTIR: Teknik kodlama terimleri hariç tüm konuşma metni %100 saf Türkçe olmak zorundadır.
2. TÜRKÇE KARAKTER ZORUNLULUĞU: Kelimelerinde TÜM HARFLERİ EKSİKSİZ YAZ (ç, ğ, ı, ö, ş, ü vb.).
3. Yapımcını Sorarlarsa: 'Yapımcım efearaz44, kendisi çok zeki profesyonel ve iş bitirici bir yazılımcıdır. Yapımcıma ulaşmak için discorddan efearaz44'e istek atabilir veya destek sunucumuza https://discord.gg/kDms9KJ9JK üzerinden ulaşabilirsiniz' cevabını verebilirsin.`;

// AKILLI HAFIZA, COOLDOWN, CANLI İNTERNET VE VİZYON DESTEKLİ ANA ROTA
app.post('/ask', async (req, res) => {
    console.log("/ask rotasına istek geldi.");
    // Frontend'den gelen 'image' (base64 formatında) verisini de yakalıyoruz reis
    const { prompt, historyMessages, image } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // ─── 🌐 CANLI İNTERNET ARAMA ALGORİTMASI ───
    let webResultsText = "";
    const lowerPrompt = prompt.toLowerCase();
    
    // Kullanıcı güncel bilgi, en büyük, en uzun, fiyat, hava durumu veya kimdir gibi sorular sorarsa tetiklenir
    const searchKeywords = ['en büyük', 'en uzun', 'kimdir', 'nedir', 'güncel', 'hava durumu', 'fiyatı', 'mama', 'marka', 'nüfusu', 'yüzölçümü', 'kaç km'];
    const needsSearch = searchKeywords.some(keyword => lowerPrompt.includes(keyword));

    if (needsSearch && !image) {
        try {
            console.log(`🌐 [İNTERNET ARAMASI]: "${prompt}" için canlı siber ağ taraması başlatılıyor...`);
            const searchResults = await search(prompt, { safeSearch: 0 });
            
            if (searchResults && searchResults.results && searchResults.results.length > 0) {
                // İlk 3 sonucu toplayıp robota rehber yapıyoruz reis
                webResultsText = searchResults.results.slice(0, 3).map(r => `Başlık: ${r.title}\nÖzet: ${r.description}\nKaynak: ${r.url}`).join("\n\n");
                console.log("🌐 [İNTERNET ARAMASI]: Canlı veriler başarıyla toplandı.");
            }
        } catch (searchError) {
            console.error("İnternet arama motoru hatası:", searchError.message);
        }
    }

    // ─── MESAJ PAKETİNİ HAZIRLAMA ───
    let apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    // Siber Hafıza Filtresi
    let filteredHistory = historyMessages || [];
    if (filteredHistory.length > 4) {
        filteredHistory = filteredHistory.slice(-4);
    }

    if (filteredHistory.length > 0) {
        filteredHistory.forEach(msg => {
            apiMessages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        });
    }

    // ─── 🧠 GELEN İNTERNET VERİSİNİ VE RESMİ PAKETLEME ───
    let userContent = [];

    // Eğer internetten canlı bilgi geldiyse kullanıcının mesajının başına siber rehber olarak ekliyoruz
    if (webResultsText) {
        userContent.push({
            type: "text",
            text: `[CANLI İNTERNET ARAMA SONUÇLARI]\n${webResultsText}\n\nREHBER NOTU: Yukarıdaki canlı internet verilerini kullanarak kullanıcının sorusuna uydurmadan, %100 doğru cevap ver reis. Cevabında bu arama sonuçlarından aldığın bilgileri temel al.\n\nKullanıcı Sorusu: ${prompt}`
        });
    } else {
        userContent.push({
            type: "text",
            text: prompt
        });
    }

    // Eğer frontend'den bir fotoğraf geldiyse pakete ekliyoruz (Görsel Analiz Modu)
    if (image) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: image // base64 verisi direkt buraya oturur reis
            }
        });
    }

    apiMessages.push({ role: "user", content: userContent });

    let attempt = 0;
    let maxAttempts = groqApiKeys.length > 0 ? groqApiKeys.length : 5; 
    let success = false;
    let response;

    // --- 1. AŞAMA: ANA MODEL (FOTOĞRAF VARSA VİZYON MODELİ, YOKSA STANDART MODEL) ---
    while (attempt < maxAttempts && !success) {
        let currentApiKey = groqApiKeys.length > 0 ? groqApiKeys[currentKeyIndex] : process.env.GROQ_API_KEY;

        if (!currentApiKey) {
            rotateGroqKey();
            attempt++;
            continue;
        }

        try {
            // Eğer resim yüklendiyse otomatik olarak görebilen Vision modelini seçiyoruz reis
            const activeModel = image ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: activeModel,
                    messages: apiMessages,
                    temperature: image ? 0.2 : 0.6, // Çevirilerde sapıtmaması için resim varken düşük tutuyoruz
                    top_p: 0.9,
                    max_tokens: 4096, 
                    frequency_penalty: 0.8, // Takılmayı engelleyen siber fren
                    presence_penalty: 0.6,
                    stream: true
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                if (errText.includes('rate_limit_exceeded') || response.status === 429) {
                    rotateGroqKey();
                    attempt++;
                    continue;
                } else {
                    throw new Error(`Groq API Hatası: ${errText}`);
                }
            }

            success = true;

        } catch (catchError) {
            console.error(`❌ İndex ${currentKeyIndex} hatası:`, catchError.message);
            rotateGroqKey();
            attempt++;
        }
    }

    // --- 2. AŞAMA: EĞER LİMİTLER BİTTİYSE YEDEK LİTE MODU ---
    if (!success) {
        console.warn("🚨 [KRİTİK DURUM]: EFO+ limitleri bitti, Lite Mod devrede.");
        if (apiMessages.length <= 2) {
            res.write(`⚡ **[EFO-LİTE]:** Tüm hatlar yoğun, geçici olarak hafif mod devrede.\n\n---\n\n`);
        }

        let backupAttempt = 0;
        while (backupAttempt < maxAttempts && !success) {
            let currentApiKey = groqApiKeys.length > 0 ? groqApiKeys[currentKeyIndex] : process.env.GROQ_API_KEY;
            
            try {
                response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "llama-3.1-8b-instant", 
                        messages: apiMessages,
                        temperature: 0.4,
                        top_p: 0.9,
                        max_tokens: 4096, 
                        stream: true
                    })
                });

                if (response.ok) {
                    success = true;
                } else {
                    rotateGroqKey();
                    backupAttempt++;
                }
            } catch (e) {
                rotateGroqKey();
                backupAttempt++;
            }
        }
    }

    if (!success || !response) {
        if (!res.writableEnded) {
            res.write("\n\n❌ Şuanda Sunucularımız Yoğun Daha Sonra Deneyiniz.");
            res.end();
        }
        return;
    }

    // ─── VERİ AKIŞI OKUMA ALANI (STREAMING) ───
    try {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = ""; 

        req.on('close', () => { reader.cancel(); });

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); 

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                
                if (line.startsWith('data: ')) line = line.slice(6).trim();
                if (line === '[DONE]') break;

                try {
                    const parsed = JSON.parse(line);
                    const content = parsed.choices[0]?.delta?.content || "";
                    if (content) {
                        res.write(content);
                    }
                } catch (e) {}
            }
        }
        res.end();
    } catch (streamError) {
        console.error("Yayın akışı okuma hatası:", streamError);
        if (!res.writableEnded) res.end();
    }
});

// ... Senin Değişmeyen Diğer /generate-title ve /delete-chat Rotaların Aynen Kalıyor reis ...
app.post('/generate-title', async (req, res) => {
    // Mevcut kodun aynen duruyor...
    const { prompt } = req.body;
    let attempt = 0; let maxAttempts = 3; let success = false; let title = "🤖 Yeni Sohbet";
    while (attempt < maxAttempts && !success) {
        let currentApiKey = groqApiKeys[currentKeyIndex] || process.env.GROQ_API_KEY;
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "Sen bir başlık oluşturucusun. Kullanıcının yazacağı isteme göre en fazla 2-3 kelimelik, başında emoji olan siber/teknolojik bir sohbet başlığı üret. Sadece başlığı döndür, başka hiçbir şey yazma." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2, top_p: 0.9,
                })
            });
            if (response.ok) { const data = await response.json(); title = data.choices[0]?.message?.content?.trim() || "🤖 Yeni Sohbet"; success = true; } else { rotateGroqKey(); attempt++; }
        } catch (error) { attempt++; }
    }
    res.json({ title });
});

app.post('/delete-chat', (req, res) => { res.json({ success: true }); });

try {
    app.listen(3000, () => {
        console.log("=========================================");
        console.log("Efo AI Engine 3000 portunda Canlı İnternet ve Vision Aktif!");
        console.log("=========================================");
    });
} catch (listenError) {
    console.error("Sunucu başlatılırken port hatası:", listenError);
}