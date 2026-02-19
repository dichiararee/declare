import fs from 'fs'

const plPath = './media/playlists.json'
const songsDbPath = './media/canzoni.json'

const handler = async (m, { conn, usedPrefix, command, text }) => {
    console.log(`[SALVA LOG] Comando ricevuto: ${command}`)
    
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

    if (command === 'salva') {
        if (!text) return m.reply(`『 ❌ 』 Uso: ${usedPrefix}salva Brano | Autore`)

        let parts = text.split('|').map(v => v.trim())
        let songTitle = parts[0]
        let songAuthor = parts[1] || ''
        let plName = parts[2] || null

        console.log(`[SALVA LOG] Analisi: Titolo="${songTitle}", Playlist="${plName}"`)

        // FASE 1: GENERAZIONE BOTTONI CON RELAYMESSAGE
        if (!plName) {
            let userPls = pl[m.sender] || {}
            let keys = Object.keys(userPls)

            if (keys.length === 0) return m.reply('『 ⚠️ 』 Non hai playlist. Creane una con: .crea nome')

            const buttons = keys.map(name => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ 
                    display_text: `${name.toUpperCase()} (${userPls[name].length})`, 
                    id: `${usedPrefix}salva ${songTitle}|${songAuthor}|${name}` 
                })
            }))

            console.log(`[SALVA LOG] Invio relayMessage con ${buttons.length} bottoni`)

            const msg = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            header: { title: "◯  𐙚  *──  p l a y l i s t  ──*", hasVideoMessage: false },
                            body: { text: `In quale playlist vuoi salvare\n*${songTitle}*?` },
                            footer: { text: "333 Music System" },
                            nativeFlowMessage: { buttons: buttons },
                            contextInfo: {
                                ...global.newsletter().contextInfo,
                                mentionedJid: [m.sender],
                                isForwarded: true,
                                stanzaId: 'ZexinSystem',
                                participant: '0@s.whatsapp.net'
                            }
                        }
                    }
                }
            }

            return await conn.relayMessage(m.chat, msg, {})
        }

        // FASE 2: SALVATAGGIO
        console.log(`[SALVA LOG] Tentativo salvataggio in: ${plName}`)
        if (!pl[m.sender] || !pl[m.sender][plName]) return m.reply(`『 ❌ 』 Playlist *${plName}* non esiste.`)

        let searchKey = songTitle.toLowerCase()
        let songData = songsDb[searchKey]

        if (!songData) {
            let allKeys = Object.keys(songsDb)
            let match = allKeys.find(k => searchKey.includes(k) || k.includes(searchKey))
            if (match) songData = songsDb[match]
        }

        if (!songData) return m.reply(`『 ❌ 』 Brano non trovato nel database.\nUsa prima *.cur* per registrarlo.`)

        if (!Array.isArray(pl[m.sender][plName])) pl[m.sender][plName] = []

        if (pl[m.sender][plName].some(s => s.title.toLowerCase() === songData.title.toLowerCase())) {
            return m.reply(`『 ⚠️ 』 *${songData.title}* è già in *${plName}*.`)
        }

        pl[m.sender][plName].push(songData)
        fs.writeFileSync(plPath, JSON.stringify(pl, null, 2))
        
        console.log('[SALVA LOG] Salvataggio completato con successo')
        return m.reply(`『 ✅ 』 *${songData.title}* salvata in *${plName}*!`)
    }
}

handler.command = ['salva', 'delplaylist', 'delbrano']
export default handler