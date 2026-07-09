const express = require('express');
const cors = require('cors');

console.log("1. Adım: Express ve Cors kütüphaneleri yüklendi.");

const app = express();
app.use(cors());
app.use(express.json());

// index.html ve diğer statik dosyaların (style.css vb.) direkt sunucudan çekilmesi için:
app.use(express.static(__dirname));

console.log("2. Adım: Express middleware ayarları yapıldı.");

// Aktif olan tüm anahtarları Render'dan çekiyoruz
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
].filter(key => key && key.trim() !== ""); // Tamamen dolu olanları filtrele

let currentKeyIndex = 0;

// İstek rate limit yediğinde anahtarı döngüsel olarak bir sonrakiyle değiştiren fonksiyon
function rotateGroqKey() {
    if (groqApiKeys.length > 0) {
        currentKeyIndex = (currentKeyIndex + 1) % groqApiKeys.length;
        console.log(`⚡ [SİBER DEĞİŞİM]: Limit sınırına ulaşıldı, sonraki API anahtarına geçiliyor. Aktif İndex: ${currentKeyIndex}`);
    }
}

const SYSTEM_PROMPT = `Senin adın Efo. Çok akıllı, iş bitirici, net ve hafif nüktedan bir siber asistan ve yazılımcı meslektaşsın. Kullanıcıyla iletişim kurarken kesinlikle yapmacık, aşırı duygusal veya yılışık ifadeler kullanmayacaksın. Karşılamaların samimi ama profesyonel, net ve özgüvenli olmalı. Gereksiz emoji kullanımından kaçın. Sorulara doğrudan, mantıklı ve temiz bir Markdown formatıyla (başlıklar, listeler, kod blokları) cevap ver.

CRITICAL LANGUAGE ENFORCEMENT & STRICT RULES:
1. DİL KESİNLİKLE TÜRKÇE OLACAKTIR: Yanıtlarının tek bir kelimesinde bile İngilizce, İspanyolca veya başka bir yabancı dil kelime, ek ya da devşirme terim ("específik", "excelente", "halo", "specific", "actually" vb.) YER ALAMAZ! Teknik kodlama terimleri hariç tüm konuşma metni %100 saf Türkçe olmak zorundadır.
2. Tüm cümlelerin kusursuz, akıcı ve kurallı bir Türkçe ile yazılmalıdır. Yazım hatalarından, harf uyuşmazlıklarından ve dil kaymalarından tamamen kaçın. Cümle ortasında yabancı dile geçiş yapmayı kesinlikle reddet.
3. TÜRKÇE KARAKTER ZORUNLULUĞU: Kelimelerinde TÜM HARFLERİ EKSİKSİZ YAZ. (ç, ğ, ı, ö, ş, ü, G, Ş, İ, Ö, Ç, Ğ) gibi Türkçe özel harfleri her kelimede eksiksiz, doğru ve Türk Dil Kurumu (TDK) imla kurallarına tam uygun olarak kullan.
4. Senden eğer ulaşım bilgilerimizi talep ederlerse, 'Discord üzerinden yapımcıma efearaz44 yazıp arkadaş ekleyerek ulaşabilirsiniz' tarzında yanıtlar verebilirsin.
5. Seninle ilgili sorulara, "Ben Efo, bir yapay zekâ asistanıyım. Görevim kullanıcıya yardımcı olmak ve isteklerini yerine getirmektir." şeklinde cevap verebilirsin.
6. Yapımcını Sorarlaraf; 'Yapımcım efearaz44, kendisi çok zeki profosyonel ve iş bitirici bir yazılımcıdır. Yapımcıma ulaşmak için discorddan efearaz44'e istek atabilir veya destek sunucumuza https://discord.gg/kDms9KJ9JK üzerinden ulaşabilirsiniz' cevabını verebilirsin.
7. Teknik terimler hariç, günlük konuşma dilindeki tüm kelimelerin Türk Dil Kurumu (TDK) imla kurallarına uygun olmalıdır.`;

