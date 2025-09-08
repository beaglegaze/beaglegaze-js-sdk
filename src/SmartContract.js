const { ethers } = require('ethers');
const Mutex = require('./mutex');
const logger = require('./logger');

const ABI = [
  {
    "name": "consume",
    "type": "function",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": []
  },
  {
    "name": "getClientFunding",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "hasValidSubscription",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view"
  }
];

class SmartContract {
  constructor(contractAddress, networkAddress, clientPrivateKey, lowFundingThreshold) {
    this.lowFundingThreshold = lowFundingThreshold;
    const provider = new ethers.JsonRpcProvider(networkAddress);
    const wallet = new ethers.Wallet(clientPrivateKey, provider);
    this.contract = new ethers.Contract(contractAddress, ABI, wallet);
    this.transactionLock = new Mutex();
  }

  async consume(valueOf) {
    await this.transactionLock.lock();
    try {
      const tx = await this.contract.consume(valueOf);
      const receipt = await tx.wait();
      this.logClientFundingIfLow();
      return receipt.status === 1;
    } catch (e) {
      logger.error(`Failed to consume from contract: ${e.message}`);
      throw new Error('Failed to consume from contract', { cause: e });
    } finally {
      this.transactionLock.unlock();
    }
  }

  async logClientFundingIfLow() {
    try {
        const funding = await this.contract.getClientFunding();
        if (funding < this.lowFundingThreshold) {
            logger.warn('Client funding is low. Consider refunding to avoid interruptions.');
        }
    } catch (e) {
        logger.warn(`Failed to get client funding: ${e.message}`);
    }
  }

  async getClientFunding() {
    try {
      return await this.contract.getClientFunding();
    } catch (e) {
      logger.error(`Failed to get client funding: ${e.message}`);
      return 0n; // Using BigInt zero
    }
  }

  async hasValidSubscription() {
    try {
      return await this.contract.hasValidSubscription();
    } catch (e) {
      logger.error(`Failed to check subscription status: ${e.message}`);
      return false;
    }
  }
}

module.exports = SmartContract;
