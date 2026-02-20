import axios from 'axios'
import fs from 'fs'
import { join } from 'path'

const LASTFM_API_KEY = global.APIKeys?.lastfm
const BROWSERLESS_KEY = global.APIKeys?.browserless
const def = 'https://i.ibb.co/6fs5B1V/triplo3.jpg'
const tmpDir = './media/tmp/cur'
const songsDbPath = './media/canzoni.json'
const lastfmDbPath = './media/lastfm.json'

const formatTime = (ms) => {
    if (!ms) return '0:00'
    const mins = Math.floor(ms / 60000), secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

async function apiCall(method, params) {
    try {
        const query = new URLSearchParams({ method, api_key: LASTFM_API_KEY, format: 'json', ...params })
        const res = await axios.get(`https://ws.audioscrobbler.com/2.0/?${query}`, { timeout: 5000 })
        return res.data
    } catch (e) { return {} }
}

async function fetchCover(lastFmImages, query) {
    let cover = lastFmImages?.find(i => i.size === 'extralarge')?.['#text']
    if (cover && cover.trim() !== '' && !cover.includes('2a96cbd8b46e442fc41c2b86b821562f')) return cover
    try {
        const { data } = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&media=music&country=IT`)
        if (data.results?.[0]?.artworkUrl100) return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb')
    } catch (e) {}
    return def
}

const handler = async (m, { conn, usedPrefix }) => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    
    if (!fs.existsSync('./media')) fs.mkdirSync('./media')

    if (!fs.existsSync(songsDbPath)) fs.writeFileSync(songsDbPath, JSON.stringify({}, null, 2))
    if (!fs.existsSync(lastfmDbPath)) fs.writeFileSync(lastfmDbPath, JSON.stringify({}, null, 2))
    
    const db = JSON.parse(fs.readFileSync(lastfmDbPath, 'utf-8'))
    let targetUser = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : m.sender)
    const user = db[targetUser]
    
    if (!user) return conn.sendMessage(m.chat, { text: `『 ⚠️ 』 Utente non registrato su LastFM.` }, { quoted: m })

    try {
        await conn.sendPresenceUpdate('recording', m.chat)
        const res = await apiCall('user.getrecenttracks', { user, limit: 1 })
        const track = res.recenttracks?.track?.[0]
        
        if (!track) return conn.sendMessage(m.chat, { text: '『 ❌ 』 Nessun brano trovato.' }, { quoted: m })

        const trackInfo = await apiCall('track.getInfo', { 
            artist: track.artist['#text'], 
            track: track.name, 
            user: user 
        })
        
        const duration = parseInt(trackInfo?.track?.duration) || 0
        const cover = await fetchCover(track.image, `${track.artist['#text']} ${track.name}`)
        const isNowPlaying = track['@attr']?.nowplaying === 'true'

        let songsDb = JSON.parse(fs.readFileSync(songsDbPath, 'utf-8'))
        songsDb[track.name.toLowerCase()] = {
            title: track.name,
            artist: track.artist['#text'],
            image: cover,
            duration: duration,
            timestamp: Date.now()
        }
        fs.writeFileSync(songsDbPath, JSON.stringify(songsDb, null, 2))

        const progress = isNowPlaying ? 0.7 : 1
        const currentTime = formatTime(duration * progress)
        const totalTime = formatTime(duration)

        const html = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800&display=swap');
            body { margin: 0; padding: 0; width: 800px; height: 800px; display: flex; align-items: center; justify-content: center; font-family: 'Figtree', sans-serif; background: #000; overflow: hidden; }
            .background { position: absolute; width: 100%; height: 100%; background: url('${cover}') center/cover; filter: blur(60px) brightness(0.3); }
            .glass-card { position: relative; width: 680px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(30px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; padding: 50px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
            .album-art { width: 350px; height: 350px; border-radius: 30px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); object-fit: cover; margin-bottom: 40px; }
            .info-container { width: 100%; text-align: left; padding: 0 20px; }
            .status { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: ${isNowPlaying ? '#1DB954' : '#b3b3b3'}; margin-bottom: 12px; }
            .track-name { font-size: 42px; font-weight: 800; color: white; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .artist-name { font-size: 24px; color: rgba(255,255,255,0.6); font-weight: 600; margin-top: 5px; }
            .timeline-area { width: 100%; margin-top: 40px; }
            .bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; }
            .bar-fill { width: ${progress * 100}%; height: 100%; background: #1DB954; border-radius: 3px; position: relative; }
            .bar-fill::after { content: ''; position: absolute; right: -6px; top: -4px; width: 14px; height: 14px; background: white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
            .time-labels { display: flex; justify-content: space-between; margin-top: 12px; color: #b3b3b3; font-size: 16px; font-weight: 600; }
        </style></head><body>
            <div class="background"></div>
            <div class="glass-card">
                <img src="${cover}" class="album-art" />
                <div class="info-container">
                    <div class="status">${isNowPlaying ? 'Now Playing' : 'Last Played'}</div>
                    <h1 class="track-name">${track.name}</h1>
                    <div class="artist-name">${track.artist['#text']}</div>
                    <div class="timeline-area">
                        <div class="bar-bg"><div class="bar-fill"></div></div>
                        <div class="time-labels">
                            <span>${isNowPlaying ? currentTime : '0:00'}</span>
                            <span>${duration > 0 ? totalTime : '--:--'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </body></html>`

        const screenshot = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, { 
            html, 
            options: { type: 'jpeg', quality: 90 }, 
            viewport: { width: 800, height: 800 } 
        }, { responseType: 'arraybuffer' })
        
        const fileName = join(tmpDir, `cur_${Date.now()}.jpg`)
        fs.writeFileSync(fileName, Buffer.from(screenshot.data))

        const buttons = [
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "📥 Scarica Audio",
                    id: `${usedPrefix}play ${track.name} ${track.artist['#text']}`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🎧 Salva Brano",
                    id: `${usedPrefix}salva ${track.name} | ${track.artist['#text']}`
                })
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "📂 Playlist",
                    id: `${usedPrefix}playlist`
                })
            }
        ]

        await conn.sendMessage(m.chat, {
            text: `『 🎵 』 \`${track.name} - ${track.artist['#text']}\``,
            cards: [{
                image: { url: fileName },
                buttons: buttons
            }],
            mentions: [targetUser]
        }, { quoted: m })

        setTimeout(() => { if (fs.existsSync(fileName)) fs.unlinkSync(fileName) }, 15000)

    } catch (e) { 
        console.error(e)
        return conn.sendMessage(m.chat, { text: '『 ❌ 』 Errore nel caricamento dei dati.' }, { quoted: m })
    }
}

handler.command = ['cur', 'nowplaying']
export default handler