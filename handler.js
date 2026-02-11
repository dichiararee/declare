import { smsg } from './lib/simple.js'
import chalk from 'chalk'
import print from './lib/print.js'
import { prima as antiPrivato } from './funzioni/owner/antiprivato.js'
import rispondiGemini from './funzioni/owner/rispondi.js'
import { antilink } from './funzioni/admin/antilink.js'

export default async function handler(conn, chatUpdate) {
    if (!chatUpdate) return
    let m = chatUpdate
    
    try {
        m = smsg(conn, m)
        if (!m || !m.message) return

        // --- FORZA IL RICONOSCIMENTO DEL QUOTED ---
        const msg = m.message
        const type = Object.keys(msg)[0]
        const quoted = msg[type]?.contextInfo?.quotedMessage
        
        if (quoted && !m.quoted) {
            const quotedId = msg[type].contextInfo.stanzaId
            const quotedSender = msg[type].contextInfo.participant || msg[type].contextInfo.remoteJid
            
            m.quoted = {
                id: quotedId,
                sender: conn.decodeJid(quotedSender),
                message: quoted,
                text: quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || ''
            }
        }

        let txt = m.message.conversation || 
                  m.message.extendedTextMessage?.text || 
                  m.message.imageMessage?.caption || 
                  m.message.videoMessage?.caption || 
                  m.msg?.text || 
                  m.msg?.caption || 
                  m.text || ''
        
        m.text = txt.trim()

        const jid = m.chat
        const isGroup = jid.endsWith('@g.us')
        const botId = conn.decodeJid(conn.user.id)
        
        const sender = m.sender
        m.senderLid = m.key.participant?.endsWith('@lid') ? m.key.participant : 'N/A'
        const senderNum = sender.replace(/[^0-9]/g, '')
        const isOwner = global.owner.some(o => o[0].replace(/[^0-9]/g, '') === senderNum)

        let isAdmin = false
        let isBotAdmin = false
        let participants = []
        let groupMetadata = {}

        if (isGroup) {
            groupMetadata = await conn.groupMetadata(jid).catch(() => ({}))
            participants = groupMetadata.participants || []
            
            const userObj = participants.find(p => 
                p.id === sender || p.id === m.senderLid || p.lid === sender || p.lid === m.senderLid
            )
            const botObj = participants.find(p => p.id === botId || p.id === conn.user.lid)

            isAdmin = userObj?.admin !== null || isOwner
            isBotAdmin = botObj?.admin !== null
        } else {
            isAdmin = isOwner
        }

        m.isAdmin = isAdmin
        m.isBotAdmin = isBotAdmin
        m.isOwner = isOwner
        m.userRole = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'MEMBRO')
        m.botRole = isBotAdmin ? 'ADMIN' : 'MEMBRO'

        global.db.data = global.db.data || { users: {}, groups: {}, settings: {} }
        if (isGroup && !global.db.data.groups[jid]) global.db.data.groups[jid] = { antilink: true }

        if (isGroup && global.db.data.groups[jid]?.antilink) {
            if (await antilink(m, { conn, isAdmin, isBotAdmin })) return
        }

        // Adesso print.js vedrà m.quoted popolato
        await print(m, conn)
        
        if (m.key.fromMe) return

        await antiPrivato.call(conn, m, { isOwner })
        
        if (global.db.data.settings?.[botId]?.ai_rispondi && m.text) {
            try {
                await rispondiGemini(m, { conn, isOwner })
            } catch (e) {
                console.error(chalk.red('[Gemini Error]:'), e.message)
            }
        }

        const messageText = m.text || ''
        let usedPrefix = ''
        const _prefix = global.prefix

        if (_prefix instanceof RegExp) {
            if (_prefix.test(messageText)) usedPrefix = messageText.match(_prefix)[0]
        } else if (typeof _prefix === 'string' && messageText.startsWith(_prefix)) {
            usedPrefix = _prefix
        }

        if (!usedPrefix) return

        const args = messageText.slice(usedPrefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const text = args.join(' ')

        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue
            
            const isAccept = Array.isArray(plugin.command) ? 
                plugin.command.includes(command) : 
                (plugin.command instanceof RegExp ? plugin.command.test(command) : plugin.command === command)

            if (isAccept) {
                if (plugin.owner && !isOwner) { await global.dfail('owner', m, conn); continue }
                if (plugin.restricted && !isAdmin) { await global.dfail('restricted', m, conn); continue }
                if (plugin.group && !isGroup) { await global.dfail('group', m, conn); continue }
                if (plugin.private && isGroup) { await global.dfail('private', m, conn); continue }
                if (plugin.admin && !isAdmin) { await global.dfail('admin', m, conn); continue }
                if (plugin.botAdmin && !isBotAdmin) { await global.dfail('botAdmin', m, conn); continue }

                try {
                    await plugin(m, { 
                        conn, args, text, usedPrefix, command, 
                        isOwner, isAdmin, isBotAdmin, 
                        participants, groupMetadata, isGroup 
                    })
                } catch (e) {
                    console.error(e)
                }
                break
            }
        }
    } catch (e) {
        console.error(chalk.red('[Handler Error]:'), e)
    }
}

global.dfail = async (type, m, conn) => {
    const msg = {
        owner: '`𐔌👑꒱` _*Solo il proprietario del bot può usare questo comando!*_',
        admin: '`𐔌🛡️ ꒱` _*Solo gli amministratori del gruppo possono usare questo comando!*_',
        restricted: '`𐔌🚫 ꒱` _*Questo comando è limitato solo agli amministratori!*_',
        group: '`𐔌👥 ꒱` _*Questo comando può essere usato solo in chat di gruppo!*_',
        private: '`𐔌📩 ꒱` _*Questo comando può essere usato solo in chat privata!*_',
        disabled: '`𐔌🔒 ꒱` _*Questo comando è stato disattivato dall\'owner!*_',
        botAdmin: '`𐔌🤖 ꒱` _*Devo essere admin per eseguire questo comando!*_'
    }[type]

    if (msg) {
        return conn.sendMessage(m.chat, {
            text: msg,
            ...global.newsletter()
        }, { quoted: m })
    }
}