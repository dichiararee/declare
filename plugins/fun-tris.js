import axios from 'axios'

let tris = {}

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const id = m.chat
    const lobbyName = args[0]?.toLowerCase()

    if (!lobbyName) {
        return conn.sendMessage(m.chat, { text: `⚠️ Specifica il nome della lobby!\nEs: *${usedPrefix}${command} sfida*` }, { quoted: m })
    }

    if (!tris[id]) tris[id] = {}

    const gameId = Object.keys(tris[id]).find(name => tris[id][name].p1 === m.sender || tris[id][name].p2 === m.sender)
    const isMove = /^[1-9]$/.test(args[0])

    if (isMove && gameId) {
        const game = tris[id][gameId]
        if (game.status !== 'PLAYING') return
        if (m.sender !== game.turn) return conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

        const index = parseInt(args[0]) - 1
        if (game.board[index] !== null) return conn.sendMessage(m.chat, { react: { text: '🚫', key: m.key } })

        await conn.sendPresenceUpdate('composing', m.chat)
        game.board[index] = m.sender === game.p1 ? 'X' : 'O'
        
        const winConditions = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
        let winner = winConditions.find(c => game.board[c[0]] && game.board[c[0]] === game.board[c[1]] && game.board[c[0]] === game.board[c[2]])

        if (winner) {
            await conn.sendMessage(m.chat, { react: { text: '🏆', key: m.key } })
            const img = await renderTris(conn, m, game)
            await conn.sendMessage(m.chat, { image: img, caption: `🎉 *${m.pushName}* ha vinto la partita!`, mentions: [m.sender], ...global.newsletter() }, { quoted: m })
            delete tris[id][gameId]
            return
        }

        if (!game.board.includes(null)) {
            await conn.sendMessage(m.chat, { react: { text: '🤝', key: m.key } })
            const img = await renderTris(conn, m, game)
            await conn.sendMessage(m.chat, { image: img, caption: `🤝 Pareggio! Ottima partita.`, ...global.newsletter() }, { quoted: m })
            delete tris[id][gameId]
            return
        }

        game.turn = game.turn === game.p1 ? game.p2 : game.p1
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return renderAndSend(conn, m, id, gameId, usedPrefix, command)
    }

    if (!tris[id][lobbyName]) {
        await conn.sendMessage(m.chat, { react: { text: '📌', key: m.key } })
        tris[id][lobbyName] = {
            board: Array(9).fill(null),
            p1: m.sender,
            p1Name: m.pushName || 'Player 1',
            p2: null,
            p2Name: null,
            turn: m.sender,
            status: 'WAITING'
        }
        return conn.sendMessage(m.chat, { text: `🎮 Lobby *${lobbyName}* creata da *${m.pushName}*.\nScrivi *${usedPrefix}${command} ${lobbyName}* per sfidarlo!`, ...global.newsletter() }, { quoted: m })
    } else {
        const game = tris[id][lobbyName]
        if (game.status === 'WAITING' && m.sender !== game.p1) {
            await conn.sendMessage(m.chat, { react: { text: '⚔️', key: m.key } })
            game.p2 = m.sender
            game.p2Name = m.pushName || 'Player 2'
            game.status = 'PLAYING'
            await conn.sendPresenceUpdate('composing', m.chat)
            return renderAndSend(conn, m, id, lobbyName, usedPrefix, command)
        } else if (game.status === 'PLAYING') {
            return conn.sendMessage(m.chat, { react: { text: '🚫', key: m.key } })
        }
    }
}

async function renderAndSend(conn, m, chat, lobbyName, usedPrefix, command) {
    const game = tris[chat][lobbyName]
    const img = await renderTris(conn, m, game)
    const turnName = game.turn === game.p1 ? game.p1Name : game.p2Name
    const caption = `🕹️ Lobby: *${lobbyName}*\n👤 È il turno di: *${turnName}*\n\n> Per scegliere la casella scrivi *${usedPrefix}${command} numero*`

    await conn.sendMessage(m.chat, {
        image: img,
        caption: caption,
        mentions: [game.turn],
        ...global.newsletter()
    }, { quoted: m })
}

