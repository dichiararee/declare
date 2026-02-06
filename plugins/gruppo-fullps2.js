import fs from 'fs'

const plPath = './media/playlists.json'

const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000), secs = ((ms % 60000) / 1000).toFixed(0)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const formatTotalTime = (ms) => {
    const hours = Math.floor(ms / 3600000), mins = Math.floor((ms % 3600000) / 60000)
    return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}

const handler = async (m, { conn, text }) => {
    let pl = JSON.parse(fs.readFileSync(plPath, 'utf-8'))
    const name = text.trim()

    if (!name || !pl[m.sender]?.[name]) return m.reply('『 ❌ 』 Playlist non trovata.')
    
    const songs = pl[m.sender][name]
    const totalMs = songs.reduce((acc, s) => acc + (s.duration || 0), 0)
    
    let list = songs.map((s, i) => `${i + 1}. 🎵 *${s.title}* - ${s.artist} (${formatTime(s.duration)})`).join('\n')
    
    const caption = `🎧 *LISTA COMPLETA: ${name.toUpperCase()}*\n\n` +
                    `${list}\n\n` +
                    `📊 *Totale brani:* ${songs.length}\n` +
                    `🕒 *Durata:* ${formatTotalTime(totalMs)}`

    return m.reply(caption)
}

handler.command = ['fullps']
handler.private = true
export default handler