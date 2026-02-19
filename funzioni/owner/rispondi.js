import axios from 'axios'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const handler = async (m, { conn }) => {
    if (m.key.fromMe) return

    const botJid = conn.decodeJid(conn.user.id)
    const cleanText = m.text.replace(/@\d+/g, '').trim()
    
    const isBotMentioned = m.text.toLowerCase().includes('bot') || m.mentionedJid?.includes(botJid)
    const isReplyToBot = m.quoted && m.quoted.sender === botJid

    if (!isBotMentioned && !isReplyToBot) return
    if (cleanText.length < 2) return

    const apikey = global.APIKeys.openrouter
    if (!apikey) {
        console.error('[ERRORE] global.APIKeys.openrouter non configurata!')
        return 
    }

    const dirPath = join(process.cwd(), 'media')
    const filePath = join(dirPath, 'trinity.json')

    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })

    let db = {}
    if (existsSync(filePath)) {
        try { 
            db = JSON.parse(readFileSync(filePath)) 
        } catch (e) { 
            db = {} 
        }
    }

    const userId = m.sender
    if (!db[userId]) db[userId] = []

    const systemMessage = { 
        role: 'system', 
        content: 'Sei 333, un assistente avanzato, audace e diretto. Creato da Zexin per essere superiore. PARLA SEMPRE E SOLO IN LINGUA ITALIANA. Sii deciso, conciso e non usare mai l\'inglese.' 
    }

    const messages = [
        systemMessage,
        ...db[userId],
        { role: 'user', content: cleanText }
    ]

    try {
        await conn.sendPresenceUpdate('composing', m.chat)

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'arcee-ai/trinity-mini:free',
            messages: messages,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${apikey}`,
                'Content-Type': 'application/json'
            }
        })
        
        const aiResponse = response.data?.choices?.[0]?.message?.content

        if (aiResponse) {
            const finalTxt = aiResponse.trim()
            await conn.sendMessage(m.chat, { 
                text: finalTxt,
                ...global.newsletter() 
            }, { quoted: m })

            db[userId].push({ role: 'user', content: cleanText })
            db[userId].push({ role: 'assistant', content: finalTxt })
            
            if (db[userId].length > 6) db[userId] = db[userId].slice(-6)
            
            writeFileSync(filePath, JSON.stringify(db, null, 2))
        }

    } catch (e) {
        console.error('[OPENROUTER ERROR]:', e.response?.data || e.message)
    }
}

handler.customPrefix = /bot|zexin/i
handler.command = new RegExp

export default handler