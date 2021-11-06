const express = require("express");
const app = express();
const WalletService = require("./src/accounts");
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

router.get('/:user', (req, res) => {
    WalletService.derive(req.params.user)
        .then((wallet) => res.send(wallet))
        .catch((e) => res.send(`error getting wallet ${e}`));
});

router.post("/:user/move", (req, res) => {
    console.log('body ', req.body);
    WalletService.moveToColdWallet(
        req.params.user, 
        parseInt(req.body.amount)
        ).then((tx_receipt) => {
            console.log('lol');
            res.send(tx_receipt);
        }).catch((e) => {
            console.log(e);
            res.send('error sending');
        })
});

app.use("/wallet", router);
console.log("Started listening on 3000");
app.listen(3000);