async function renderTris(conn, m, game) {
    try {
        let groupPfp = 'https://i.ibb.co/Gwbg90w/idk17.jpg'
        try { groupPfp = await conn.profilePictureUrl(m.chat, 'image') } catch {}

        const getPP = async (user) => {
            try { return await conn.profilePictureUrl(user, 'image') } 
            catch { return null }
        }
        const pp1 = await getPP(game.p1)
        const pp2 = game.p2 ? await getPP(game.p2) : null
        
        const colors = ['#405DE6', '#5B51D8', '#833AB4', '#C13584', '#E1306C', '#FD1D1D', '#F56040', '#F77737', '#FCAF45', '#FFDC80']

        const html = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;700;900&display=swap');
            body { margin:0; padding:0; width:800px; height:1000px; display:flex; align-items:center; justify-content:center; font-family:'Figtree', sans-serif; background:#000; overflow:hidden; }
            .bg { position:absolute; width:100%; height:100%; background:url('${groupPfp}') center/cover; filter:blur(60px) brightness(0.3); transform:scale(1.1); }
            .container { position:relative; width:700px; height:900px; background:rgba(255, 255, 255, 0.05); backdrop-filter:blur(40px); border:1px solid rgba(255, 255, 255, 0.1); border-radius:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; box-sizing:border-box; }
            .players { display:flex; justify-content:space-around; width:100%; margin-bottom:60px; }
            .player { display:flex; flex-direction:column; align-items:center; width:220px; }
            .avatar { width:130px; height:130px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:50px; color:white; font-weight:900; border:4px solid rgba(255,255,255,0.1); overflow:hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
            .active { border-color:#2b95ff; box-shadow:0 0 30px rgba(43,149,255,0.5); transform:scale(1.05); transition:all 0.3s; }
            .img-av { width:100%; height:100%; object-fit:cover; }
            .name { color:white; margin-top:15px; font-size:24px; font-weight:800; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
            .grid { display:grid; grid-template-columns:repeat(3, 160px); grid-gap:20px; background:rgba(255,255,255,0.03); padding:25px; border-radius:40px; border:1px solid rgba(255,255,255,0.05); }
            .cell { width:160px; height:160px; background:rgba(255,255,255,0.06); border-radius:25px; display:flex; justify-content:center; align-items:center; font-size:80px; font-weight:900; border:1px solid rgba(255,255,255,0.05); transition: 0.2s; }
            .X { color:#ff4b2b; text-shadow: 0 0 15px rgba(255,75,43,0.4); } 
            .O { color:#2b95ff; text-shadow: 0 0 15px rgba(43,149,255,0.4); } 
            .num { color:rgba(255,255,255,0.1); font-size:35px; }
        </style></head><body>
            <div class="bg"></div>
            <div class="container">
                <div class="players">
                    <div class="player">
                        <div class="avatar ${game.turn === game.p1 ? 'active' : ''}" style="background:${colors[1]}">${pp1 ? `<img src="${pp1}" class="img-av">` : game.p1Name[0].toUpperCase()}</div>
                        <div class="name">${game.p1Name} (X)</div>
                    </div>
                    <div class="player">
                        <div class="avatar ${game.turn === game.p2 ? 'active' : ''}" style="background:${colors[5]}">${pp2 ? `<img src="${pp2}" class="img-av">` : (game.p2Name ? game.p2Name[0].toUpperCase() : '?')}</div>
                        <div class="name">${game.p2Name || '???'} (O)</div>
                    </div>
                </div>
                <div class="grid">
                    ${game.board.map((v, i) => `<div class="cell ${v || 'num'}">${v || (i + 1)}</div>`).join('')}
                </div>
            </div>
        </body></html>`

        const response = await axios({
            method: 'post',
            url: `https://chrome.browserless.io/screenshot?token=${global.APIKeys.browserless}`,
            headers: { 'Content-Type': 'application/json' },
            data: {
                html: html,
                viewport: { width: 800, height: 1000 },
                options: { type: 'png' }
            },
            responseType: 'arraybuffer'
        })
        return response.data
    } catch (e) {
        console.error('[TRIS ERROR]', e.message)
        return null
    }
}

handler.command = ['tris']
export default handler