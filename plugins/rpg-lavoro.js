import axios from 'axios'
import fs from 'fs'

const livelliPath = './media/livelli.json'
const walletPath = './media/wallet.json'
const cooldownPath = './media/cooldown_lavoro.json'
const BROWSERLESS_KEY = global.APIKeys?.browserless

const getDb = (path) => {
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

const saveDb = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const formatTime = (ms) => {
    let m = Math.floor(ms / 60000)
    let s = Math.floor((ms % 60000) / 1000)
    return `${m > 0 ? m + 'm ' : ''}${s}s`
}

const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const lavori = [
    { nome: 'Spazzino', xpReq: 0, paga: [150, 300], xpGained: [10, 20], colore: '#4caf50' },
    { nome: 'Meccanico', xpReq: 250, paga: [400, 750], xpGained: [30, 60], colore: '#ff9800' },
    { nome: 'Programmatore', xpReq: 1000, paga: [1000, 2500], xpGained: [80, 150], colore: '#2196f3' }
]

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const jid = m.sender
    const nomeUtente = m.pushName || 'Utente'
    
    let livelliDb = getDb(livelliPath)
    let walletDb = getDb(walletPath)
    let cooldowns = getDb(cooldownPath)

    if (!livelliDb[jid]) livelliDb[jid] = { level: 1, xp: 0, lastMsgCount: 0, lavoro: null }
    if (!walletDb[jid]) walletDb[jid] = { money: 0 }
    
    const userLvl = livelliDb[jid]

    if (command === 'lavoro') {
        if (!text) {
            await conn.sendPresenceUpdate('composing', m.chat)
            
            const htmlJob = `<html><head><style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                body { margin:0; padding:0; width:1000px; height:600px; display:flex; align-items:center; justify-content:center; background:#0f0f0f; font-family:'Inter', sans-serif; }
                .card { width:850px; height:450px; background:#1a1a1a; border-radius:30px; border: 2px solid #333; display:flex; overflow:hidden; box-shadow:0 30px 60px rgba(0,0,0,0.5); }
                .sidebar { width:250px; background:#222; display:flex; flex-direction:column; align-items:center; justify-content:center; border-right:2px solid #333; }
                .avatar { width:120px; height:120px; background:#333; border-radius:50%; margin-bottom:20px; border:4px solid #444; }
                .content { flex:1; padding:50px; display:flex; flex-direction:column; justify-content:center; }
                .title { color:#666; text-transform:uppercase; letter-spacing:3px; font-weight:700; font-size:14px; }
                .name { color:#fff; font-size:50px; font-weight:900; margin:10px 0; }
                .stats { display:flex; gap:30px; margin-top:30px; }
                .stat-box { display:flex; flex-direction:column; }
                .stat-label { color:#555; font-size:12px; font-weight:700; text-transform:uppercase; }
                .stat-value { color:#eee; font-size:24px; font-weight:700; }
                .job-tag { position:absolute; top:40px; right:40px; padding:10px 20px; background:#333; color:#aaa; border-radius:10px; font-size:12px; font-weight:700; }
            </style></head><body>
                <div class="card" style="position:relative;">
                    <div class="job-tag">CENTRO IMPIEGO</div>
                    <div class="sidebar">
                        <div class="avatar"></div>
                    </div>
                    <div class="content">
                        <div class="title">Candidato Selezionato</div>
                        <div class="name">${nomeUtente}</div>
                        <div class="stats">
                            <div class="stat-box"><div class="stat-label">Esperienza</div><div class="stat-value">${userLvl.xp} XP</div></div>
                            <div class="stat-box"><div class="stat-label">Stato</div><div class="stat-value">${userLvl.lavoro ? 'Occupato' : 'Libero'}</div></div>
                        </div>
                    </div>
                </div>
            </body></html>`

            const ss = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
                html: htmlJob, viewport: { width: 1000, height: 600 }, options: { type: 'jpeg', quality: 90 }
            }, { responseType: 'arraybuffer' })

            const buttons = lavori.map(l => ({
                buttonId: `${usedPrefix}lavoro scegli ${l.nome.toLowerCase()}`,
                buttonText: { displayText: `${l.nome.toUpperCase()} (${l.xpReq} XP)` },
                type: 1
            }))

            const caption = `╭┈  『 💼 』 \`centro impiego\`\n┆  『 👤 』 \`utente\` ─ *${nomeUtente}*\n┆  『 📊 』 \`xp attuali\` ─ *${userLvl.xp}*\n┆  『 🛠️ 』 \`lavoro attuale\` ─ *${userLvl.lavoro || 'nessuno'}*\n╰┈➤ 『 📦 』 \`seleziona una professione\``

            return await conn.sendMessage(m.chat, {
                image: Buffer.from(ss.data),
                caption: caption,
                buttons: buttons,
                headerType: 4
            }, { quoted: m })
        }

        if (text.startsWith('scegli')) {
            const scelta = text.replace('scegli ', '').trim().toLowerCase()
            const lavoroTrovato = lavori.find(l => l.nome.toLowerCase() === scelta)

            if (!lavoroTrovato) return conn.sendMessage(m.chat, { text: '❌ Lavoro non trovato.' }, { quoted: m })
            if (userLvl.xp < lavoroTrovato.xpReq) return conn.sendMessage(m.chat, { text: `🚫 Requisiti non soddisfatti! Ti servono ${lavoroTrovato.xpReq} XP.` }, { quoted: m })

            userLvl.lavoro = lavoroTrovato.nome
            saveDb(livelliPath, livelliDb)

            const captionScelta = `╭┈  『 ✅ 』 \`lavoro ottenuto\`\n┆  『 💼 』 \`impiego\` ─ *${lavoroTrovato.nome}*\n┆  『 💰 』 \`paga\` ─ *€${lavoroTrovato.paga[0]}-${lavoroTrovato.paga[1]}*\n╰┈➤ 『 🛠️ 』 \`scrivi ${usedPrefix}lavora\``
            return conn.sendMessage(m.chat, { text: captionScelta }, { quoted: m })
        }
    }

    if (command === 'lavora') {
        if (!userLvl.lavoro) return conn.sendMessage(m.chat, { text: `⚠️ Non hai un lavoro! Usa ${usedPrefix}lavoro` }, { quoted: m })

        const baseCooldown = 600000 
        const riduzione = userLvl.xp * 100 
        const tempoAttesa = Math.max(60000, baseCooldown - riduzione)
        const ora = Date.now()
        const lastWork = cooldowns[jid] || 0

        if (ora - lastWork < tempoAttesa) {
            const rimanente = tempoAttesa - (ora - lastWork)
            return conn.sendMessage(m.chat, { text: `⏳ Sei stanco! Riposa ancora *${formatTime(rimanente)}*` }, { quoted: m })
        }

        const lavoroAttuale = lavori.find(l => l.nome === userLvl.lavoro)
        if (!lavoroAttuale) return conn.sendMessage(m.chat, { text: '❌ Errore nel database lavori.' }, { quoted: m })
        
        const pagaRandom = getRandom(lavoroAttuale.paga[0], lavoroAttuale.paga[1])
        const xpRandom = getRandom(lavoroAttuale.xpGained[0], lavoroAttuale.xpGained[1])

        walletDb[jid].money += pagaRandom
        userLvl.xp += xpRandom
        cooldowns[jid] = ora

        saveDb(livelliPath, livelliDb)
        saveDb(walletPath, walletDb)
        saveDb(cooldownPath, cooldowns)

        const htmlWork = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
            body { margin:0; padding:0; width:1000px; height:600px; display:flex; align-items:center; justify-content:center; background:#000; font-family:'Inter', sans-serif; }
            .work-bg { width:900px; height:500px; background:linear-gradient(45deg, #111, #1a1a1a); border-radius:20px; position:relative; overflow:hidden; border:1px solid #333; }
            .accent { position:absolute; top:0; left:0; width:10px; height:100%; background:${lavoroAttuale.colore}; }
            .work-info { padding:80px; }
            .job-name { color:${lavoroAttuale.colore}; font-size:24px; text-transform:uppercase; letter-spacing:5px; }
            .work-status { color:#fff; font-size:80px; margin-top:10px; }
            .earned { color:#00ff88; font-size:120px; margin-top:20px; }
        </style></head><body>
            <div class="work-bg">
                <div class="accent"></div>
                <div class="work-info">
                    <div class="job-name">${lavoroAttuale.nome}</div>
                    <div class="work-status">TURNO COMPLETATO</div>
                    <div class="earned">+€${pagaRandom.toLocaleString()}</div>
                </div>
            </div>
        </body></html>`

        const ssWork = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
            html: htmlWork, viewport: { width: 1000, height: 600 }, options: { type: 'jpeg', quality: 90 }
        }, { responseType: 'arraybuffer' })

        const captionLavoro = `╭┈  『 🛠️ 』 \`turno completato\`\n┆  『 💼 』 \`impiego\` ─ *${lavoroAttuale.nome}*\n┆  『 💰 』 \`guadagno\` ─ *+€${pagaRandom}*\n┆  『 ✨ 』 \`xp\` ─ *+${xpRandom}*\n╰┈➤ 『 🏦 』 \`portafoglio\` ─ *€${walletDb[jid].money}*`

        return conn.sendMessage(m.chat, {
            image: Buffer.from(ssWork.data),
            caption: captionLavoro,
            headerType: 4
        }, { quoted: m })
    }

    if (command === 'licenziati') {
        if (!userLvl.lavoro) return conn.sendMessage(m.chat, { text: '⚠️ Non hai un impiego da cui dimetterti.' }, { quoted: m })
        const lavoroPrecedente = userLvl.lavoro
        userLvl.lavoro = null
        saveDb(livelliPath, livelliDb)
        return conn.sendMessage(m.chat, { text: `╭┈  『 🚪 』 \`dimissioni\`\n┆  『 💼 』 \`ex impiego\` ─ *${lavoroPrecedente}*\n╰┈➤ 『 📦 』 \`usa ${usedPrefix}lavoro per ricominciare\`` }, { quoted: m })
    }
}

handler.command = ['lavoro', 'lavora', 'licenziati']
handler.tags = ['rpg']
handler.help = ['lavoro', 'lavora']
export default handler