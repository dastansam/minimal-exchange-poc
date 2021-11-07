require('dotenv').config();

// load configuration environmental variables
module.exports = {
    ropstenUrl: process.env.ROPSTEN_WSS,
    kovanUrl: process.env.KOVAN_URL,
    privateKey: process.env.MAIN_PRIVATE_KEY,
    mnemonic: process.env.MAIN_MNEMONIC,
    derivationPath: process.env.DERIVATION_PATH,
    coldWallet: process.env.MAIN_WALLET,
    redisPort: process.env.REDIS_PORT,
    webhookUrl: process.env.WEBHOOK_URL,
}