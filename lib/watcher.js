import chokidar from 'chokidar';
import path from 'path';
import { pathToFileURL } from 'url';
import chalk from 'chalk';

export function setupWatcher(pluginsFolder) {
    const watcher = chokidar.watch(['plugins/', 'handler.js', 'config.js', 'lib/'], {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,   
        interval: 100,       
        binaryInterval: 300
    });

    watcher.on('change', async (filePath) => {
        const fileName = path.basename(filePath);
        const fileUrl = pathToFileURL(path.resolve(filePath)).href;
        
        console.log(chalk.yellow.bold(`[ EDIT ] `) + chalk.white(`File modificato: ${fileName}`));
        
        try {
            if (filePath.includes('plugins/')) {
                const plugin = await import(`${fileUrl}?update=${Date.now()}`);
                global.plugins[fileName] = plugin.default || plugin;
            } else if (fileName === 'handler.js' || fileName === 'config.js') {
                await import(`${fileUrl}?update=${Date.now()}`);
            }
        } catch (e) {
            console.log(chalk.red.bold(`[ ERROR ] `) + chalk.white(`Errore in ${fileName}: ${e.message}`));
        }
    });

    watcher.on('add', async (filePath) => {
        const fileName = path.basename(filePath);
        console.log(chalk.green.bold(`[ ADD ] `) + chalk.white(`Nuovo file: ${fileName}`));
        
        if (filePath.includes('plugins/')) {
            try {
                const fileUrl = pathToFileURL(path.resolve(filePath)).href;
                const plugin = await import(`${fileUrl}?update=${Date.now()}`);
                global.plugins[fileName] = plugin.default || plugin;
            } catch (e) {
                console.log(chalk.red.bold(`[ ERROR ] `) + chalk.white(`Errore in ${fileName}: ${e.message}`));
            }
        }
    });

    return watcher;
}