import axios from 'axios'
import fs from 'fs'
import { join } from 'path'
import '../config.js'

const BROWSERLESS_KEY = global.APIKeys?.browserless

const handler = async (m, { conn, usedPrefix }) => {
    await conn.sendPresenceUpdate('recording', m.chat)

    const repoPath = 'devz3xin/zexin-bot'
    const userPath = 'devz3xin'
    const repoUrl = `https://github.com/${repoPath}`
    const packageUrl = `${repoUrl}/releases/latest`
    const channelUrl = global.canale.link
    const githubAvatar = `https://github.com/${userPath}.png`
    
    let stars = '0', forks = '0'
    try {
        const repoData = await axios.get(`https://api.github.com/repos/${repoPath}`)
        stars = repoData.data.stargazers_count || '0'
        forks = repoData.data.forks_count || '0'
    } catch (e) {
        stars = '--'; forks = '--'
    }

    const html = `
    <html>
    <head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { 
            background-color: #0d1117; color: #c9d1d9; 
            font-family: 'Inter', sans-serif;
            width: 800px; height: 800px; display: flex; align-items: center; justify-content: center;
            margin: 0; padding: 0; overflow: hidden;
            background-image: radial-gradient(circle at 50% 50%, #161b22 0%, #0d1117 100%);
        }
        .glass-card {
            width: 600px; height: 600px;
            background: rgba(22, 27, 34, 0.75);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 40px; gap: 30px;
            box-shadow: 0 30px 60px rgba(0,0,0,0.7);
            box-sizing: border-box;
            text-align: center;
        }
        .avatar-container { width: 220px; height: 220px; flex-shrink: 0; }
        .github-img {
            width: 100%; height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #30363d;
            box-shadow: 0 0 30px rgba(88, 166, 255, 0.2);
        }
        .content { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; justify-content: center; }
        .repo-name { font-size: 28px; font-weight: 700; color: #58a6ff; letter-spacing: -1px; }
        .badge { 
            font-size: 12px; font-weight: 600; padding: 3px 10px; 
            background: rgba(45, 51, 59, 0.6); border: 1px solid #30363d;
            border-radius: 20px; color: #8b949e;
        }
        .description { font-size: 17px; line-height: 1.6; color: #8b949e; margin-bottom: 35px; max-width: 90%; }
        .footer { display: flex; gap: 30px; font-size: 15px; color: #c9d1d9; font-weight: 600; }
        .stat-item { display: flex; align-items: center; gap: 8px; }
        .lang-dot { width: 12px; height: 12px; background-color: #f1e05a; border-radius: 50%; }
    </style>
    </head>
    <body>
        <div class="glass-card">
            <div class="avatar-container">
                <img src="${githubAvatar}" class="github-img">
            </div>
            <div class="content">
                <div class="header">
                    <span class="repo-name">${repoPath}</span>
                    <span class="badge">public</span>
                </div>
                <div class="description">Modern WhatsApp Bot system. Optimized with high-performance plugins and a modular glassmorphism interface.</div>
                <div class="footer">
                    <div class="stat-item"><span class="lang-dot"></span> JavaScript</div>
                    <div class="stat-item">⭐ ${stars}</div>
                    <div class="stat-item">🍴 ${forks}</div>
                </div>
            </div>
        </div>
    </body>
    </html>`

    try {
        const response = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, {
            html, options: { type: 'jpeg', quality: 95 }, viewport: { width: 800, height: 800 }
        }, { responseType: 'arraybuffer' })

        const tmpFile = join(process.cwd(), `tmp_script_${Date.now()}.jpg`)
        fs.writeFileSync(tmpFile, Buffer.from(response.data))

        const ownerNum = global.owner[0][0]
        const mainText = `『 🚀 』 *BOT SCRIPT*\n\n👤 *Owner:* @${ownerNum}\n⭐ *Stars:* ${stars}\n🍴 *Forks:* ${forks}`

        await conn.sendMessage(m.chat, {
            text: mainText,
            cards: [
                {
                    image: { url: tmpFile },
                    body: `  `,
                    buttons: [
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({ display_text: '🌐 Repository', url: repoUrl })
                        },
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({ display_text: '📦 Package', url: packageUrl })
                        },
                        {
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({ display_text: '📢 Canale', url: channelUrl })
                        }
                    ]
                }
            ],
            mentions: [ownerNum + '@s.whatsapp.net']
        }, { quoted: m })

        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch (e) {
        return m.reply('『 ❌ 』 Errore nel rendering 4:4.')
    }
}

handler.command = ['script']
export default handler