import { smsg } from './lib/simple.js'
import chalk from 'chalk'
import print from './lib/print.js'
import { prima as antiPrivato } from './funzioni/owner/antiprivato.js'
import rispondiGemini from './funzioni/owner/rispondi.js'
import { antilink } from './funzioni/admin/antilink.js'
import store from './lib/store.js'
import fs from 'fs'
import path from 'path'

const decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.split(':')[0]
        const server = jid.split('@')[1]
        return decode + '@' + server
    }
    return jid
}

const areJidsSameUser = (jid1, jid2) => {
    if (!jid1 || !jid2) return false
    const n1 = jid1.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    const n2 = jid2.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    return n1 === n2
}

function initDatabase() {
    const dbPath = path.join(process.cwd(), 'database.json')
    if (!fs.existsSync(dbPath)) {
        const initialData = { users: {}, groups: {}, chats: {}, settings: {} }
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf-8')
    }
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
        global.db = {
            data: {
                users: data.users || {},
                groups: data.groups || {},
                chats: data.chats || {},
                settings: data.settings || {}
            }
        }
    } catch (e) {
        global.db = { data: { users: {}, groups: {}, chats: {}, settings: {} } }
    }
}

function saveDatabase() {
    const dbPath = path.join(process.cwd(), 'database.json')
    try {
        if (global.db?.data) {
            fs.writeFileSync(dbPath, JSON.stringify(global.db.data, null, 2), 'utf-8')
        }
    } catch (e) {
        console.error(e.message)
    }
}

initDatabase()
setInterval(saveDatabase, 5000)

export default async function handler(conn, chatUpdate) {
    if (!chatUpdate) return
    let m = chatUpdate
    
    if (!conn.loadMessage) {
        conn.loadMessage = (jid, id) => store.loadMessage(jid, id)
    }
    
    try {
        m = smsg(conn, m)
        if (!m || !m.message) return

        const msgType = Object.keys(m.message)[0]
        const msgContent = m.message[msgType]
        
        let txt = m.message.conversation || 
                  m.message.extendedTextMessage?.text || 
                  m.message.imageMessage?.caption || 
                  m.message.videoMessage?.caption || 
                  m.message.buttonsResponseMessage?.selectedButtonId || 
                  m.message.listResponseMessage?.singleSelectReply?.selectedRowId || 
                  m.message.templateButtonReplyMessage?.selectedId || 
                  m.message.interactiveResponseMessage?.body?.text || 
                  msgContent?.text || 
                  msgContent?.caption || 
                  m.text || ''
        
        if (m.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                let params = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
                if (params.id) txt = params.id
            } catch (e) { }
        }

        m.text = txt.trim()

        const contextInfo = msgContent?.contextInfo
        if (contextInfo?.quotedMessage) {
            const quotedMsg = {
                key: {
                    remoteJid: m.chat,
                    fromMe: contextInfo.participant === conn.decodeJid(conn.user.id),
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant
                },
                message: contextInfo.quotedMessage,
                messageTimestamp: contextInfo.quotedStanzaID || Date.now()
            }
            m.quoted = smsg(conn, quotedMsg)
        }

        const jid = m.chat
        const isGroup = jid.endsWith('@g.us')
        const isChannel = jid.endsWith('@newsletter')
        
        const botId = decodeJid(conn.user.id)
        const sender = decodeJid(m.sender)
        const senderLid = m.key.participant?.endsWith('@lid') ? decodeJid(m.key.participant) : null
        
        m.senderLid = senderLid || 'N/A'
        
        const senderNum = sender.split('@')[0].replace(/[^0-9]/g, '')
        const isOwner = global.owner.some(o => o[0].replace(/[^0-9]/g, '') === senderNum)

        let isAdmin = false
        let isBotAdmin = false
        let isRealAdmin = false 
        let participants = []
        let groupAdmins = []

        if (isGroup) {
            try {
                const groupMetadata = await conn.groupMetadata(jid)
                participants = groupMetadata.participants || []
            } catch (e) {
                participants = []
            }
            
            const userObj = participants.find(p => {
                const pJid = p.jid ? decodeJid(p.jid) : null
                const pId = decodeJid(p.id)
                
                if (pJid && areJidsSameUser(pJid, sender)) return true
                if (areJidsSameUser(pId, sender)) return true
                
                if (senderLid) {
                    const pLid = p.lid ? decodeJid(p.lid) : null
                    if (pLid && areJidsSameUser(pLid, senderLid)) return true
                    if (pId.endsWith('@lid') && areJidsSameUser(pId, senderLid)) return true
                }
                return false
            })

            const botObj = participants.find(p => {
                const pJid = p.jid ? decodeJid(p.jid) : null
                const pId = decodeJid(p.id)
                
                if (pJid && areJidsSameUser(pJid, botId)) return true
                if (areJidsSameUser(pId, botId)) return true
                
                if (conn.user.lid) {
                    const botLid = decodeJid(conn.user.lid)
                    const pLid = p.lid ? decodeJid(p.lid) : null
                    if (pLid && areJidsSameUser(pLid, botLid)) return true
                    if (pId.endsWith('@lid') && areJidsSameUser(pId, botLid)) return true
                }
                return false
            })

            isRealAdmin = (userObj?.admin === 'admin' || userObj?.admin === 'superadmin')
            isBotAdmin = (botObj?.admin === 'admin' || botObj?.admin === 'superadmin')
            
            isAdmin = isRealAdmin 

            groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        } else {
            isAdmin = isOwner
            isRealAdmin = false
        }

        m.isAdmin = isAdmin
        m.isBotAdmin = isBotAdmin
        m.isOwner = isOwner
        m.isRealAdmin = isRealAdmin
        m.groupAdmins = groupAdmins

        m.userRole = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'MEMBRO')
        m.botRole = isBotAdmin ? 'ADMIN' : 'MEMBRO'

        if (!global.db.data.users[sender]) {
            global.db.data.users[sender] = { messages: 0, warns: {} }
        }
        global.db.data.users[sender].messages += 1

        if (isGroup) {
            if (!global.db.data.groups[jid]) {
                global.db.data.groups[jid] = { messages: 0, rileva: false, welcome: true, antilink: true }
            }
            global.db.data.groups[jid].messages += 1
        } else if (isChannel) {
            if (!global.db.data.chats[jid]) global.db.data.chats[jid] = { messages: 0, type: 'channel' }
            global.db.data.chats[jid].messages += 1
        } else {
            if (!global.db.data.chats[jid]) global.db.data.chats[jid] = { messages: 0, type: 'private' }
            global.db.data.chats[jid].messages += 1
        }

        if (isGroup && global.db.data.groups[jid]?.antilink) {
            if (await antilink(m, { conn, isAdmin, isBotAdmin, users: global.db.data.users })) return
        }

        await print(m, conn)
        
        if (m.key.fromMe) return

        await antiPrivato.call(conn, m, { isOwner })
        
        if (global.db.data.settings?.[botId]?.ai_rispondi && m.text) {
            try { await rispondiGemini(m, { conn, isOwner }) } catch (e) {}
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
                        participants, groupAdmins, isGroup 
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

export { initDatabase, saveDatabase }