import { writeFileSync } from 'fs'

let handler = async (m, { conn, usedPrefix, command, args, isOwner }) => {
    const jid = m.chat
    const botId = conn.decodeJid(conn.user.id)
    
    global.db.data.chats[jid] = global.db.data.chats[jid] || {}
    global.db.data.settings[botId] = global.db.data.settings[botId] || {}
    
    let chat = global.db.data.chats[jid]
    let botSettings = global.db.data.settings[botId]

    const adminFeatures = [
        { key: 'welcome', name: 'welcome' },
        { key: 'goodbye', name: 'goodbye' },
        { key: 'rileva', name: 'rileva' },
        { key: 'antilink', name: 'antilink' }
    ]

    const ownerFeatures = [
        { key: 'antiprivato', name: 'antiprivato' },
        { key: 'anticall', name: 'anticall' },
        { key: 'ai_rispondi', name: 'rispondi' } 
    ]

    if (command === 'funzioni' || !args.length) {
        let groupPp, ownerPp
        try { groupPp = await conn.profilePictureUrl(jid, 'image') } catch { groupPp = 'https://i.ibb.co/3Fh9V6p/avatar-group-default.png' }
        try { ownerPp = await conn.profilePictureUrl(global.owner[0][0] + '@s.whatsapp.net', 'image') } catch { ownerPp = 'https://i.ibb.co/kVdFLyGL/sam.jpg' }

        const cards = []
        let adminBody = adminFeatures.map(f => `${chat[f.key] ? '『 ✅ 』' : '『 ❌ 』'} *${f.name}*`).join('\n')

        cards.push({
            image: { url: groupPp },
            title: `『 🛡️ 』 *\`Impostazioni Admin\`*`,
            body: adminBody,
            buttons: [
                { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '🌐 Dashboard', url: 'https://zexin.vercel.app/' }) }
            ]
        })

        if (isOwner) {
            let ownerBody = ownerFeatures.map(f => `${botSettings[f.key] ? '『 ✅ 』' : '『 ❌ 』'} *${f.name}*`).join('\n')
            cards.push({
                image: { url: ownerPp },
                title: `『 👑 』 *\`Impostazioni Owner\`*`,
                body: ownerBody,
                buttons: [
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '🌐 Supporto', url: 'https://wa.me/212614769337' }) }
                ]
            })
        }

        return await conn.sendMessage(m.chat, {
            text: `⛩️ ╰┈➤ *PANNELLO GESTIONE* `,
            cards: cards,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: { newsletterJid: global.canale.id, newsletterName: global.canale.nome }
            }
        }, { quoted: m })
    }

    let isEnable = !/disattiva|off|0/i.test(command)
    let type = args[0].toLowerCase()

    let adminF = adminFeatures.find(f => f.key.toLowerCase() === type || f.name.toLowerCase() === type)
    let ownerF = ownerFeatures.find(f => f.key.toLowerCase() === type || f.name.toLowerCase() === type)

    if (adminF) {
        chat[adminF.key] = isEnable
    } else if (ownerF) {
        if (!isOwner) return m.reply('🏮 Solo l\'owner può gestire questa funzione.')
        botSettings[ownerF.key] = isEnable
    } else {
        return m.reply(`🏮 ╰┈➤ Modulo \`${type}\` non trovato.`)
    }

    writeFileSync('./database.json', JSON.stringify(global.db.data, null, 2))

    let confText = `🏮 *Funzione:* \`${type}\`\n🧧 *Stato:* ${isEnable ? '🟢 ATTIVATA' : '🔴 DISATTIVATA'}`

    await conn.sendMessage(jid, { 
        text: confText,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: { newsletterJid: global.canale.id, newsletterName: global.canale.nome }
        }
    }, { quoted: m })
}

handler.help = ['funzioni', 'attiva', 'disattiva']
handler.tags = ['admin']
handler.command = ['funzioni', 'attiva', 'disattiva']
handler.group = true

export default handler