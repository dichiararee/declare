
# 🤖 333 bot .✦ ݁˖

⤷ ゛Bot whatsapp basato su [@realvare/based](https://npmjs.com/projects/@realvare/based). Base interamente fatta da zero, rapido e facilmente configurabile! Funziona sia su WhatsApp normale, WhatsApp Business (mod incluse) ⋆˚꩜｡


## 📥 Come installare ⋆˙⟡

⚠️ ⤷ ゛*Questo bot è compatibile con dispositivi Android e macchine come Windows 10+, MacOS e Linux.*

⚠️ ⤷ ゛*Se durante l'avvio il bot si connette con successo ma restituisce errore di Request Time-out ERR: 408, riavviate il bot si connetterà senza problemi.*

## 1️⃣ -  Tutorial Android

⚠️ Requisiti:
- Android 8.1+ (Escluse le versioni Go)
- 4GB di RAM 
- 32GB di Memoria Interna
- [Termux (Terminale)](https://f-droid.org/repo/com.termux_1022.apk)
- Un secondo dispositivo per scannerizzare il qrcode dal Terminale.

```bash  
termux-setup-storage
```

```bash
termux-wake-lock
```
```bash  
pkg upgrade && pkg update -y
```
 ```bash  
pkg install git nodejs ffmpeg imagemagick yarn libcairo pango libjpeg-turbo giflib libpixman pkg-config freetype fontconfig xorgproto build-essential python libvips sqlite clang make chromium -y
pip install setuptools
export GYP_DEFINES="android_ndk_path=''"
```   
```bash  
cd ~
```
```bash  
git clone https://github.com/triplotre/333/
```
```bash  
cd 333
```
```bash  
npm install --global yarn
```
```bash  
yarn install 
```
```bash  
npm start
```
## 2️⃣ -  Tutorial Linux (Ubuntu/Debian tested)

⚠️ *Requisiti:*
- 3GB di RAM
- 32GB di SSD/HHD
```bash  
sudo apt update && apt upgrade -y
```
```bash  
sudo apt install git nodejs ffmpeg imagemagick python pip3
```
```bash  
git clone https://github.com/triplotre/333
```
```bash  
cd 333
```
```bash  
npm i && npm start
```
## ❤️ Crediti

- [@triplotre](https://www.github.com/triplotre) - creatore della base e dei comandi del bot
- [@realvare](https://github.com/realvare) - fork di baileys (based)

## 👥 Contributori

<p align="center">
  <a href="https://github.com/triplotre/333/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=triplotre/333"/>
  </a>
</p>


