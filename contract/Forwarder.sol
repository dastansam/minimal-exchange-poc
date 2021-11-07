pragma solidity 0.8.9;

/**
* Forwarder contract that forwards all the received ether
* to a destination address (mainAddress)
* mainAddress is the creator of the contract
*/
contract Forwarder {
  address payable public mainAddress;
  event LogForwarded(address indexed sender, uint amount);
  event LogFlushed(address indexed sender, uint amount);

  constructor () {
    mainAddress = payable(msg.sender);
  }

  fallback() external payable {
    emit LogForwarded(msg.sender, msg.value);
    mainAddress.transfer(msg.value);
  }

  receive() external payable {
    emit LogForwarded(msg.sender, msg.value);
    mainAddress.transfer(msg.value);
  }

  function flush() public {
    emit LogFlushed(msg.sender, address(this).balance);
    mainAddress.transfer(address(this).balance);
  }
}