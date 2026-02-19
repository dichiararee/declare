import { performance } from 'perf_hooks'
import os from 'os'
import { execSync } from 'child_process'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

let npmVersion = 'N/A'
try { npmVersion = execSync('npm -v').toString().trim() } catch {}
const nodeVersion = process.version

const handler = async (m, { conn }) => {
    const start = performance.now()
    
    const uptime = formatUptime(process.uptime())
    const totalMem = (os.totalmem() / 1073741824).toFixed(2)
    const freeMem = (os.freemem() / 1073741824).toFixed(2)
    const usedMem = (totalMem - freeMem).toFixed(2)
    const versione = packageJson.version || '1.0.0'
    const foto = global.immagini[Math.floor(Math.random() * global.immagini.length)]

    let ssdInfo = 'N/A'
    try {
        ssdInfo = execSync("df -h / | tail -1 | awk '{print $3 \" / \" $2}'").toString().trim()
    } catch {}

    const lattenza = (performance.now() - start).toFixed(3)

    const response = `
  ╭┈  『 🚀 』 ` + "`latenza` ─ " + ` *_${lattenza}ms_*
  ┆  『 🕒 』 ` + "`uptime` ─ " + ` *_${uptime}_*
  ┆  『 📊 』 ` + "`ram` ─ " + ` *_${usedMem} / ${totalMem} GB_*
  ┆  『 📂 』 ` + "`ssd` ─ " + ` *_${ssdInfo}_*
  ┆  『 ⚙️ 』 ` + "`node` ─ " + ` *_${nodeVersion}_*
  ╰┈➤ 『 📦 』 ` + "`versione` ─ " + ` *_${versione}_*
  `.trim()

    await conn.sendMessage(m.chat, { 
        text: response,
        contextInfo: {
            ...global.newsletter().contextInfo,
            externalAdReply: {
                title: `333 server info`,
                body: `v${versione} • ${lattenza}ms`,
                renderLargerThumbnail: false,
                thumbnailUrl: foto,
                mediaType: 1
            }
        }
    }, { quoted: m })
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${d}g ${h}h ${m}m ${s}s`
}

handler.command = ['speed', 'server']
export default handler