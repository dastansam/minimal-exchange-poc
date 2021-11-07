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

    const txValue = await _getTxValue(userId, txHash);

    if (!txValue) return false;
    
    console.log('[TRANSFER] value: ', txValue);
    if (txValue.type === "ERC20") {
        return (await _sendERC20Transfer(txValue, wallet));
    }

    const web3 = new Web3(wallet);
    
    const BN = web3.utils.BN;

    const receipt = await web3.eth.getTransactionReceipt(txValue.hash);

    // check if Tx is pending or non-existent or it reverted
    if (!receipt || !receipt.status) return false;

    // make sure the recipient of tx is the current wallet
    if (receipt.to.toLowerCase() !== wallet.getAddress().toLowerCase()) return false;

    const gasPrice = await web3.eth.getGasPrice();

    const gasFees = new BN(21000).mul(new BN(gasPrice));

    const value = new BN(txValue.value).sub(gasFees);

    // construct transaction payload
    const txPayload = {
        from: wallet.getAddress(),
        to: config.coldWallet,
        gas: 21000,
        gasPrice: new BN(gasPrice),
        value
    };

    const txReceipt = await web3.eth.sendTransaction(txPayload);

    return txReceipt;
};

/**
 * In case user deposits ERC20 token in the wallet,
 * deposit address usually doesn't have ether to pay for gas fees
 * This sends the necessary amount of gas to move tokens to cold wallet
 * @param {*} address 
 */
const _fillWalletWithGas = async (address) => {
    const mainWallet = getProvider();
    const web3 = new Web3(mainWallet);

    const BN = web3.utils.BN;

    const balance = await web3.eth.getBalance(address);

    console.log("[GAS STATION] Filling with gas: ", balance);
    
    // hardcoded average gas fee of 70000 Gwei = 0.00007 ETH
    // TO_DO: Estimate gas fee before sending eth
    const estimatedGas = new BN("70000000000000");

    // send ether only if current balance exceeds estimatedgas
    if (new BN(balance).gte(estimatedGas)) return false;
    
    // This assumes that we always have enough Ether in main wallet
    await web3.eth.sendTransaction({
        from: mainWallet.getAddress(),
        to: address,
        value: estimatedGas
    });

    return true;
}

/**
 * Send ERC20 token
 * @param {*} txValue 
 * @param {*} wallet 
 * @returns tx receipt
 */
const _sendERC20Transfer = async (txValue, wallet) => {
    const web3 = new Web3(wallet);
    // instantiate token contract
    const token = new web3.eth.Contract(abi, txValue.contract);

    const BN = web3.utils.BN;
    
    console.log("[ERC20] Moving tokens from: ", wallet.getAddress());

    const sender = ""+wallet.getAddress().toString();

    // Add Ether to wallet for gas fees
    await _fillWalletWithGas(wallet.getAddress());

    const receipt = await token.methods.transfer(
        ""+config.coldWallet.toString(),
        new BN(txValue.value)
    ).send({
        from: sender
    });

    return receipt;
}

/**
 * Get stored tx value from hash
 * @param {*} userId
 * @param {*} txHash 
 * @returns `TxMetadata` if everything is ok, `null` - otherwise
 */
const _getTxValue = async (userId, txHash) => {
    const wallet = await derive(userId);

    const txExists = await redis.existsAsync(`eth:wallet:txs:${wallet}`);
    
    if (txExists !== 1) return null;

    // check if the `txHash` belongs to the given user id
    const txListRaw = await redis.getAsync(`eth:wallet:txs:${wallet}`);

    if (!txListRaw) return null;

    // TxList is a mapping between: txHash => txMetadata
    const txList = JSON.parse(txListRaw);
    if (txHash in txList) return txList[txHash];

    return null;
}

module.exports = {derive, moveToColdWallet};
