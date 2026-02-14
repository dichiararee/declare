import axios from 'axios'
import fs from 'fs'

const walletPath = './media/wallet.json'
const livelliPath = './media/livelli.json'
const BROWSERLESS_KEY = global.APIKeys?.browserless

// Configurazione Premi (Tabella 7 Giorni)
const rewards = [
    { day: 1, money: 500, xp: 50, icon: '💎' },
    { day: 2, money: 1000, xp: 100, icon: '💎' },
    { day: 3, money: 2500, xp: 250, icon: '💰' },
    { day: 4, money: 4000, xp: 400, icon: '💰' },
    { day: 5, money: 6000, xp: 600, icon: '🏆' },
    { day: 6, money: 10000, xp: 1000, icon: '👑' },
    { day: 7, money: 25000, xp: 2500, icon: '🎁' } // JACKPOT
]

const getDb = (path) => {
    if (!fs.existsSync('./media')) fs.mkdirSync('./media')
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

const saveDb = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const formatTime = (ms) => {
    let h = Math.floor(ms / 3600000)
    let m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
}

const handler = async (m, { conn, usedPrefix }) => {
    const jid = m.sender
    let walletDb = getDb(walletPath)
    let livelliDb = getDb(livelliPath)

    // Inizializzazione sicura
    if (!walletDb[jid]) walletDb[jid] = {}
    if (!livelliDb[jid]) livelliDb[jid] = {}

    // Default values
    walletDb[jid].money = walletDb[jid].money || 0
    walletDb[jid].lastClaim = walletDb[jid].lastClaim || 0
    walletDb[jid].streak = walletDb[jid].streak || 0
    livelliDb[jid].xp = livelliDb[jid].xp || 0
    livelliDb[jid].lvl = livelliDb[jid].lvl || 0

    const now = Date.now()
    const cooldown = 86400000 // 24 ore
    const resetTime = 172800000 // 48 ore

    const lastClaim = walletDb[jid].lastClaim
    const timePassed = now - lastClaim

    // Check Cooldown (Se non è passato abbastanza tempo)
    if (timePassed < cooldown) {
        return m.reply(`⏳ *TORNA PIÙ TARDI*\nHai già riscosso oggi.\nAttendi: *${formatTime(cooldown - timePassed)}*`)
    }

    // Gestione Streak
    let currentStreak = walletDb[jid].streak
    
    // Se sono passate più di 48h, resetta a 1, altrimenti incrementa
    if (timePassed > resetTime && lastClaim !== 0) {
        currentStreak = 1
        m.reply('⚠️ *STREAK PERSA!* Non hai riscosso ieri. Ricominci da 1.')
    } else {
        currentStreak += 1
    }

    // Calcola l'indice del premio (0-6)
    // Se superi il giorno 7, ricomincia il ciclo mantenendo lo streak alto
    const rewardIndex = (currentStreak - 1) % 7 
    const todayReward = rewards[rewardIndex]

    // Assegna Premio
    walletDb[jid].money += todayReward.money
    walletDb[jid].lastClaim = now
    walletDb[jid].streak = currentStreak
    livelliDb[jid].xp += todayReward.xp

    saveDb(walletPath, walletDb)
    saveDb(livelliPath, livelliDb)

    // --- GENERAZIONE GRAFICA GLASSMORPHISM ---
    await conn.sendPresenceUpdate('composing', m.chat)

    // Genera l'HTML per le carte dei giorni
    const cardsHtml = rewards.map((r, i) => {
        let stateClass = ''
        let checkMark = ''
        
        if (i < rewardIndex) {
            stateClass = 'claimed' // Passato
            checkMark = '<div class="check">✔</div>'
        } else if (i === rewardIndex) {
            stateClass = 'active' // Oggi
        } else {
            stateClass = 'locked' // Futuro
        }

        return `
            <div class="card ${stateClass}">
                ${checkMark}
                <div class="day-num">DAY ${r.day}</div>
                <div class="icon">${r.icon}</div>
                <div class="rewards">
                    <div class="money">€${r.money/1000}k</div>
                    <div class="xp">${r.xp}xp</div>
                </div>
            </div>
        `
    }).join('')

    const html = `<html><head><style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap');
        
        body { margin:0; width:1280px; height:720px; background:#0f0c29; display:flex; align-items:center; justify-content:center; font-family:'Poppins', sans-serif; overflow:hidden; }
        
        /* Sfondo dinamico */
        .bg-glow { position:absolute; width:100%; height:100%; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); z-index:-1; }
        .orb { position:absolute; border-radius:50%; filter:blur(80px); opacity:0.6; }
        .orb-1 { width:400px; height:400px; background:#ff00cc; top:-100px; left:-100px; }
        .orb-2 { width:500px; height:500px; background:#3333ff; bottom:-100px; right:-100px; }

        .container {
            width: 1100px; height: 500px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 40px;
        }

        .header { text-align: center; margin-bottom: 50px; }
        .title { font-size: 60px; font-weight: 900; color: #fff; letter-spacing: 2px; text-shadow: 0 0 20px rgba(255,255,255,0.5); margin: 0; }
        .subtitle { font-size: 24px; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 5px; margin-top: 10px; }

        .grid {
            display: flex; gap: 20px; width: 100%; justify-content: center;
        }

        /* CARD STYLE GLASSMORPHISM */
        .card {
            width: 120px; height: 220px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            display: flex; flex-direction: column; align-items: center; justify-content: space-evenly;
            position: relative; transition: all 0.3s;
        }

        .day-num { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 700; }
        .icon { font-size: 45px; filter: grayscale(100%); opacity: 0.5; }
        .rewards { text-align: center; }
        .money { font-size: 18px; color: #fff; font-weight: 700; }
        .xp { font-size: 14px; color: rgba(255,255,255,0.6); }

        /* STILE ACTIVE (OGGI) */
        .card.active {
            transform: scale(1.15) translateY(-10px);
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid #00d2ff;
            box-shadow: 0 0 40px rgba(0, 210, 255, 0.3);
            z-index: 10;
        }
        .active .day-num { color: #00d2ff; }
        .active .icon { filter: none; opacity: 1; text-shadow: 0 0 20px rgba(255,255,255,0.8); }
        .active .money { color: #00d2ff; }

        /* STILE CLAIMED (PASSATO) */
        .card.claimed {
            background: rgba(0, 255, 128, 0.05);
            border: 1px solid rgba(0, 255, 128, 0.2);
        }
        .claimed .day-num { color: #00ff80; }
        .check { 
            position: absolute; top: 10px; right: 10px; 
            background: #00ff80; color: #000; 
            width: 20px; height: 20px; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;
        }

        /* STILE LOCKED (FUTURO) */
        .card.locked { opacity: 0.5; }
        
        /* ULTIMA CARD (JACKPOT) */
        .card:last-child { border-color: #ffd700; }
        .card:last-child.active { border-color: #ffd700; box-shadow: 0 0 50px rgba(255, 215, 0, 0.5); }
        .card:last-child .icon { color: #ffd700; }

    </style></head><body>
        <div class="bg-glow">
            <div class="orb orb-1"></div>
            <div class="orb orb-2"></div>
        </div>
        <div class="container">
            <div class="header">
                <div class="title">DAILY REWARD</div>
                <div class="subtitle">STREAK: ${currentStreak} GIORNI</div>
            </div>
            <div class="grid">
                ${cardsHtml}
            </div>
        </div>
    </body></html>`

    try {
        const ss = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
            html: html,
            viewport: { width: 1280, height: 720 },
            options: { type: 'jpeg', quality: 90 }
        }, { responseType: 'arraybuffer' })

        await conn.sendMessage(m.chat, {
            image: Buffer.from(ss.data),
            caption: `🎁 *RICOMPENSA GIORNALIERA*\n\n✅ *Giorno:* ${todayReward.day}/7\n🔥 *Streak:* ${currentStreak} consecutivi\n\n💰 *Cash:* +€${todayReward.money}\n✨ *Exp:* +${todayReward.xp}`,
            buttons: [
                { buttonId: `${usedPrefix}wallet`, buttonText: { displayText: '👛 PORTAFOGLIO' }, type: 1 }
            ],
            headerType: 4
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply(`🎁 Hai riscosso €${todayReward.money} e ${todayReward.xp} XP!`)
    }
}

handler.command = ['daily', 'free', 'claim']
handler.tags = ['rpg']
handler.help = ['daily']

export default handler