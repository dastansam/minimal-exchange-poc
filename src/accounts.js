const Web3 = require("web3");
const abi = require('human-standard-token-abi');
const { hdWallet, getProvider } = require("./web3");
const redis = require('./redis');
const config = require("./config");

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
        config.derivationPath + userId
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
const moveToColdWallet = async (userId, txHash) => {
    const wallet = getProvider(userId);
    
    // get wallet instance
    const web3 = new Web3(wallet);

    const txValue = await _getTxValue(txHash);

    if (!txValue) return false;
    console.log('[TRANSFER] value: ', txValue);
    if (txValue.type === "ERC20") {
        return (await _sendERC20Transfer(txValue, wallet, web3));
    }

    // construct transaction payload
    const txPayload = {
        from: wallet.getAddress(),
        to: config.coldWallet,
        value: txValue.value,
    };

    console.log('payload ', txPayload);

    const txReceipt = await web3.eth.sendTransaction(txPayload);

    console.log('receipt', txReceipt);
    return txReceipt;
};

/**
 * In case when user first deposits ERC20 token in the wallet,
 * we need to fill it up with ETH to move it from the 
 * deposit wallet to our cold wallet
 * @param {*} address 
 */
const _fillWalletWithGas = async (address) => {
    // TO_DO: Estimate gas fees before sending eth
    const mainWallet = getProvider();
    const web3 = new Web3(mainWallet);
    const balance = await web3.eth.getBalance(address);

    console.log("[FILL] balance: ", balance);
    
    // hardcoded value of 70000 Gwei = 0.00006
    const amount = 70000000000000;

    console.log("[FILL] gas: ", amount.toString());
    
    console.log("[FILL] address: ", address);
    const txReceipt = await web3.eth.sendTransaction({
        from: mainWallet.getAddress(),
        to: address,
        value: amount
    }); 
    return txReceipt;
}


const _sendERC20Transfer = async (txValue, wallet, web3) => {
    const token = new web3.eth.Contract(abi, txValue.contract);

    const BN = web3.utils.BN;
    
    console.log("[ERC20]: ", wallet.getAddress());

    const sender = ""+wallet.getAddress().toString();
    // await _fillWalletWithGas(wallet.getAddress());
    // const balanceOf = await token.methods.balanceOf(sender).call({
    //     gas: 75000, gasPrice: 1500000008
    // });

    // console.log('[ERC20] bal: ', balanceOf);
    const receipt = await token.methods.transfer(
        ""+config.coldWallet.toString(),
        new BN(txValue.value)
    ).send({ from: sender, gasPrice: 2000000008, gas: 78534});

    console.log("[ERC20]: ", receipt);
    return true;
}

/**
 * Get stored tx value from hash
 * @param {*} txHash 
 * @returns 
 */
const _getTxValue = async (txHash) => {
    const exists = await redis.existsAsync(`eth:tx:${txHash}`);

    if (exists !== 1) return null;

    const txData = await redis.getAsync(`eth:tx:${txHash}`);
    return JSON.parse(txData);
}

module.exports = {derive, moveToColdWallet};
