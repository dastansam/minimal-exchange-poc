const Web3 = require('web3');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const redis = require("./redis");
const Chain = require("./eth");
const { web3 } = require('./web3');
const config = require('./config');

/**
 * Starts the process of monitoring transactions
 */
const launch = async () => {
    let lastSyncedBlock = await redis.getAsync("last-synced-block");
    let latestBlock = await web3.eth.getBlockNumber();
    // TO-DO: replace places: latest should be last
    lastSyncedBlock = latestBlock || lastSyncedBlock;

    console.log('[BLOCK SYNC] last synced block: ', lastSyncedBlock);

    // Launch syncing block process
    Chain.syncBlocks(lastSyncedBlock, {
        onBlock: _updateBlockHeader,
        onTransactions: async (txs) => {
            for (let i in txs) {
                await _processTx(txs[i]);
            }
        },
        onERC20Transfers: async (logs) => {
            console.log(
                `[RECEIVING LOGS]getting logs: `,
                logs
            );
            for (let i in logs) {
                await _processTx(
                    _formatERC20Transfer(logs[i],), 
                    true
                );
            }
        }
    });
};

/**
 * Removes zeros from hex
 * @param {} data 
 * @returns 
 */
const _formatAddress = (data) => {
    let bytes = Web3.utils.hexToBytes(data);
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[0] === 0) bytes.splice(0, 1);
    }
    return Web3.utils.bytesToHex(bytes);
};

/**
 * Formats Transfer Event log to a more familiar transaction object
 * @param {*} txData 
 * @returns 
 */
const _formatERC20Transfer = (txData) => {
    console.log('[FORMAT] log: ', txData);
    const from = _formatAddress(txData.topics[1]);
    const to = _formatAddress(txData.topics[2]);
    const contract = txData.address;
    const value = Web3.utils.hexToNumberString(txData.data);
    const hash = txData.transactionHash;
    return {
        from, to, contract, value, hash,
        blockNumber: txData.blockNumber,
        type: "ERC20"
    };
};

/**
 * Updated the last synced block
 * @param {*} header 
 * @returns 
 */
const _updateBlockHeader = async (header) => {
    console.log('getting new block', header);
    return await redis.setAsync("last-synced-block", header);
};

/**
 * Processes fetched transaction
 * Checks whether the to address is recorded in the db
 * and if tx has been processed before
 * After validation, sends webhook and updates the db
 * @param {*} tx 
 * @returns boolean - if valid tx - true, false - otherwise
 */
const _processTx = async (tx, erc20=false) => {
    // for erc20 Transfer event log, second indice of topics is the `dest` wallet
    const walletAddress = `${tx.to}`.toLowerCase();

    console.log('[PROCESS TX] to: ', walletAddress);
    // check if the derived address is our deposit address
    const watchedAddress = await redis.existsAsync(`eth:wallet:${walletAddress}`);
    console.log(`[PROCESS TX] is derived `, watchedAddress);
    if (watchedAddress !== 1) {
        return false;
    }
    
    // Get user id mapped to the wallet
    const userId = await redis.getAsync(`eth:wallet:${walletAddress}`);

    // check if we processed this tx before
    const txExists = await redis.existsAsync(`eth:tx:${tx.hash}`);

    if (txExists === 1) {
        return false;
    }
    console.log('[PROCESS TX] ', tx);

    // check if tx log exists for the deposit address
    const logExists = await redis.existsAsync(`eth:wallet:txs:${walletAddress}`);

    // if logs don't exist we populate new instance of logs
    let txData = {
        [tx.hash]: tx
    };

    if (logExists === 1) {
        // update the list of transactions for wallet
        const storedTxData = await redis.getAsync(`eth:wallet:txs:${walletAddress}`);
        
        let parsedTxData = JSON.parse(storedTxData);
        txData = Object.assign(txData, parsedTxData);
    }
    
    console.log('[PROCESS TX] resultTxData: ', txData);

    await redis.setAsync(`eth:wallet:txs:${walletAddress}`, JSON.stringify(txData));
    // store the hash of the processed tx
    await redis.setAsync(`eth:tx:${tx.hash}`, JSON.stringify(tx));
    
    // TO_DO: for erc20, get token decimals and compute amount of tokens
    // const amountInToken = tx.value / 1**(token.decimals);
    const amountInEther = Web3.utils.fromWei(tx.value);

    const webhookPayload = {
        tx_hash: tx.hash,
        amount: erc20 ? tx.value: amountInEther,
        type: erc20 ? "ERC20" : "Ether",
        token_address: tx?.contract || "",
        block_number: tx.blockNumber,
        user_id: userId,
    };
    
    // Submit the webhook
    fetch(`${config.webhookUrl}/deposits`, {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: { "Content-Type": 'application/json'}
    }).then(res => res.json())
    .then(result => console.log('[WEBHOOK] Submitted webhook: ', result))
    .catch((e) => console.log("[WEBHOOK] Err: ", e));

    return true;
};

module.exports = { launch };