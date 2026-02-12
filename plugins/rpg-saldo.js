import axios from 'axios'
import fs from 'fs'

const walletPath = './media/wallet.json'
const inventoryPath = './media/inventory.json'
const bancaPath = './media/banca.json'
const BROWSERLESS_KEY = global.APIKeys?.browserless

const getDb = (path) => {
    if (!fs.existsSync('./media')) fs.mkdirSync('./media')
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

const saveDb = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const generateCard = () => {
    const isPremium = Math.random() > 0.8 
    const brand = isPremium ? 'MASTERCARD' : 'VISA'
    const prefix = isPremium ? '5' : '4'
    let number = prefix
    for (let i = 0; i < 15; i++) number += Math.floor(Math.random() * 10)
    
    return {
        brand: brand,
        tier: isPremium ? 'BLACK' : 'STANDARD',
        number: number.match(/.{1,4}/g).join(' '),
        cashback: isPremium ? 0.05 : 0.01,
        color: isPremium ? 'linear-gradient(135deg, #0f0f0f 0%, #333 100%)' : 'linear-gradient(135deg, #002366 0%, #0056b3 100%)'
    }
}

const handler = async (m, { conn, usedPrefix, command, text }) => {
    const jid = m.sender
    let walletDb = getDb(walletPath)
    let inventoryDb = getDb(inventoryPath)
    let bancaDb = getDb(bancaPath)

    if (!walletDb[jid]) walletDb[jid] = { money: 0, bank: 0, lastFree: 0 }
    if (!inventoryDb[jid]) inventoryDb[jid] = { items: [] }
    if (!bancaDb[jid]) bancaDb[jid] = { hasCard: false }

    const card = bancaDb[jid]
    const userMoney = walletDb[jid].money || 0
    const userBank = walletDb[jid].bank || 0

    if (command === 'wallet' || command === 'bal') {
        await conn.sendPresenceUpdate('composing', m.chat)
        const html = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&family=Share+Tech+Mono&display=swap');
            body { margin:0; width:1000px; height:600px; display:flex; align-items:center; justify-content:center; background:#0a0a0a; font-family:'Inter'; }
            .wallet { position:relative; width:920px; height:520px; background:#2b1d14; border-radius:35px; padding:45px; display:flex; border:5px solid #3d2a1e; box-shadow:0 60px 100px rgba(0,0,0,1); }
            .cash-area { flex:1; display:flex; flex-direction:column; justify-content:flex-end; }
            .cash-label { color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:5px; font-weight:900; font-size:16px; }
            .cash-amt { color:#fff; font-size:110px; font-weight:900; margin-top:-15px; }
            .card-slot { position:absolute; right:50px; top:50px; width:520px; height:320px; background:${card.hasCard ? card.color : 'rgba(255,255,255,0.05)'}; border-radius:25px; transform:rotate(-3deg); padding:35px; box-shadow:0 30px 50px rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.15); display:flex; flex-direction:column; justify-content:space-between; }
            .chip { width:75px; height:55px; background:linear-gradient(135deg, #ffd700, #b8860b); border-radius:10px; }
            .card-no { font-family:'Share Tech Mono'; color:#fff; font-size:34px; letter-spacing:4px; text-shadow: 2px 2px #000; }
            .brand { font-weight:900; font-style:italic; font-size:28px; color:#fff; }
        </style></head><body>
            <div class="wallet">
                <div class="cash-area">
                    <div class="cash-label">Liquidità</div>
                    <div class="cash-amt">€${userMoney.toLocaleString()}</div>
                </div>
                <div class="card-slot">
                    ${card.hasCard ? `
                        <div class="chip"></div>
                        <div class="card-no">${card.cardNumber}</div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                            <div style="color:#fff; font-weight:700;">${(m.pushName || 'USER').toUpperCase()}</div>
                            <div class="brand">${card.brand}</div>
                        </div>
                    ` : '<div style="color:rgba(255,255,255,0.1); font-weight:900; text-align:center; margin-top:110px; font-size:30px;">VUOTO</div>'}
                </div>
            </div>
        </body></html>`

        const ss = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, { html, viewport: { width: 1000, height: 600 }, options: { type: 'jpeg', quality: 90 }}, { responseType: 'arraybuffer' })
        return conn.sendMessage(m.chat, { 
            image: Buffer.from(ss.data), 
            caption: `👛 *PORTAFOGLIO PERSONALE*\n\n💵 *Contanti:* €${userMoney.toLocaleString()}`,
            buttons: [{ buttonId: '.banca', buttonText: { displayText: '🏧 VAI IN BANCA' }, type: 1 }]
        }, { quoted: m })
    }

    if (command === 'banca') {
        if (!card.hasCard) return conn.sendMessage(m.chat, { text: '🚫 Errore: Inserire la carta magnetica per accedere allo sportello.' }, { quoted: m })
        await conn.sendPresenceUpdate('composing', m.chat)
        const htmlBank = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;700;900&family=JetBrains+Mono:wght@500&display=swap');
            body { margin:0; width:1000px; height:600px; display:flex; align-items:center; justify-content:center; background:#1a1a1a; font-family:'Inter'; }
            .atm-frame { width:950px; height:580px; background:linear-gradient(145deg, #333, #111); border-radius:20px; display:flex; padding:30px; box-sizing:border-box; border:4px solid #444; }
            .screen-area { flex:1.5; background:#000; border-radius:10px; padding:25px; border:15px solid #222; position:relative; overflow:hidden; display:flex; }
            .glass-card { flex:1; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); padding:40px; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:2; }
            .bg-glow { position:absolute; width:300px; height:300px; background: #00ffcc; filter:blur(150px); opacity:0.15; top:50%; left:50%; transform:translate(-50%, -50%); }
            .panel-right { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:30px; }
            .keypad { display:grid; grid-template-columns: repeat(3, 60px); gap:10px; background:#222; padding:15px; border-radius:10px; }
            .key { background:linear-gradient(145deg, #444, #222); height:50px; border-radius:5px; color:#fff; font-family:'JetBrains Mono'; display:flex; align-items:center; justify-content:center; border-bottom:3px solid #111; }
        </style></head><body>
            <div class="atm-frame">
                <div class="screen-area">
                    <div class="bg-glow"></div>
                    <div class="glass-card">
                        <div style="color:#fff; font-size:20px; opacity:0.6;">SALDO IN DEPOSITO</div>
                        <div style="color:#fff; font-size:85px; font-weight:900;">€${userBank.toLocaleString()}</div>
                        <div style="color:#00ffcc; font-family:'JetBrains Mono'; margin-top:20px; border:1px solid #00ffcc; padding:5px 15px; border-radius:5px;">SESSIONE ATTIVA</div>
                    </div>
                </div>
                <div class="panel-right">
                    <div style="width:180px; height:15px; background:#000; border-radius:20px; box-shadow: 0 0 10px #00ffcc;"></div>
                    <div class="keypad">
                        <div class="key">1</div><div class="key">2</div><div class="key">3</div>
                        <div class="key">4</div><div class="key">5</div><div class="key">6</div>
                        <div class="key">7</div><div class="key">8</div><div class="key">9</div>
                        <div class="key" style="color:#ff4444; font-size:10px;">ANNUL</div><div class="key">0</div><div class="key" style="color:#44ff44; font-size:10px;">INVIO</div>
                    </div>
                </div>
            </div>
        </body></html>`

        const ssB = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, { html: htmlBank, viewport: { width: 1000, height: 600 }, options: { type: 'jpeg', quality: 90 }}, { responseType: 'arraybuffer' })
        return conn.sendMessage(m.chat, { 
            image: Buffer.from(ssB.data), 
            caption: `🏛️ *SPORTELLO BANCOMAT*\n\n💰 *Saldo:* €${userBank.toLocaleString()}\n💳 *Carta:* ${card.brand} ${card.tier}`,
            buttons: [
                { buttonId: '.dep all', buttonText: { displayText: 'DEPOSITA TUTTO' }, type: 1 },
                { buttonId: '.with all', buttonText: { displayText: 'PRELEVA TUTTO' }, type: 1 }
            ]
        }, { quoted: m })
    }

    if (command === 'dep' || command === 'with') {
        if (!card.hasCard) return conn.sendMessage(m.chat, { text: '🚫 Serve la carta.' }, { quoted: m })
        let input = (text || '').trim().toLowerCase()
        let amt = 0
        if (input === 'all') {
            amt = command === 'dep' ? userMoney : userBank
        } else {
            amt = parseInt(input.replace(/[^0-9]/g, ''))
        }

        if (isNaN(amt) || amt <= 0) return conn.sendMessage(m.chat, { text: '❌ Specifica una cifra valida.' }, { quoted: m })
        
        const isDep = command === 'dep'
        if (isDep) {
            if (userMoney < amt) return conn.sendMessage(m.chat, { text: '❌ Cash insufficiente.' }, { quoted: m })
            walletDb[jid].money -= amt; walletDb[jid].bank += amt
        } else {
            if (userBank < amt) return conn.sendMessage(m.chat, { text: '❌ Saldo insufficiente.' }, { quoted: m })
            walletDb[jid].bank -= amt; walletDb[jid].money += amt
        }
        
        saveDb(walletPath, walletDb)
        
        return conn.sendMessage(m.chat, { 
            text: `✅ Operazione di €${amt.toLocaleString()} eseguita.`,
            buttons: [{ buttonId: isDep ? '.banca' : '.wallet', buttonText: { displayText: isDep ? '🏧 VAI IN BANCA' : '👛 VAI AL PORTAFOGLIO' }, type: 1 }]
        }, { quoted: m })
    }

    if (command === 'free' || command === 'daily') {
        const cooldown = 86400000 // 24 ore
        const now = Date.now()
        if (now - (walletDb[jid].lastFree || 0) < cooldown) {
            const remaining = cooldown - (now - walletDb[jid].lastFree)
            const hours = Math.floor(remaining / 3600000)
            const mins = Math.floor((remaining % 3600000) / 60000)
            return conn.sendMessage(m.chat, { text: `⏳ Hai già riscosso. Torna tra ${hours}h e ${mins}m.` }, { quoted: m })
        }

        const prize = Math.floor(Math.random() * (500 - 100 + 1)) + 100
        walletDb[jid].money += prize
        walletDb[jid].lastFree = now
        saveDb(walletPath, walletDb)

        const htmlFree = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
            body { margin:0; width:1000px; height:600px; display:flex; align-items:center; justify-content:center; background:#050505; font-family:'Inter'; }
            .box { width:800px; height:400px; background:linear-gradient(45deg, #111, #222); border-radius:30px; border:5px solid #ffd700; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 0 50px rgba(255,215,0,0.2); }
            .prize { color:#ffd700; font-size:120px; text-shadow: 0 0 30px #ffd700; }
        </style></head><body>
            <div class="box">
                <div style="color:#fff; font-size:30px; letter-spacing:10px; opacity:0.5;">BONUS GIORNALIERO</div>
                <div class="prize">€${prize}</div>
                <div style="color:#fff; font-size:20px;">ACCREDITATO NEL PORTAFOGLIO</div>
            </div>
        </body></html>`

        const ssF = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, { html: htmlFree, viewport: { width: 1000, height: 600 }, options: { type: 'jpeg', quality: 90 }}, { responseType: 'arraybuffer' })
        return conn.sendMessage(m.chat, { image: Buffer.from(ssF.data), caption: `🎁 *REGALO RISCOSSO!*\nHai ricevuto €${prize}.`, buttons: [{ buttonId: '.wallet', buttonText: { displayText: '👛 PORTAFOGLIO' }, type: 1 }] }, { quoted: m })
    }

    if (command === 'shop' && text === 'buy carta') {
        if (card.hasCard) return conn.sendMessage(m.chat, { text: '⚠️ Hai già una carta.' }, { quoted: m })
        if (userMoney < 200) return conn.sendMessage(m.chat, { text: '❌ Fondi insufficienti (200€).' }, { quoted: m })
        const newCard = generateCard()
        walletDb[jid].money -= 200
        bancaDb[jid] = { hasCard: true, ...newCard, cardNumber: newCard.number }
        saveDb(walletPath, walletDb); saveDb(bancaPath, bancaDb)
        return conn.sendMessage(m.chat, { text: `✅ *CARTA EMESSA!* (${newCard.brand} ${newCard.tier})` }, { quoted: m })
    }
}

handler.command = ['wallet', 'bal', 'banca', 'shop', 'dep', 'with', 'free', 'daily']
export default handler