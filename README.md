# Centralized Exchange POC

This is the minimalistic POC project that tries to show how CEX operates. Currently supports `ETH` and `ERC20` token deposits.

## Prerequisites

- `Redis` - used for storing generated wallets and new deposits
- `Node.js` > 16.0.0
- `env` variables

## Run
NOTE: This was mostly tested with testnets, `Ropsten` and `Kovan`. So, for the best performance test in this networks.  
Before running the services, make sure your `redis-server` is up.
Also make sure you have installed all the dependencies:
```
yarn
```
Launch API:
```
yarn run start-api
```
In a separate terminal, launch `watcher service`:
```
yarn run start-watch
```
To run tests:
```
yarn run test
```

## Example
1. First, take any random integer user id and get a deposit address (see below).
2. Then deposit some `ether` (on `Ropsten`) to the following address. After the transaction is confirmed, it should send a webhook. 
3. Get deposit transaction   hash from the [webhook url](https://61439649c5b553001717d029.mockapi.io/deposits).
4. Move funds to a cold wallet (see below)

## Hierarchical Deterministic (HD) Wallets
In a traditional CEX when user wants to deposit `ETH` or `ERC20` tokens, a unique deposit address is created. User deposits the funds and CEX detects the deposit and updates it's records. There are essentially three ways to accomplish this:

- #### Generate new keypair for each user
  - Need to maintain huge number of keypairs
  - Hard to move funds for large number of wallets
- #### HD wallets
  - One private key/mnemonic to manage all derived keypairs
  - Deterministic
  - Single point of failure

This project uses HD wallets to manage user deposit addresses, where for each user the deposit address is derived from the `userId`.

## Watcher Service
This is the monitoring service that tracks incoming transactions to our generated deposit addresses.

It essentially subscribes to `newBlockHeaders` event and whenever the new block is produced, iterates over block transactions to process them. It creates a webhook if the valid deposit has been made.

For each block, this service also fetches `EVM` logs, filtering them by `Transfer` event topic. If the valid deposit of `ERC20` tokens has been made, it creates a new webhook with `ERC20` token type deposit.

## Webhook

When the new deposit is detected, `Watcher` service sends the transaction metadata to the given webhook url. This, obviously can be modified based on your needs, f.e you could send an email, or push notification, etc. In this case, I send a tx metadata to a [mock api url](https://61439649c5b553001717d029.mockapi.io/deposits). All the posted deposits can be retrieved from this url. For example, we can use the deposit transaction hash to move deposit to a cold wallet.

## API Endpoints

### Get a deposit address for User
#### Request
`GET /wallet/:userId`
```
curl -X GET http://localhost:3000/wallet/69 -H 'content-type: application/json' 
```
#### Response
```
{
    "wallet": "0x9676485902c3de2ce6fbb16297fca512bc929111"
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
