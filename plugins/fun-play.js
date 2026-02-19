import { exec } from 'child_process'
import { promisify } from 'util'
import search from 'youtube-search-api'
import { unlinkSync, readFileSync, existsSync, readdirSync, mkdirSync, lstatSync } from 'fs'
import path from 'path'

const execPromise = promisify(exec)

let handler = async (m, { conn, command, args, usedPrefix }) => {
    const tmpDir = path.resolve('./tmp')
    if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true })
    } else if (!lstatSync(tmpDir).isDirectory()) {
        unlinkSync(tmpDir)
        mkdirSync(tmpDir, { recursive: true })
    }

    const cookiePath = path.resolve('./cookies.txt')
    const cookieFlag = existsSync(cookiePath) ? `--cookies "${cookiePath}"` : ''

    if (command === 'play' && !args.length) {
        return m.reply(`🏮 Uso: \`${usedPrefix}play [titolo]\``)
    }

    if (args[0] === 'audio' || args[0] === 'video') {
        let isAudio = args[0] === 'audio'
        let url = args[1]
        if (!url || !url.includes('youtu')) return m.reply('🏮 Link non valido.')

        await m.reply(`⏳ Scaricando ${isAudio ? 'audio' : 'video'}...`)
        
        let baseName = `${Date.now()}`
        
        let cmd = [
            'yt-dlp',
            cookieFlag,
            '--remote-components ejs:github',
            '--js-runtime node',
            '--force-ipv4',
            '--no-warnings',
            '--no-check-certificate',
            isAudio ? '-f "ba/b" --extract-audio --audio-format mp3' : '-f "bv*[ext=mp4]+ba[ext=m4a]/best[ext=mp4]/b"',
            `-o "${tmpDir}/${baseName}.%(ext)s"`,
            `"${url}"`
        ].join(' ')

        try {
            await execPromise(cmd)
            let files = readdirSync(tmpDir)
            let found = files.find(f => f.startsWith(baseName))
            if (!found) throw new Error('File non generato')
            
            let finalPath = path.join(tmpDir, found)
            let data = readFileSync(finalPath)
            
            if (isAudio) {
                await conn.sendMessage(m.chat, { 
                    audio: data, 
                    mimetype: 'audio/mpeg', 
                    fileName: `audio.mp3` 
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, { 
                    video: data, 
                    mimetype: 'video/mp4', 
                    caption: '> Zexin System' 
                }, { quoted: m })
            }
            unlinkSync(finalPath)
        } catch (e) {
            console.error(e)
            if (e.message.includes('ffmpeg')) {
                m.reply(`❌ Errore: FFmpeg non è installato nel server.\nEsegui questo nel terminale:\n\`sudo apt update && sudo apt install ffmpeg -y\``)
            } else {
                m.reply(`❌ Errore durante il download. Riprova.`)
            }
        }
        return
    }

    let query = args.join(' ')
    let results = await search.GetListByKeyword(query, false, 5)
    if (!results || !results.items) return m.reply('❌ Nessun risultato.')

    const cards = results.items.map(v => {
        let thumb = v.thumbnail?.thumbnails?.[0]?.url || ''
        if (thumb.startsWith('//')) thumb = 'https:' + thumb
        
        return {
            image: { url: thumb },
            title: v.title,
            footer: '333',
            buttons: [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: `${usedPrefix}play audio https://www.youtube.com/watch?v=${v.id}` }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎥 Video', id: `${usedPrefix}play video https://www.youtube.com/watch?v=${v.id}` }) }
            ]
        }
    })

    await conn.sendMessage(m.chat, {
        text: `🔎 Risultati per: *${query}*`,
        cards: cards,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.canale?.id || '',
                newsletterName: global.canale?.nome || ''
            }
        }
    }, { quoted: m })
}

handler.command = ['play']
export default handler