// AKILLI HAFIZA VE COOLDOWN ENTEGRELİ YENİ /ASK ROTASI
app.post('/ask', async (req, res) => {
    console.log("/ask rotasına istek geldi.");
    const { prompt, historyMessages } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Groq API'ye göndereceğimiz mesaj paketini hazırlıyoruz
    let apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    // --- SİBER HAFIZA FİLTRESİ (TOKEN SAVAR) ---
    let filteredHistory = historyMessages || [];
    if (filteredHistory.length > 4) {
        console.log(`⚠️ [SİSTEM]: Geçmiş mesaj sayısı ${filteredHistory.length}. Son 4 mesaj filtrelenerek hafızaya alınıyor.`);
        filteredHistory = filteredHistory.slice(-4);
    }

    // Filtrelenmiş sohbet geçmişini sırayla hafızaya ekliyoruz
    if (filteredHistory.length > 0) {
        filteredHistory.forEach(msg => {
            apiMessages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        });
    }

    // En son kullanıcının yazdığı anlık yeni promptu ekliyoruz
    apiMessages.push({ role: "user", content: prompt });

    let attempt = 0;
    let maxAttempts = groqApiKeys.length > 0 ? groqApiKeys.length : 5; // Kaç anahtar varsa o kadar denesin
    let success = false;
    let response;

    while (attempt < maxAttempts && !success) {
        let currentApiKey = groqApiKeys.length > 0 ? groqApiKeys[currentKeyIndex] : process.env.GROQ_API_KEY;

        if (!currentApiKey) {
            console.error("🚨 [KRİTİK HATA]: Sistemde aktif API anahtarı bulunamadı, sonraki deneniyor.");
            rotateGroqKey();
            attempt++;
            continue;
        }

        try {
            // Önce şansımızı ana modelle (EFO+) deniyoruz
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: apiMessages,
                    temperature: 0.2,
                    top_p: 0.9,
                    max_tokens: 4096, 
                    stream: true
                })
            });

            // Eğer ana model limitten dolayı patlarsa:
            if (!response.ok) {
                const errText = await response.text();
                
                if (errText.includes('rate_limit_exceeded') || response.status === 429) {
                    console.warn(`⚠️ [SİSTEM UYARISI]: Ana model sınırı aşıldı (Anahtar İndex: ${currentKeyIndex}). EFO-LİTE deneniyor.`);
                    
                    // Yedek model (EFO-LİTE) isteği fırlatıyoruz
                    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${currentApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: "llama-3.1-8b-instant",
                            messages: apiMessages,
                            temperature: 0.2,
                            top_p: 0.9,
                            max_tokens: 4096, 
                            stream: true
                        })
                    });

                    // Eğer yedek model de limitten patlarsa, bu anahtar tamamen felç olmuştur. Hata fırlat ki catch bloğuna düşüp anahtar değiştirsin!
                    if (!response.ok) {
                        const backupErrText = await response.text();
                        if (backupErrText.includes('rate_limit_exceeded') || response.status === 429) {
                            throw new Error("RATE_LIMIT_HIT");
                        } else {
                            throw new Error(`Yedek Model Hatası: ${backupErrText}`);
                        }
                    }
                } else {
                    throw new Error(`Groq API Hatası: ${errText}`);
                }
            }

            // Buraya gelebildiyse ya ana model ya da yedek model başarıyla cevap vermeye başlamıştır!
            success = true; 

        } catch (catchError) {
            if (catchError.message === "RATE_LIMIT_HIT") {
                console.log(`🔄 [OTOMATİK TAKVİYE]: İndex ${currentKeyIndex} tamamen kilitlendi. Sonraki anahtara geçiliyor...`);
                rotateGroqKey(); // Hemen havuzdaki bir sonraki anahtara geçiş yap
                attempt++;
            } else {
                console.error("Beklenmeyen siber rota hatası:", catchError.message);
                if (!res.writableEnded) {
                    res.write("\n\n❌ Şuanda Sunucularımız Yoğun Daha Sonra Deneyiniz.");
                    res.end();
                }
                return;
            }
        }
    }

    // Eğer tüm denemelere rağmen hiçbir anahtar çalışmadıysa mecbur havlu atıyoruz
    if (!success) {
        if (!res.writableEnded) {
            res.write("\n\n❌ Şuanda Sunucularımız Yoğun Daha Sonra Deneyiniz.");
            res.end();
        }
        return;
    }

    // --- VERİ AKIŞI OKUMA ALANI (STREAMING) ---
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
                } catch (e) {
                    // Bozuk veri paketlerini yutuyoruz
                }
            }
        }
        
        if (buffer && buffer.trim().startsWith('data: ')) {
            try {
                let finalLine = buffer.trim().slice(6).trim();
                if (finalLine !== '[DONE]') {
                    const parsed = JSON.parse(finalLine);
                    const content = parsed.choices[0]?.delta?.content || "";
                    if (content) {
                        res.write(content);
                    }
                }
            } catch (e) {}
        }
        
        res.end();

    } catch (streamError) {
        console.error("Yayın akışı okuma hatası:", streamError);
        if (!res.writableEnded) {
            res.end();
        }
    }
});

// OTOMATİK SOHBET BAŞLIĞI OLUŞTURUCU
app.post('/generate-title', async (req, res) => {
    console.log("/generate-title rotasına istek geldi.");
    const { prompt } = req.body;

    let attempt = 0;
    let maxAttempts = 3;
    let success = false;
    let title = "🤖 Yeni Sohbet";

    while (attempt < maxAttempts && !success) {
        let currentApiKey = groqApiKeys[currentKeyIndex] || process.env.GROQ_API_KEY;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "Sen bir başlık oluşturucusun. Kullanıcının yazacağı isteme göre en fazla 2-3 kelimelik, başında emoji olan siber/teknolojik bir sohbet başlığı üret. Sadece başlığı döndür, başka hiçbir şey yazma." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2,
                    top_p: 0.9,
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                if (errText.includes('rate_limit_exceeded') || response.status === 429) {
                    rotateGroqKey();
                    attempt++;
                    continue;
                }
                throw new Error("Başlık API hatası");
            }

            const data = await response.json();
            title = data.choices[0]?.message?.content?.trim() || "🤖 Yeni Sohbet";
            success = true;

        } catch (error) {
            attempt++;
        }
    }

    res.json({ title });
});

// SOHBET SİLME SERVİSİ
app.post('/delete-chat', (req, res) => {
    const { chatId } = req.body;
    res.json({ success: true });
});

console.log("3. Adım: Rotalar (Routes) başarıyla tanımlandı.");

// SUNUCUYU ATEŞLEME
try {
    app.listen(3000, () => {
        console.log("=========================================");
        console.log("Efo AI Engine 3000 portunda Groq altyapısıyla aktif!");
        console.log("Akıllı Hafıza Modu Devreye Alındı.");
        console.log("=========================================");
    });
} catch (listenError) {
    console.error("Sunucu başlatılırken port hatası oluştu:", listenError);
}