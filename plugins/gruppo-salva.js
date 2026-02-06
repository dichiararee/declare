import fs from 'fs'

const plPath = './media/playlists.json'
const songsDbPath = './media/canzoni.json'

const handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!fs.existsSync(plPath)) fs.writeFileSync(plPath, JSON.stringify({}))
    if (!fs.existsSync(songsDbPath)) fs.writeFileSync(songsDbPath, JSON.stringify({}))
    
    let pl = JSON.parse(fs.readFileSync(plPath, 'utf-8'))
    let songsDb = JSON.parse(fs.readFileSync(songsDbPath, 'utf-8'))

    if (command === 'delplaylist') {
        if (!text || !pl[m.sender]?.[text]) return m.reply('『 ❌ 』 Playlist non trovata.')
        delete pl[m.sender][text]
        fs.writeFileSync(plPath, JSON.stringify(pl, null, 2))
        return m.reply(`『 ✅ 』 Playlist *${text}* eliminata.`)
    }

    if (command === 'delbrano') {
        let [plName, index] = text.split('|').map(v => v.trim())
        if (!pl[m.sender]?.[plName]) return m.reply('『 ❌ 』 Playlist non trovata.')
        let i = parseInt(index) - 1
        if (isNaN(i) || !pl[m.sender][plName][i]) return m.reply('『 ❌ 』 Numero brano non valido.')
        let removed = pl[m.sender][plName].splice(i, 1)
        fs.writeFileSync(plPath, JSON.stringify(pl, null, 2))
        return m.reply(`『 ✅ 』 Rimosso: *${removed[0].title}*`)
    }

    if (command === 'salva') {
        let [songQuery, plName] = text.split('|').map(v => v.trim())
        if (!songQuery) return m.reply(`『 ❌ 』 Uso: ${usedPrefix}salva Canzone | Playlist`)
        
        if (!pl[m.sender] || Object.keys(pl[m.sender]).length === 0) {
            return m.reply('『 ⚠️ 』 Non hai playlist. Creane una con: .crea nome')
        }

        // Se non specifica la playlist, mostra i bottoni
        if (!plName) {
            let buttons = Object.keys(pl[m.sender]).map(name => ({
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: name,
                    id: `${usedPrefix}salva ${songQuery} | ${name}`
                })
            }))
            
            return conn.sendMessage(m.chat, {
                text: `『 🎵 』 In quale playlist vuoi salvare *${songQuery}*?`,
                cards: [{
                    body: 'Seleziona una delle tue playlist qui sotto:',
                    buttons: buttons
                }]
            }, { quoted: m })
        }

        if (!pl[m.sender][plName]) return m.reply(`『 ❌ 』 La playlist *${plName}* non esiste.`)

        // Recupero dati dal database canzoni.json (popolato dal .cur)
        let songData = songsDb[songQuery.toLowerCase()]
        
        // Se non è nel DB, non possiamo salvarla con i metadati corretti (timeline, cover)
        if (!songData) {
            return m.reply(`『 ❌ 』 Brano non trovato nel database.\nEsegui prima *.cur* su questo brano per registrarlo con i metadati.`)
        }

        // Inizializza l'array se vuoto per evitare l'errore 'some'
        if (!Array.isArray(pl[m.sender][plName])) {
            pl[m.sender][plName] = []
        }

        // Controllo duplicati
        const exists = pl[m.sender][plName].some(s => s.title.toLowerCase() === songData.title.toLowerCase())
        if (exists) return m.reply(`『 ⚠️ 』 *${songData.title}* è già presente in *${plName}*.`)

        // Aggiunta brano
        pl[m.sender][plName].push(songData)
        fs.writeFileSync(plPath, JSON.stringify(pl, null, 2))
        
        return conn.sendMessage(m.chat, {
            text: `『 ✅ 』 *${songData.title}* salvata in *${plName}*!`,
            cards: [{
                body: `La playlist "${plName}" ora contiene ${pl[m.sender][plName].length} brani.`,
                buttons: [{
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '📂 Apri Playlist', id: `${usedPrefix}playlist ${plName}` })
                }]
            }]
        }, { quoted: m })
    }
}

handler.command = ['salva', 'delplaylist', 'delbrano']
export default handler