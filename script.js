let conversations = JSON.parse(localStorage.getItem('efo_chats')) || {};
let currentChatId = localStorage.getItem('efo_current_id') || '';
let isGenerating = false;
let abortController = null;
let activeUser = localStorage.getItem('efo_active_user') || '';

// --- ADIM 1: KULLANICI GİRİŞ & KAYIT SİSTEMİ (KALICI HAFIZALI) ---
window.addEventListener('DOMContentLoaded', () => {
    // Tarayıcı hafızasından daha önce giriş yapmış kullanıcıyı kontrol et
    const savedUser = localStorage.getItem('efo_active_user');
    
    if (savedUser) {
        activeUser = savedUser;
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'flex';
        
        // Uygulamayı başlat ve sol panel künyesini güncelle
        initApp();
        updateSidebarBadge();
    } else {
        // Giriş yapmış kullanıcı yoksa paneli göster
        document.getElementById('authScreen').style.display = 'flex';
    }
});

function handleAuth(type) {
    const userInp = document.getElementById('authUsername').value.trim();
    const passInp = document.getElementById('authPassword').value.trim();

    if (!userInp || !passInp) {
        alert("Lütfen kullanıcı adı ve şifre alanlarını boş bırakmayın.");
        return;
    }

    let users = JSON.parse(localStorage.getItem('efo_registered_users')) || {};

    if (type === 'register') {
        if (users[userInp]) {
            alert("Bu kullanıcı adı zaten kullanılıyor, lütfen başka bir tane dene.");
            return;
        }
        users[userInp] = passInp;
        localStorage.setItem('efo_registered_users', JSON.stringify(users));
        alert("Hesabın başarıyla oluşturuldu! Şimdi Giriş Yap butonuna basabilirsin.");
    } else if (type === 'login') {
        if (!users[userInp] || users[userInp] !== passInp) {
            alert("Hatalı kullanıcı adı veya şifre girdiniz, lütfen tekrar kontrol edin.");
            return;
        }
        
        // BAŞARILI GİRİŞ: Bilgiyi hafızaya kilitle
        activeUser = userInp;
        localStorage.setItem('efo_active_user', userInp);
        document.getElementById('authScreen').style.display = 'none';
        
        const intro = document.getElementById('introScreen');
        intro.style.display = 'flex';
        
        setTimeout(() => {
            intro.classList.add('fade-away');
            setTimeout(() => {
                intro.style.display = 'none';
                document.getElementById('mainContainer').style.display = 'flex';
                
                // Uygulamayı başlat ve sol panel künyesini güncelle
                initApp();
                updateSidebarBadge();
            }, 1000);
        }, 2000);
    }
}

// Sol paneldeki kullanıcı ve sistem durumu künyesini güncelleyen fütüristik fonksiyon
function updateSidebarBadge() {
    const badge = document.getElementById('userBadge');
    if (badge && activeUser) {
        const usernameDisplay = activeUser.charAt(0).toUpperCase() + activeUser.slice(1);
        badge.innerHTML = `USER: ${usernameDisplay.toUpperCase()}<br><span style="color:#22c55e; font-size:9px;">● CORE: ONLINE</span> | <span style="color:#6b7280; font-size:9px;">LATENCY: 38ms</span>`;
    }
}

function logout() {
    localStorage.removeItem('efo_active_user');
    location.reload();
}

function initApp() {
    if (!currentChatId || !conversations[currentChatId]) {
        createNewChat();
    } else {
        renderHistoryList();
        loadChat(currentChatId);
    }
}

// --- MARKED YAPILANDIRMASI ---
const renderer = new marked.Renderer();
renderer.code = function(codeData, infostring) {
    const lang = infostring || 'code';
    const uniqueId = 'code_' + Math.random().toString(36).substr(2, 9);
    let codeText = (codeData && typeof codeData === 'object' && codeData.text) ? codeData.text : (typeof codeData === 'string' ? codeData : String(codeData || ''));
    const safeCode = codeText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `
        <div class="code-block-container">
            <div class="code-header">
                <span>${lang.toUpperCase()} CORE</span>
                <div class="code-actions">
                    <button class="run-btn" onclick="simulateRunCode('${lang}')">▶ Çalıştır</button>
                    <button class="copy-btn" onclick="copyCode('${uniqueId}')" id="${uniqueId}_btn">Kopyala</button>
                </div>
            </div>
            <pre><code id="${uniqueId}">${safeCode}</code></pre>
        </div>
    `;
};

