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

router.post("/:userId/move", (req, res) => {
    console.log('body ', req.body);
    WalletService.moveToColdWallet(
        req.params.userId, 
        req.body.txHash
        ).then((tx_receipt) => {
            res.json(tx_receipt);
        }).catch((e) => {
            console.log(e);
            res.end('error sending');
        })
});

app.use("/wallet", router);
console.log("Started listening on 3000");
app.listen(3000);