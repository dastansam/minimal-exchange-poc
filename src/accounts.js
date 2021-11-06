const Web3 = require("web3");
const { hdWallet, getProvider } = require("./web3");
const redis = require('./redis');

/**
 * Derives the wallet for a given user
 * Since we are using HD wallet, there exists an infinite number of 
 * possible `wallets`, and each userId will have its unique wallet
 * @param {*} userId 
 * @returns hex - wallet address
 */
const derive = async (userId) => {
    // derive the wallet from the userId
    const wallet = hdWallet.derivePath(
        process.env.DERIVATION_PATH + userId
    ).getWallet();
    
    // map the derived wallet with user in the storage
    await redis.setAsync(`eth:wallet:${wallet.getAddressString()}`, userId);

    return wallet.getAddressString();
};

/**
 * Move deposited funds to cold wallet
 * @param {*} userId 
 * @param {*} amount 
 * @returns 
 */
const moveToColdWallet = async (userId, amount) => {
    const wallet = getProvider(userId);
    
    // get wallet instance
    const web3 = new Web3(wallet);

    // construct transaction payload
    const txPayload = {
        from: wallet.getAddress(),
        to: process.env.MAIN_WALLET,
        amount
    };
    console.log('payload ', txPayload);

    const txReceipt = await web3.eth.sendTransaction(txPayload);

    console.log('receipt', txReceipt);
    return txReceipt;
};

module.exports = {derive, moveToColdWallet};