// Kod Çalıştırma Simülasyonu Fonksiyonu
function simulateRunCode(lang) {
    alert(`⚡ [EFO SANDBOX]: ${lang.toUpperCase()} betiği yerel sanal makinede derleniyor...\n\nSistem: Kod yapısı optimize edildi ve yürütülmeye hazır!`);
}
marked.setOptions({ renderer: renderer });

function copyCode(id) {
    const codeText = document.getElementById(id).innerText;
    navigator.clipboard.writeText(codeText).then(() => {
        const btn = document.getElementById(id + '_btn');
        btn.innerText = 'Kopyalandı!'; btn.style.background = '#22c55e';
        setTimeout(() => { btn.innerText = 'Kopyala'; btn.style.background = 'rgba(255,255,255,0.05)'; }, 2000);
    });
}

// --- SİBER TOK SESLİ YANIT SİSTEMİ (YOL 1) ---
function speakText(btn, text) {
    let cleanText = text.replace(/<\/?[^>]+(>|$)/g, "").replace(/```[\s\S]*?```/g, "[Kod Bloğu]");
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btn.innerHTML = "⚡"; btn.title = "Sesli Oynat"; return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.02;  // Akıcı hız
    utterance.pitch = 0.82; // Tok, karizmatik siber asistan tonu

    btn.innerHTML = "🛑"; btn.title = "Durdur";
    utterance.onend = () => { btn.innerHTML = "⚡"; };
    utterance.onerror = () => { btn.innerHTML = "⚡"; };
    window.speechSynthesis.speak(utterance);
}

// --- KOD SİHİRBAZI VE TEMATİK RENK DEĞİŞİMİ ---
document.getElementById('wizardModeCheckbox').addEventListener('change', function() {
    const isChecked = this.checked;
    const introScreen = document.getElementById('introScreen');
    const glitchText = introScreen.querySelector('.glitch');
    const loadingText = introScreen.querySelector('.loading-text');
    
    if (isChecked) {
        glitchText.innerText = "WIZARD CORE ACTIVATING";
        loadingText.innerText = "Kod Sihirbazı protokolleri yükleniyor...";
    } else {
        glitchText.innerText = "EFO AI CORE";
        loadingText.innerText = "Standart siber moda dönülüyor...";
    }
    
    introScreen.style.display = 'flex';
    introScreen.classList.remove('fade-away');
    
    setTimeout(() => {
        if (isChecked) {
            document.documentElement.style.setProperty('--neon-purple', '#15803d'); // Kapalı Yeşil
            document.documentElement.style.setProperty('--neon-purple-glow', 'rgba(21, 128, 61, 0.5)');
            particles.forEach(p => p.color = 'rgba(21, 128, 61, 0.4)');
        } else {
            document.documentElement.style.setProperty('--neon-purple', '#bc13fe'); // Orijinal Mor
            document.documentElement.style.setProperty('--neon-purple-glow', 'rgba(188, 19, 254, 0.5)');
            particles.forEach(p => p.color = 'rgba(188, 19, 254, 0.4)');
        }
        introScreen.classList.add('fade-away');
        setTimeout(() => introScreen.style.display = 'none', 1000);
    }, 1300);
});

// --- GÖRSEL OLUŞTURMA MOTORU (ÜCRETSİZ & KREDİSİZ) ---
function triggerImagePrompt() {
    const input = document.getElementById('userInput');
    input.value = "/görsel ";
    input.focus();
}

function generateImageHTML(imageUrl) {
    return `
        <div class="image-response-wrapper">
            <span>🎨 Efo Core görüntüyü yansıttı:</span>
            <img src="${imageUrl}" class="chat-generated-image" alt="Efo AI Art">
            <button class="image-download-btn" onclick="downloadImage('${imageUrl}')">💾 Resmi İndir</button>
        </div>
    `;
}

