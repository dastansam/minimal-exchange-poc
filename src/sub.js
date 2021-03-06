/**
 * File contains event subscription related functions
 */
const { web3 } = require('./web3');

/**
 * Sync to the latest block on chain
 * Subscribes to "newBlockHeaders" events on chain
 * @param {*} curBlock 
 * @param {*} actions 
 */
const syncBlocks = async (curBlock, actions) => {
    // let latestBlock = await web3.eth.getBlockNumber();
    console.log('[SYNC] Latest block: ', curBlock);
    
    // TO_DO: Enable syncing all the blocks
    // let syncedBlock = await _syncBlocksTo(curBlock, latestBlock, actions);
    // console.log('[SYNC] Latest synced block: ', syncedBlock);

    console.log('[SYNC] Subscribing to new block headers...');

    web3.eth.subscribe("newBlockHeaders", (error, result) => {
        if (error) console.error("[SYNC] Web3: Sync error ", error);
    }).on("data", async (header) => {
        return (await _processBlock(header.number, actions));
    });

    return curBlock;
};

/**
 * Do some operations on the block
 * f.e filter transactions to detect deposits
 * @param {*} curBlock 
 * @param {*} actions 
 * @returns processed block
 */
const _processBlock = async (block, actions) => {
    const processingBlock = await web3.eth.getBlock(block, true);

    if (actions.onTransactions) actions.onTransactions(processingBlock.transactions);
    if (actions.onBlock) actions.onBlock(block);
    if (actions.onERC20Transfers) {
        // Get EVM Transfer Event logs for the given block
        const logs = await web3.eth.getPastLogs({
            fromBlock: block,
            toBlock: block,
            // hashed value of Transfer event in ERC20 contract
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
        });
        actions.onERC20Transfers(logs);
    }
    return processingBlock;
};

/**
 * Recursive function to synchronize block up to the latest
 * @param {*} curBlock 
 * @param {*} destBlock 
 * @param {*} actions - actionst to perform on new block
 * @returns 
 */
const _syncBlocksTo = async (curBlock, destBlock, actions) => {
    if (curBlock >= destBlock) {
        return curBlock;
    }
    console.log('[SYNC] CURRENT BLOCK: ', curBlock);
    console.log('[SYNC] DESTINATION BLOCK: ', destBlock);

    await _processBlock(curBlock + 1, actions);

    return _syncBlocksTo(curBlock + 1, destBlock, actions);
};

module.exports = {syncBlocks};
