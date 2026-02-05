import fs from 'fs'

const handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply('Rispondi a un messaggio per vederne la struttura JSON')

    const raw = m.quoted.message || m.quoted
    const jsonStr = JSON.stringify(raw, null, 2)
    const fileName = `message_${m.quoted.mtype || 'raw'}.json`
    const filePath = `./${fileName}`

    fs.writeFileSync(filePath, jsonStr)

    await conn.sendMessage(m.chat, { 
        document: fs.readFileSync(filePath), 
        fileName: fileName, 
        mimetype: 'application/json',
        caption: `${m.quoted.mtype || 'unknown'}`
    }, { quoted: m })

    fs.unlinkSync(filePath)
}

handler.command = ['getraw', 'json']
handler.owner = true
export default handler