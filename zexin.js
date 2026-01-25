import pkg from "@realvare/based";
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = pkg;
import pino from "pino";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { pathToFileURL } from 'url';
import handler from "./handler.js";
import './config.js';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(`./${global.authFile}`);
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.cyan.bold('\n₊˚⊹♡ ─── ZEXIN BOT STARTING ─── ♡⊹˚\n'));

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Zexin Bot', 'Safari', '3.0']
    });

    global.db = { users: {}, groups: {}, chats: {}, settings: {} };
    if (fs.existsSync('./database.json')) {
        global.db = JSON.parse(fs.readFileSync('./database.json'));
    }

    global.plugins = {};
    const pluginsFolder = path.join(process.cwd(), 'plugins');
    const pluginFiles = fs.readdirSync(pluginsFolder).filter(file => file.endsWith('.js'));
    
    for (let file of pluginFiles) {
        try {
            const pluginPath = pathToFileURL(path.join(pluginsFolder, file)).href;
            const plugin = await import(pluginPath);
            global.plugins[file] = plugin.default || plugin;
            console.log(chalk.green(`[ LOAD ] `) + chalk.white(`Plugin caricato: ${file}`));
        } catch (e) {
            console.error(chalk.red(`[ ERROR ] `) + chalk.white(`Errore caricamento ${file}:`), e);
        }
    }

    conn.ev.on('creds.update', saveCreds);

    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jid.split(':');
            return decode[0] + '@' + decode[1].split('@')[1];
        }
        return jid;
    };

    conn.getName = async (jid) => {
        let id = conn.decodeJid(jid);
        if (id.endsWith('@g.us')) {
            const metadata = await conn.groupMetadata(id).catch(() => ({ subject: id }));
            return metadata.subject || id;
        }
        return global.db.users[id]?.name || id.split('@')[0];
    };

    conn.sendList = async (jid, title, text, footer, image, sections, quoted) => {
        const msg = {
            interactiveMessage: {
                header: { title, hasVideoMessage: false },
                body: { text },
                footer: { text: footer },
                nativeFlowMessage: {
                    buttons: [{
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({ title: "Seleziona", sections })
                    }]
                }
            }
        };
        if (image) {
            const media = await conn.prepareWAMessageMedia({ image: { url: image } }, { upload: conn.waUploadToServer });
            msg.interactiveMessage.header.imageMessage = media.imageMessage;
        }
        return await conn.relayMessage(jid, { viewOnceMessage: { message: msg } }, { quoted });
    };

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        if (!chatUpdate.messages || !chatUpdate.messages[0]) return;
        const m = chatUpdate.messages[0];
        await handler(conn, m);
    });

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log(chalk.green.bold('\n[ SUCCESS ] ') + chalk.white('Bot connesso! 🌸\n'));
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    return conn;
}

startBot();