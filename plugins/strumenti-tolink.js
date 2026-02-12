import axios from 'axios'
import FormData from 'form-data'

const handler = async (m, { conn, usedPrefix, command }) => {
    const { downloadContentFromMessage } = await import('@realvare/based')
    
    // Verifica se c'è un messaggio quotato o se il messaggio corrente è un'immagine
    const isQuoted = m.quoted && m.quoted.message
    const currentMsg = m.message
    
    let mediaMsg
    let msgType
    
    if (isQuoted) {
        mediaMsg = m.quoted.message
        msgType = Object.keys(mediaMsg).find(k => /image|webp|sticker/i.test(k))
    } else {
        mediaMsg = currentMsg
        msgType = Object.keys(mediaMsg).find(k => /image|webp|sticker/i.test(k))
    }
    
    if (!msgType || !mediaMsg[msgType]) {
        return await conn.sendMessage(m.chat, { 
            text: `❌ Rispondi a un'immagine contenente un QR code con *${usedPrefix + command}*`
        }, { quoted: m })
    }
    
    const mime = mediaMsg[msgType].mimetype || ''
    
    if (!/image|webp/i.test(mime) && !/image|webp/i.test(msgType)) {
        return await conn.sendMessage(m.chat, { 
            text: `❌ Questo non è un'immagine valida.` 
        }, { quoted: m })
    }
    
    await conn.sendMessage(m.chat, { 
        text: '🔍 Scansione QR code in corso...' 
    }, { quoted: m })
    
    try {
        const media = mediaMsg[msgType]
        
        // Download diretto
        const stream = await downloadContentFromMessage(media, msgType.replace('Message', ''))
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        
        if (!buffer || buffer.length === 0) {
            throw 'Impossibile scaricare l\'immagine'
        }
        
        console.log('[QR Debug] Image downloaded, size:', buffer.length)
        
        // Usa l'API goqr.me per leggere QR code
        const form = new FormData()
        form.append('file', buffer, {
            filename: 'qr.jpg',
            contentType: mime || 'image/jpeg'
        })
        
        // Prova prima con API goqr.me
        let qrData = null
        
        try {
            const uploadResponse = await axios.post('https://api.qrserver.com/v1/read-qr-code/', form, {
                headers: {
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 30000
            })
            
            console.log('[QR Debug] QR API Response:', JSON.stringify(uploadResponse.data, null, 2))
            
            if (uploadResponse.data && uploadResponse.data[0] && uploadResponse.data[0].symbol && uploadResponse.data[0].symbol[0]) {
                qrData = uploadResponse.data[0].symbol[0].data
            }
        } catch (e) {
            console.error('[QR Error] goqr.me failed:', e.message)
        }
        
        // Se goqr.me fallisce, prova con un'altra API
        if (!qrData) {
            try {
                // Converti buffer in base64
                const base64 = buffer.toString('base64')
                
                const response = await axios.post('https://zxing.org/w/decode', 
                    new URLSearchParams({
                        f: 'qr',
                        u: `data:${mime};base64,${base64}`
                    }).toString(),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        timeout: 30000
                    }
                )
                
                // Estrai il risultato dalla risposta HTML
                const match = response.data.match(/<pre>(.*?)<\/pre>/s)
                if (match && match[1]) {
                    qrData = match[1].trim()
                }
            } catch (e) {
                console.error('[QR Error] zxing.org failed:', e.message)
            }
        }

        if (!qrData || qrData === 'null' || qrData.trim() === '') {
            return await conn.sendMessage(m.chat, { 
                text: '❌ Nessun QR code trovato nell\'immagine.\n\n💡 Assicurati che:\n- L\'immagine contenga un QR code ben visibile\n- Il QR code non sia troppo sfocato\n- L\'immagine sia ben illuminata' 
            }, { quoted: m })
        }
        
        // Formatta il risultato
        let finalResult = qrData.trim()
        
        if (finalResult.match(/^(http|https|www)/i)) {
            finalResult = `🔗 *Link QR Code:*\n\n${finalResult}`
        } else if (finalResult.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
            finalResult = `📧 *Email trovata:*\n\n${finalResult}`
        } else if (finalResult.match(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)) {
            finalResult = `📱 *Numero trovato:*\n\n${finalResult}`
        } else if (finalResult.startsWith('BEGIN:VCARD')) {
            finalResult = `👤 *Contatto vCard trovato:*\n\n${finalResult}`
        } else if (finalResult.startsWith('WIFI:')) {
            finalResult = `📶 *WiFi trovato:*\n\n${finalResult}`
        } else {
            finalResult = `📄 *Contenuto QR Code:*\n\n${finalResult}`
        }
        
        await conn.sendMessage(m.chat, { text: finalResult }, { quoted: m })

    } catch (e) {
        console.error('[QR Error]:', e)
        let errorMsg = '❌ Errore durante la scansione del QR code.'
        
        if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
            errorMsg = '❌ Timeout: L\'API sta impiegando troppo tempo. Riprova.'
        } else if (e.message) {
            errorMsg = `❌ Errore: ${e.message}`
        }
        
        await conn.sendMessage(m.chat, { text: errorMsg }, { quoted: m })
    }
}

handler.command = ['tolink', 'readqr', 'qr', 'scanqr']
export default handler 