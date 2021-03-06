/**
 * File contains all the `web3` related functions
 * Web3Provider - we use HDWalletProvider
 * Web3 - web3 instance from a chosen Provider (Ropsten for dev mode, Mainnet for production)
 * HDWallet - HD wallet instance 
 */

const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const bip39 = require("bip39");
const { hdkey } = require("ethereumjs-wallet");
const config = require('./config');


/**
 * Get provider instance for a given wallet
 * @param {*} addressIndex 
 * @returns 
 */
const getRopstenProvider = (addressIndex = 0) => {
    // workaround for issue with Ropsten and HDWalletProvider
    // https://github.com/trufflesuite/truffle/issues/2567#issuecomment-623530229
    const wsProvider = new Web3.providers.WebsocketProvider(config.ropstenUrl);
    HDWalletProvider.prototype.on = wsProvider.on.bind(wsProvider);

    // Contstruct HD Wallet provider
    const provider = new HDWalletProvider({
        providerOrUrl: wsProvider,
        privateKeys: [config.privateKey],
        mnemonic: config.mnemonic,
        derivationPath: config.derivationPath,
        addressIndex,
    });

    return provider;
}

/**
 * Mainnet Provider
 * @param {*} addressIndex 
 */
const getProvider = (addressIndex = 0) => {
    // TO_DO
}

/**
 * Get HD wallet from mnemonic seed
 * @returns 
 */
const getHdWallet = () => {
    // Convert the mnemonic phrase to seed
    const mnemonicAsSeed = bip39.mnemonicToSeedSync(config.mnemonic);

    // instantiate instance of HD wallet from the mnemonic seed
    const hdWallet = hdkey.fromMasterSeed(mnemonicAsSeed);

    if (!bip39.validateMnemonic(config.mnemonic)) {
        throw new Error("Invalid mnenomic phrase");
    }
    return hdWallet;
}

module.exports = {
    getProvider: getRopstenProvider,
    web3: new Web3(getRopstenProvider()),
    hdWallet: getHdWallet()
};