function downloadImage(url) {
    const a = document.createElement('a'); a.href = url; a.download = 'efo_ai_art_' + Date.now() + '.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// --- SOHBET YÖNETİMİ VE FİLTRELEME ---
function filterChats() {
    const query = document.getElementById('searchChatInput').value.toLowerCase();
    const items = document.querySelectorAll('.history-item-wrapper');
    items.forEach(item => {
        const title = item.querySelector('.history-item').innerText.toLowerCase();
        item.style.display = title.includes(query) ? 'flex' : 'none';
    });
}

function renameChat(id) {
    const oldTitle = conversations[id].title;
    const newTitle = prompt("Sohbet için yeni bir isim girin:", oldTitle);
    if (newTitle && newTitle.trim() !== "") {
        conversations[id].title = newTitle.trim(); saveToStorage(); renderHistoryList();
    }
}

function toggleSidebar(collapse) {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebarOpenBtn');
    if (collapse) { sidebar.classList.add('collapsed'); if (openBtn) openBtn.style.display = 'block'; }
    else { sidebar.classList.remove('collapsed'); if (openBtn) openBtn.style.display = 'none'; }
    // Sidebar'a dinamik siber bilgiler basma
const badge = document.getElementById('userBadge');
if (badge) {
    badge.innerHTML = `USER: ${activeUser.toUpperCase()}<br><span style="color:#22c55e; font-size:9px;">● CORE: ONLINE</span> | <span style="color:#6b7280; font-size:9px;">LATENCY: 38ms</span>`;
}
}

function stopGeneration() {
    if (abortController) { abortController.abort(); isGenerating = false; resetSendButton(); }
}

function resetSendButton() {
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.innerText = "İLET"; sendBtn.style.background = ""; sendBtn.onclick = sendMessage;
}

function handleKeyPress(event) { if (event.key === 'Enter') sendMessage(); }

function createNewChat() {
    if (isGenerating) return;
    const id = 'chat_' + Date.now();
    
    // Hafızadan veya aktif değişkenden ismi al
    const currentUser = activeUser || localStorage.getItem('efo_active_user') || "Geliştirici";
    const usernameDisplay = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    
    conversations[id] = {
        title: "Yeni Sohbet",
        messages: [] // İLK MESAJ ARTIK BOŞ, KUTU OLUŞTURMUYORUZ!
    };
    currentChatId = id; 
    saveToStorage(); 
    renderHistoryList(); 
    loadChat(id);
}

function loadChat(id) {
    if (isGenerating) return;
    currentChatId = id; localStorage.setItem('efo_current_id', id);
    const chatBox = document.getElementById('chatBox'); 
    
    // Temizle ama ortadaki logolu karşılama divini koru
    chatBox.innerHTML = '';
    
    // Karşılama elementini yeniden oluştur/bağla
    const currentUser = activeUser || localStorage.getItem('efo_active_user') || "Geliştirici";
    const usernameDisplay = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
    
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'chat-welcome-core';
    welcomeDiv.id = 'chatWelcomeCore';
welcomeDiv.innerHTML = `
    <img src="logo.png" class="welcome-logo-img" alt="Efo Core Logo">
    <h1>Hoş geldin ${usernameDisplay}, bugün ne yapıyoruz?</h1>
`;
    chatBox.appendChild(welcomeDiv);
    
    // Eğer bu sohbet geçmişinde mesaj varsa ortadaki logoyu gizle, mesajları bas
    if (conversations[id].messages.length > 0) {
        welcomeDiv.classList.add('hidden');
        
        conversations[id].messages.forEach(msg => {
            const msgDiv = document.createElement('div'); msgDiv.className = `message ${msg.sender}`;
            if (msg.isImage) {
                msgDiv.innerHTML = generateImageHTML(msg.text);
            } else {
                msgDiv.innerHTML = msg.sender === 'efo' ? marked.parse(msg.text) : msg.text;
                if (msg.sender === 'efo') {
                    const escapedText = msg.text.replace(/'/g, "\\'").replace(/\n/g, " ");
                    msgDiv.innerHTML += `<button class="siber-audio-btn" onclick="speakText(this, '${escapedText}')" title="Sesli Oynat">⚡</button>`;
                }
            }
            chatBox.appendChild(msgDiv);
        });
    }
    
    chatBox.scrollTop = chatBox.scrollHeight; renderHistoryList();
}

function deleteChat(id, event) {
    event.stopPropagation();
    if (confirm("Bu sohbeti silmek istediğine emin misin?")) {
        delete conversations[id]; saveToStorage();
        if (currentChatId === id) { const r = Object.keys(conversations); currentChatId = r.length > 0 ? r[0] : ''; }
        if (!currentChatId) createNewChat(); else { renderHistoryList(); loadChat(currentChatId); }
    }
}

function renderHistoryList() {
    const listEl = document.getElementById('historyList'); listEl.innerHTML = '';
    Object.keys(conversations).sort((a,b) => b.split('_')[1] - a.split('_')[1]).forEach(id => {
        const wrapper = document.createElement('div'); wrapper.className = 'history-item-wrapper';
        const item = document.createElement('div'); item.className = `history-item ${id === currentChatId ? 'active' : ''}`;
        item.innerText = conversations[id].title; item.onclick = () => loadChat(id); item.ondblclick = () => renameChat(id);
        const dBtn = document.createElement('button'); dBtn.className = 'delete-chat-btn'; dBtn.innerHTML = '🗑️'; dBtn.onclick = (e) => deleteChat(id, e);
        wrapper.appendChild(item); wrapper.appendChild(dBtn); listEl.appendChild(wrapper);
    });
}

function saveToStorage() { localStorage.setItem('efo_chats', JSON.stringify(conversations)); }

// --- MESAJ ENGINI (HAFIZA, GÖRSEL VE SİHİRBAZ ENTEGRELİ) ---
async function sendMessage() {
    if (isGenerating) return;
    const input = document.getElementById('userInput'); const chatBox = document.getElementById('chatBox'); const sendBtn = document.getElementById('sendBtn');
    let message = input.value.trim();
    if (!message) return;
// Eğer ortada karşılama ekranı varsa onu yumuşakça gizle
const welcomeCore = document.getElementById('chatWelcomeCore');
if (welcomeCore) welcomeCore.classList.add('hidden');

// --- A) GÖRSEL OLUŞTURMA PROTOKOLÜ (AKILLI KELİME TETİKLEYİCİLİ & PROMPT GÜÇLENDİRİCİLİ) ---
    const msgLower = message.toLowerCase();
    const visualKeywords = ['resim', 'görsel', 'çiz', 'oluştur', 'fotoğraf', 'image', 'generate', 'picture', 'draw'];
    
    // Kullanıcı /görsel komutu verdi mi VEYA mesajın içinde yukarıdaki kelimelerden biri geçiyor mu?
    const isVisualRequest = message.startsWith('/görsel ') || visualKeywords.some(keyword => msgLower.includes(keyword));

    if (isVisualRequest) {
        // Komut kullanıldıysa temizle, normal kelimeyse direkt girdi metnini al
        let promptText = message.startsWith('/görsel ') ? message.replace('/görsel ', '').trim() : message.trim();
        if(!promptText) return;

        // Kullanıcı arayüzünde mesajları ve yükleniyor ibaresini bas
        chatBox.innerHTML += `<div class="message user">${message}</div>`;
        input.value = '';

        const efoImageDiv = document.createElement('div'); efoImageDiv.className = 'message efo';
        efoImageDiv.innerHTML = "🔮 **[EFO CORE]:** Resminiz Oluşturuluyor Lütfen Bekleyin...";
        chatBox.appendChild(efoImageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // --- PROMPT ENHANCER (Görsel Kalitesini Uçuran Sihirli Filtre) ---
        // Kullanıcının basit promptunu alıp, Pollinations AI motorunun en efsane, cam gibi sonucu vermesi için besliyoruz
// --- PROMPT ENHANCER (OYUN VE 3D STİLİ İÇİN OPTİMİZE EDİLDİ) ---
        let enhancedPrompt = promptText;
        
        // Eğer promptta roblox, oyun, 3d veya karakter kelimeleri geçiyorsa fütüristik tagleri ona göre seçiyoruz
        if (msgLower.includes('roblox') || msgLower.includes('oyun') || msgLower.includes('3d')) {
            // Gerçekçilik taglerini siliyoruz, oyun motoru (unreal engine, 3d render) tagleri ekliyoruz
            enhancedPrompt = `${promptText}, detailed 3D render, vibrant colors, sharp focus, gaming concept art, blocky textures, smooth shading, masterpiece, studio lighting`;
        } else {
            // Normal istekler için kaliteli siber sanat filtresi
            enhancedPrompt = `${promptText}, high quality, cinematic lighting, 8k resolution, highly detailed digital masterpiece, professional composition`;
        }

        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        
        // --- BURASI KRİTİK: MODELİ DEĞİŞTİRİYORUZ ---
        // Linkin sonuna &model=flux ekleyerek Pollinations'ın en gelişmiş, prompta en sadık motorunu çağırıyoruz reis!
        const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;

        // Resmi önyükleme yapıp ekrana basıyoruz
        const img = new Image();
        img.src = generatedImageUrl;
        img.onload = function() {
            efoImageDiv.innerHTML = generateImageHTML(generatedImageUrl);
            conversations[currentChatId].messages.push({ sender: 'user', text: message });
            conversations[currentChatId].messages.push({ sender: 'efo', text: generatedImageUrl, isImage: true });
            saveToStorage();
            chatBox.scrollTop = chatBox.scrollHeight;
        };
        return;
    }

    // B) STANDART VE KOD SİHİRBAZI MODU (HAFIZALI)
const isWizardMode = document.getElementById('wizardModeCheckbox').checked;
if (isWizardMode) {
    message = "[KOD SİHİRBAZI AKTİF] Aşağıdaki kodu incele, hataları düzelt, optimize et ve en temiz halini sun: \n" + message;
}

isGenerating = true; 
abortController = new AbortController();
sendBtn.innerText = "DURDUR"; 
sendBtn.style.background = "#ef4444"; 
sendBtn.onclick = stopGeneration;

// Mesajı geçmişe ekle
conversations[currentChatId].messages.push({ sender: 'user', text: message });

// Token limitine takılmamak için sadece son 6 mesajı gönderiyoruz
const historyMessages = conversations[currentChatId].messages.slice(-6); 

if (conversations[currentChatId].title === "Yeni Sohbet") {
    conversations[currentChatId].title = "🤖 Düşünüyor..."; 
    renderHistoryList();
    
    // localhost hatasını düzelttik, artık canlı sitede çalışır
    fetch('/generate-title', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message }) 
    })
    .then(res => res.json())
    .then(data => { 
        if(conversations[currentChatId]) { 
            conversations[currentChatId].title = data.title || "Yeni Sohbet"; 
            saveToStorage(); 
            renderHistoryList(); 
        } 
    })
    .catch(err => {
        console.error("Başlık oluşturma hatası:", err);
        if(conversations[currentChatId]) {
            conversations[currentChatId].title = "Sohbet"; // Hata olursa başlığı düzelt
            renderHistoryList();
        }
    });
}

    chatBox.innerHTML += `<div class="message user">${message}</div>`; input.value = ''; chatBox.scrollTop = chatBox.scrollHeight;

    const efoMessageDiv = document.createElement('div'); efoMessageDiv.className = 'message efo';
    chatBox.appendChild(efoMessageDiv); chatBox.scrollTop = chatBox.scrollHeight;

    let secondsLeft = 3;
    const updateStatus = () => { efoMessageDiv.innerHTML = `<div class="efo-typing-pulse"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span>Efo yanıt üretiyor... (~${secondsLeft} sn)</span></div>`; };
    updateStatus();

    const countdown = setInterval(() => { if (secondsLeft > 1) { secondsLeft--; updateStatus(); } else { clearInterval(countdown); } }, 1000);

try {
    const response = await fetch('/ask', { // <--- 'http://localhost:3000' kısmını sildik
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message, chatId: currentChatId, historyMessages: historyMessages }),
        signal: abortController.signal
    });

        clearInterval(countdown); efoMessageDiv.innerHTML = '';
        const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8');
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read(); if (done) break;
            fullResponseText += decoder.decode(value, { stream: true });
            efoMessageDiv.innerHTML = marked.parse(fullResponseText);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        conversations[currentChatId].messages.push({ sender: 'efo', text: fullResponseText }); saveToStorage();
        const escapedText = fullResponseText.replace(/'/g, "\\'").replace(/\n/g, " ");
        efoMessageDiv.innerHTML += `<button class="siber-audio-btn" onclick="speakText(this, '${escapedText}')" title="Sesli Oynat">⚡</button>`;

    } catch (error) {
        clearInterval(countdown);
        if (error.name === 'AbortError') {
            if (fullResponseText) { conversations[currentChatId].messages.push({ sender: 'efo', text: fullResponseText }); saveToStorage(); }
            else { efoMessageDiv.innerHTML = '<i>Yazma işlemi durduruldu.</i>'; }
        } else { efoMessageDiv.innerHTML = 'Bağlantı hatası.'; efoMessageDiv.style.color = '#ff3333'; }
    } finally { isGenerating = false; resetSendButton(); chatBox.scrollTop = chatBox.scrollHeight; }
}

// --- ARKA PLAN PARÇACIK MOTORU ---
const canvas = document.getElementById('bgCanvas'); const ctx = canvas.getContext('2d');
let particles = [];
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();
class Particle {
    constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.vx = (Math.random() - 0.5) * 0.8; this.vy = (Math.random() - 0.5) * 0.8; this.radius = Math.random() * 2 + 1; this.color = 'rgba(188, 19, 254, 0.4)'; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
    update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; }
}
function initParticles() { particles = []; let count = Math.floor((canvas.width * canvas.height) / 9000); for(let i=0; i<count; i++) particles.push(new Particle()); }
initParticles();
function animate() { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); }
animate();