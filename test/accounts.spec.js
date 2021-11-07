const expect = require("chai").expect;
const Web3 = require('web3');
const WalletService = require('../src/accounts');
const { getProvider } = require("../src/web3");
const redis = require('../src/redis');

describe("Wallet service tests",function() {
    this.timeout(100_000);
    // Web3 instance populated with the user wallet
    function getWeb3(userId = 0) {
        const provider = getProvider(userId);
        return new Web3(provider);
    }

    // 200000 Gwei = 0.0002 ETH
    async function depositEther(address, value=200000000000000) {
        const web3 = getWeb3();        
        
        // This assumes that we always have enough Ether in main wallet
        const txReceipt = await web3.eth.sendTransaction({
            from: web3.currentProvider.getAddress(),
            to: address,
            value
        });

        return txReceipt.hash;
    }

    it("should get new wallet for user id", async () => {
        // IDs for test cases are from 1e7 + 1e6 to 1e7
        // this is to not mess up with the redis storage
        // and to be sure that we don't consume unnecessarily
        const randomId = Math.floor(Math.random() * (1e7 + 1e6 - 1e7) + 1e7);
        const newWallet = await WalletService.derive(randomId);
        const web3 = getWeb3(randomId);

        console.log(`Generated new wallet ${newWallet} for user: ${randomId}`);

        expect(web3.utils.isAddress(newWallet)).to.equal(true);

        const addressExists = await redis.existsAsync(`eth:wallet:${newWallet}`);
        expect(addressExists).to.be.equal(1);

        const userId = await redis.getAsync(`eth:wallet:${newWallet}`);
        expect(userId).to.be.equal(randomId.toString());

        // remove wallet from the storage
        await redis.del(`eth:wallet:${newWallet}`);
        // ISSUE: there's a bug with web3 with Ropsten, where it returns
        // blocknumber instead of balance in `getBalance`
        // const balance = await web3.eth.getBalance(""+newWallet.toString(), "latest", (e) => console.log(e));
    
        // expect(balance).to.be.equal("0");
    })
    
    after(() => {
        redis.quit();
    })
})