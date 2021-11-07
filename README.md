# Centralized Exchange POC

This is the minimalistic POC project that tries to show how CEX operates. Currently supports `ETH` and `ERC20` token deposits.

## Watcher Service
This is the monitoring service that tracks incoming transactions to our generated deposit addresses.

It essentially subscribes to `newBlockHeaders` event and whenever the new block is produced, iterates over block transactions to process them. It creates a webhook if the valid deposit has been made.

For each block, this service also fetches `EVM` logs, filtering them by `Transfer` event topic. If the valid deposit of `ERC20` tokens has been made, it creates a new webhook with `ERC20` token type deposit.

## API Endpoints

### Get a deposit address for User
#### Request
`GET /wallet/:userId`
```
curl -X GET http://localhost:3000/wallet/99 -H 'content-type: application/json' 
```
#### Response
```
{
    "wallet": "0xfb987d56d1e554f4f226f4b9bef881dbb377c25e"
}
```
### Move deposited amount from Wallet by Tx Hash
#### Request
`POST/wallet/:userId/move`
```
curl -X POST \
  http://localhost:3000/wallet/99/move -H 'content-type: application/json' \
  -d '{
	"txHash": "0x890594983bc5b58b1a32dd121eda492c6b31f830ba6ae1205401b14ab7ccc860"
}'
```
#### Response
```
{
    "result": {
        "tx_hash": "0xcd42b944659b72db8e6d1ebf25d6a85bace4c0c7f75b13122fff9d2ee554e4f5",
        "status": true,
        "gasUsed": 1416354,
        "from": "0xfb987d56d1e554f4f226f4b9bef881dbb377c25e",
        "to": "0xc096bda87833db5976390c85e8566f88869212e3"
    }
}
```
