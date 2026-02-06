import axios from 'axios'
import fs from 'fs'
import { join } from 'path'
import '../config.js'

const BROWSERLESS_KEY = global.APIKeys?.browserless
const plPath = './media/playlists.json'
const tmpDir = './media/tmp/playlist'

const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000), secs = ((ms % 60000) / 1000).toFixed(0)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const formatTotalTime = (ms) => {
    const hours = Math.floor(ms / 3600000), mins = Math.floor((ms % 3600000) / 60000)
    return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

const handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    if (!fs.existsSync(plPath)) fs.writeFileSync(plPath, JSON.stringify({}))
    let pl = JSON.parse(fs.readFileSync(plPath, 'utf-8'))
    
    if (command === 'crea' || command === 'cplaylist') {
        if (!text) return m.reply(`『 ❌ 』 Specifica un nome per la playlist.`)
        if (text.length > 20) return m.reply('『 ❌ 』 Nome troppo lungo.')
        if (!pl[m.sender]) pl[m.sender] = {}
        if (pl[m.sender][text]) return m.reply('『 ⚠️ 』 Esiste già.')
        pl[m.sender][text] = []
        fs.writeFileSync(plPath, JSON.stringify(pl, null, 2))
        return m.reply(`『 ✅ 』 Playlist *${text}* creata!`)
    }

    const name = text.trim()

    if (!name) {
        let userPls = Object.keys(pl[m.sender] || {})
        if (userPls.length === 0) return m.reply(`『 ⚠️ 』 Non hai playlist.`)
        let buttons = userPls.map(p => ({
            buttonId: `${usedPrefix}${command} ${p}`,
            buttonText: { displayText: p }, type: 1
        }))
        return conn.sendMessage(m.chat, { text: '『 📂 』 *Le tue Playlist*', buttons }, { quoted: m })
    }

    if (!pl[m.sender]?.[name]) return m.reply('『 ❌ 』 Playlist non trovata.')
    const songs = pl[m.sender][name]

    if (command === 'pcompleta') {
        if (m.chat.endsWith('@g.us')) return m.reply('『 ❌ 』 Solo in privato.')
        let totalMs = songs.reduce((acc, s) => acc + (s.duration || 0), 0)
        let list = songs.map((s, i) => `${i + 1}. 🎵 *${s.title}* - ${s.artist} (${formatTime(s.duration)})`).join('\n')
        return m.reply(`🎧 *LISTA COMPLETA: ${name}*\n\n${list}\n\n📊 *Totale brani:* ${songs.length}\n🕒 *Durata:* ${formatTotalTime(totalMs)}`)
    }

    if (command === 'listabrani') {
        if (songs.length === 0) return m.reply('『 📁 』 Playlist vuota.')
        let buttons = songs.slice(0, 15).map((s, i) => ({
            buttonId: `${usedPrefix}delbrano ${name} | ${i + 1}`,
            buttonText: { displayText: `${i + 1}. ${s.title.slice(0, 20)}` }, type: 1
        }))
        return conn.sendMessage(m.chat, { text: `『 🗑️ 』 Elimina da *${name}*:`, buttons }, { quoted: m })
    }

    if (songs.length === 0) return m.reply('『 📁 』 Playlist vuota.')

    // Presence spostata all'inizio del processo di rendering
    await conn.sendPresenceUpdate('recording', m.chat)

    const top10 = songs.slice(0, 10)
    const totalMs = songs.reduce((a, s) => a + (s.duration || 0), 0)
    const userN = (m.pushName || 'User').slice(0, 15)
    const plImage = songs[songs.length - 1]?.image || 'https://i.ibb.co/hJW7WwxV/varebot.jpg'
    const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => plImage)

    const html = `<html><head><style>
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;600;800&display=swap');
        body { background: #121212; color: white; font-family: 'Figtree', sans-serif; width: 800px; margin: 0; padding: 40px; box-sizing: border-box; overflow: hidden; position: relative; }
        .bg-gradient { position: absolute; top: 0; left: 0; width: 100%; height: 600px; background: linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(18,18,18,0) 100%); z-index: 0; }
        .content { position: relative; z-index: 1; }
        .header { display: flex; align-items: flex-end; gap: 28px; margin-bottom: 40px; }
        .pl-cover { width: 232px; height: 232px; border-radius: 4px; object-fit: cover; box-shadow: 0 15px 50px rgba(0,0,0,0.8); }
        .pl-name { font-size: 72px; font-weight: 800; margin: 0; letter-spacing: -3px; line-height: 1; }
        .meta { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; margin-top: 12px; }
        .user-pp { width: 26px; height: 26px; border-radius: 50%; }
        .track { display: flex; align-items: center; padding: 12px 0; }
        .track-img { width: 48px; height: 48px; border-radius: 4px; margin-right: 16px; }
        .track-info { flex: 1; }
        .title { font-weight: 600; font-size: 17px; display: block; margin-bottom: 2px; }
        .artist { color: #b3b3b3; font-size: 14px; }
        .duration-cell { color: #b3b3b3; font-size: 14px; width: 60px; text-align: right; font-variant-numeric: tabular-nums; }
    </style></head><body>
        <div class="bg-gradient"></div>
        <div class="content">
            <div class="header">
                <img src="${plImage}" class="pl-cover">
                <div class="header-text">
                    <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Playlist Pubblica</div>
                    <h1 class="pl-name">${name}</h1>
                    <div class="meta">
                        <img src="${pp}" class="user-pp">
                        <span>${userN}</span> • <span>${songs.length} brani, ${formatTotalTime(totalMs)}</span>
                    </div>
                </div>
            </div>
            <div style="border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; padding-bottom: 10px; color: #b3b3b3; display: flex; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                <div style="width:40px">#</div><div style="flex:1">Titolo</div><div style="width:60px; text-align:right">🕒</div>
            </div>
            ${top10.map((s, i) => `
            <div class="track">
                <div style="width:40px; color:#b3b3b3; font-weight: 600;">${i+1}</div>
                <img src="${s.image}" class="track-img">
                <div class="track-info">
                    <span class="title">${s.title.replace(/[<>]/g, '')}</span>
                    <span class="artist">${s.artist.replace(/[<>]/g, '')}</span>
                </div>
                <div class="duration-cell">${formatTime(s.duration)}</div>
            </div>`).join('')}
        </div>
    </body></html>`

    try {
        const response = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
            html, options: { type: 'jpeg', quality: 90 }, viewport: { width: 800, height: 1050 }
        }, { responseType: 'arraybuffer', timeout: 25000 })

        const fileName = join(tmpDir, `pl_${Date.now()}.jpg`)
        fs.writeFileSync(fileName, Buffer.from(response.data))

        const buttons = [
            { buttonId: `${usedPrefix}delplaylist ${name}`, buttonText: { displayText: '🗑️ Elimina Playlist' }, type: 1 },
            { buttonId: `${usedPrefix}listabrani ${name}`, buttonText: { displayText: '🎵 Elimina Brano' }, type: 1 },
            { buttonId: `${usedPrefix}pcompleta ${name}`, buttonText: { displayText: '📄 Lista Completa' }, type: 1 }
        ]

        const caption = `『 🎵 』 *PLAYLIST:* ${name.toUpperCase()}\n\n` +
                        `👤 *Creatore:* ${userN}\n` +
                        `🔢 *Brani:* ${songs.length}\n` +
                        `🕒 *Durata Totale:* ${formatTotalTime(totalMs)}`

        await conn.sendMessage(m.chat, {
            image: { url: fileName },
            caption: caption,
            buttons: buttons,
            headerType: 4
        }, { quoted: m })

        setTimeout(() => { if (fs.existsSync(fileName)) fs.unlinkSync(fileName) }, 15000)
    } catch (e) {
        return m.reply('『 ❌ 』 Errore tecnico nel rendering.')
    }
}

handler.command = ['playlist', 'listabrani', 'crea', 'cplaylist']
export default handler