const express = require("express");
const app = express();
const WalletService = require("./src/accounts");
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Return wallet for a given userId
 */
router.get('/:userId', (req, res) => {
    WalletService.derive(req.params.userId)
        .then((wallet) => res.json({wallet}))
        .catch((e) => res.json({error: e}));
});

/**
 * Move funds from the deposit wallet to cold wallet
 */
router.post("/:userId/move", (req, res) => {
    console.log('[POST] /:userId/move ', req.body);
    WalletService.moveToColdWallet(
        req.params.userId, 
        req.body.txHash
        ).then((tx_receipt) => {
            res.json(tx_receipt);
        }).catch((e) => {
            console.log(e);
            res.end({error: 'Error moving funds: ' + e});
        });
});

app.use("/wallet", router);

console.log("Started listening on port 3000");

app.listen(3000);
