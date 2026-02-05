const handler = async (m, { conn, text, participants }) => {
    const users = participants.map(u => u.id)
    
    const content = text ? text : ' '

    await conn.sendMessage(m.chat, { 
        text: content, 
        mentions: users 
    }, { quoted: m })
}

handler.command = ['hidetag', 'tag', 'everyone']
handler.admin = true
handler.group = true

export default handler