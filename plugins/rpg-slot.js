import axios from 'axios'
import fs from 'fs'

const walletPath = './media/wallet.json'
const BROWSERLESS_KEY = global.APIKeys?.browserless

const getDb = (path) => {
    if (!fs.existsSync('./media')) fs.mkdirSync('./media')
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
}

const saveDb = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣']
const weights = [40, 30, 20, 9, 1] // Probabilità per ogni simbolo

const spinReel = () => {
    const totalWeight = weights.reduce((acc, w) => acc + w, 0)
    const random = Math.floor(Math.random() * totalWeight)
    let weightSum = 0
    
    for (let i = 0; i < symbols.length; i++) {
        weightSum += weights[i]
        if (random < weightSum) return symbols[i]
    }
    return symbols[0]
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const jid = m.sender
    let walletDb = getDb(walletPath)
    if (!walletDb[jid]) walletDb[jid] = { money: 0, bank: 0 }

    const userMoney = walletDb[jid].money

    // Gestione Argomenti (Puntata)
    let bet = 0
    if (!args[0] || args[0] === 'help') return m.reply(`🎰 *CASINO ZEXIN*\n\nUso: *${usedPrefix}slot [cifra]*\nEsempio: *${usedPrefix}slot 100* o *${usedPrefix}slot all*`)
    
    if (args[0] === 'all') {
        bet = userMoney
    } else {
        bet = parseInt(args[0])
    }

    if (isNaN(bet) || bet <= 0) return m.reply('❌ Inserisci una puntata valida.')
    if (bet > userMoney) return m.reply(`❌ Non hai abbastanza contanti (Saldo: €${userMoney}).`)

    // Rimuovi i soldi (pagamento anticipato)
    walletDb[jid].money -= bet
    saveDb(walletPath, walletDb)

    // Esegui lo Spin
    const reels = [spinReel(), spinReel(), spinReel()]
    
    // Calcolo Vincita
    let multiplier = 0
    let winType = 'PERSO'
    let color = '#ff4444' // Rosso per sconfitta

    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        if (reels[0] === '7️⃣') {
            multiplier = 10
            winType = 'JACKPOT'
            color = '#ffd700' // Oro
        } else {
            multiplier = 5
            winType = 'BIG WIN'
            color = '#00ffcc' // Ciano
        }
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        multiplier = 1.5
        winType = 'RECUPERO'
        color = '#ff9900' // Arancione
    }

    const winnings = Math.floor(bet * multiplier)
    if (winnings > 0) {
        walletDb[jid].money += winnings
        saveDb(walletPath, walletDb)
    }

    // Generazione Immagine
    await conn.sendPresenceUpdate('composing', m.chat)
    
    const html = `<html><head><style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
        body { margin:0; width:800px; height:400px; background:#050505; display:flex; align-items:center; justify-content:center; font-family:'Orbitron', sans-serif; }
        .machine { 
            width: 700px; height: 320px; 
            background: linear-gradient(180deg, #222, #111);
            border: 4px solid #333; 
            border-radius: 20px; 
            padding: 20px;
            box-shadow: 0 0 50px rgba(0,0,0,0.8), inset 0 0 100px #000;
            display: flex; flex-direction: column; align-items: center; position: relative;
        }
        .screen {
            width: 90%; height: 150px;
            background: #000;
            border: 2px solid #444;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: space-around;
            padding: 0 20px;
            box-shadow: inset 0 0 30px #000;
            margin-bottom: 20px;
        }
        .reel {
            font-size: 80px;
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));
        }
        .info-panel {
            width: 100%; display: flex; justify-content: space-between; align-items: center;
            color: #fff; text-transform: uppercase;
        }
        .win-box {
            font-size: 40px; color: ${color}; text-shadow: 0 0 20px ${color};
        }
        .bet-info {
            font-size: 18px; color: #666; text-align: right;
        }
        .lights {
            position: absolute; top: -10px; width: 80%; height: 5px; background: ${color};
            border-radius: 10px; box-shadow: 0 0 20px ${color};
        }
    </style></head><body>
        <div class="machine">
            <div class="lights"></div>
            <div class="screen">
                <div class="reel">${reels[0]}</div>
                <div class="reel">${reels[1]}</div>
                <div class="reel">${reels[2]}</div>
            </div>
            <div class="info-panel">
                <div class="win-box">${winnings > 0 ? `+€${winnings}` : 'PERSO'}</div>
                <div class="bet-info">
                    <div>PUNTATA: €${bet}</div>
                    <div style="color:${color}">${winType}</div>
                </div>
            </div>
        </div>
    </body></html>`

    try {
        const ss = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
            html: html,
            viewport: { width: 800, height: 400 },
            options: { type: 'jpeg', quality: 90 }
        }, { responseType: 'arraybuffer' })

        // Bottoni per rigiocare velocemente
        const buttons = [
            { buttonId: `${usedPrefix}slot ${bet}`, buttonText: { displayText: `🎰 RIPROVA (€${bet})` }, type: 1 },
            { buttonId: `${usedPrefix}wallet`, buttonText: { displayText: '👛 PORTAFOGLIO' }, type: 1 }
        ]

        await conn.sendMessage(m.chat, {
            image: Buffer.from(ss.data),
            caption: `🎰 *SLOT MACHINE RESULT*\n\n` +
                     `🎲 *Combinazione:* ${reels.join(' | ')}\n` +
                     `💰 *Vincita:* €${winnings}\n` +
                     `🏦 *Saldo:* €${walletDb[jid].money}`,
            buttons: buttons,
            headerType: 4
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('❌ Errore grafico slot. Riprova.')
    }
}

handler.command = ['slot', 'casino', 'bet']
handler.tags = ['rpg']
handler.help = ['slot <cifra>', 'slot all']
export default handler