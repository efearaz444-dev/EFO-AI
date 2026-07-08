const express = require('express');
const cors = require('cors');

console.log("1. Adım: Express ve Cors kütüphaneleri yüklendi.");

const app = express();
app.use(cors());
app.use(express.json());

// index.html ve diğer statik dosyaların (style.css vb.) direkt sunucudan çekilmesi için:
app.use(express.static(__dirname));

console.log("2. Adım: Express middleware ayarları yapıldı.");

// KENDİ GROQ API ANAHTARIN VE SİSTEM TALİMATLARIN AYNEN KORUNDU
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `Senin adın Efo. Çok akıllı, iş bitirici, net ve hafif nüktedan bir siber asistan ve yazılımcı meslektaşsın. Kullanıcıyla iletişim kurarken kesinlikle yapmacık, aşırı duygusal veya yılışık ifadeler kullanmayacaksın. Karşılamaların samimi ama profesyonel, net ve özgüvenli olmalı. Gereksiz emoji kullanımından kaçın. Sorulara doğrudan, mantıklı ve temiz bir Markdown formatıyla (başlıklar, listeler, kod blokları) cevap ver.

DİL VE İMLA KURALLARI (KESİN ZORUNLULUK):
1. Yanıtlarında kesinlikle yabancı dillerden (İspanyolca, İngilizce vb.) devşirme hatalı kelimeler ("específik", "excelente", "halo" vb.) kullanamazsın! 
2. Tüm cümlelerin kusursuz, akıcı ve kurallı bir Türkçe ile yazılmalıdır. Yazım hatalarından ve harf uyuşmazlıklarından tamamen kaçın.
3. Kelimelerinde TÜM HARFLERİ EKSİKSİZ YAZ (g,ş,ı,ö,ç,ğ,s) GİBİ ÖZEL HARFLERİ BİLE EKSİKSİZ VE DOĞRU YAZ TDK KURALLARINA UYARAK.
4. Senden eğer ulaşım bilgilerimizi talep ederlerse, 'Discord üzerinden yapımcıma efearaz44 yazıp arkadaş ekleyerek ulaşabilirsiniz' tarzında yanıtlar verebilirsin.
4. Seninle ilgili sorulara, "Ben Efo, bir yapay zekâ asistanıyım. Görevim kullanıcıya yardımcı olmak ve isteklerini yerine getirmektir." şeklinde cevap verebilirsin.
4. Yapımcını Sorarlarsa; 'Yapımcım efearaz44, kendisi çok zeki profosyonel ve iş bitirici bir yazılımcıdır. Yapımcıma ulaşmak için discorddan efearaz44'e istek atabilir veya destek sunucumuza https://discord.gg/kDms9KJ9JK üzerinden ulaşabilirsiniz' cevabını verebilirsin.
5. Teknik terimler hariç, günlük konuşma dilindeki tüm kelimelerin Türk Dil Kurumu (TDK) imla kurallarına uygun olmalıdır.`;

// AKILLI HAFIZA VE COOLDOWN ENTEGRELİ YENİ /ASK ROTASI
app.post('/ask', async (req, res) => {
    console.log("/ask rotasına istek geldi.");
    const { prompt, historyMessages } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        // Groq API'ye göndereceğimiz mesaj paketini hazırlıyoruz
        let apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];

        // --- SİBER HAFIZA FİLTRESİ (TOKEN SAVAR) ---
        // Gelen geçmiş mesaj sayısı 6'dan fazlaysa, kotayı korumak için sadece son 6 mesajı (3 soru - 3 cevap) alıyoruz
        let filteredHistory = historyMessages || [];
        if (filteredHistory.length > 6) {
            console.log(`⚠️ [SİSTEM]: Geçmiş mesaj sayısı ${filteredHistory.length}. Son 6 mesaj filtrelenerek hafızaya alınıyor.`);
            filteredHistory = filteredHistory.slice(-6);
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

let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
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

        // Üst limit kontrolü ve EFO-LİTE geçiş protokolü
        if (!response.ok) {
            const errText = await response.text();
            
             if (errText.includes('rate_limit_exceeded') || response.status === 429) {
                console.warn("⚠️ [SİSTEM UYARISI]: Ana model sınırına ulaşıldı. EFO-LİTE devrede.");
                
                // Sadece sohbetin en başında (ilk mesajda) bildirim bas
                // apiMessages dizisinin ilk iki elemanı [system, user] olduğu için 
                // uzunluk 2 veya daha az ise bu bir başlangıç mesajıdır.
                if (apiMessages.length <= 2) {
                    res.write(`⚡ **[EFO-LİTE]:** EFO+ sınırına ulaşıldı. EFO-LİTE devrede.\n\n---\n\n`);
                }
                
                // ... (Yedek model re-try mantığı buraya devam ediyor)
                
                // Yedek model (EFO-LİTE) ile yeni istek başlatılıyor
                response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "llama-3.1-8b-instant", // EFO-LİTE Modeli
                        messages: apiMessages,
                        temperature: 0.2,
                        top_p: 0.9,
                        max_tokens: 4096, 
                        stream: true
                    })
                });

                if (!response.ok) {
                    const backupErrText = await response.text();
                    throw new Error(`Yedek Model (EFO-LİTE) Hatası: ${backupErrText}`);
                }
            } else {
                throw new Error(`Groq API Hatası: ${errText}`);
            }
        }

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
                    // Bozuk JSON paketleri yutuluyor
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

    } catch (error) {
        console.error("Yayın akışında hata:", error);
        if (!res.writableEnded) {
            res.write("\n\n❌ Şuanda Sunucularımız Yoğun Daha Sonra Deneyiniz.");
            res.end();
        }
    }
});

// OTOMATİK SOHBET BAŞLIĞI OLUŞTURUCU
app.post('/generate-title', async (req, res) => {
    console.log("/generate-title rotasına istek geldi.");
    const { prompt } = req.body;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
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

        const data = await response.json();
        const title = data.choices[0]?.message?.content?.trim() || "🤖 Yeni Sohbet";
        res.json({ title });

    } catch (error) {
        res.json({ title: "🤖 Yeni Sohbet" });
    }
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