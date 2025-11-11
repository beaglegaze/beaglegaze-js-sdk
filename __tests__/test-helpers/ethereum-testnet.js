const { GenericContainer, Wait } = require('testcontainers');
const { ethers } = require('ethers');

const CLIENT_ACCOUNT_PK = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SMART_CONTRACT_OWNER_PK = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DEVELOPER_ACCOUNT_PK = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

class EthereumTestnet {
  constructor() {
    this.container = null;
    this.provider = null;
  }

  async start() {
    this.container = await new GenericContainer('hardhat-testnet')
      .withExposedPorts(8545)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const networkAddress = `http://${this.container.getHost()}:${this.container.getMappedPort(8545)}`;
    this.provider = new ethers.JsonRpcProvider(networkAddress);
    
    // Wait for the network to be fully ready
    await this.waitForNetwork();
  }

  async stop() {
    if (this.container) {
      await this.container.stop();
    }
  }

  async waitForNetwork() {
    const maxRetries = 30;
    const retryDelay = 2000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.provider.getBlockNumber();
        return;
      } catch (error) {
        console.log(`Waiting for network to be ready... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    throw new Error('Network did not become ready within timeout');
  }

  getProvider() {
    return this.provider;
  }

  getNetworkAddress() {
    return `http://${this.container.getHost()}:${this.container.getMappedPort(8545)}`;
  }

  getSigner(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
  }

  // Create fresh signers each time to avoid nonce caching
  getFreshSigner(privateKey) {
    const freshProvider = new ethers.JsonRpcProvider(this.getNetworkAddress());
    return new ethers.Wallet(privateKey, freshProvider);
  }

  getAccounts() {
    return {
      client: this.getSigner(CLIENT_ACCOUNT_PK),
      owner: this.getSigner(SMART_CONTRACT_OWNER_PK),
      developer: this.getSigner(DEVELOPER_ACCOUNT_PK),
    };
  }

  getFreshAccounts() {
    return {
      client: this.getFreshSigner(CLIENT_ACCOUNT_PK),
      owner: this.getFreshSigner(SMART_CONTRACT_OWNER_PK),
      developer: this.getFreshSigner(DEVELOPER_ACCOUNT_PK),
    };
  }

  async getPreDeployedContractAddress() {
    // Return the known pre-deployed contract address from hardhat-testnet
    return '0x289B72CEeaB48832261626D62E3daA87Fd90B024';
  }

  async waitForContractDeployment(contractAddress, maxAttempts = 30, intervalMs = 1000) {
    console.log('⏳ Waiting for contract deployment to complete...');
    let isContractDeployed = false;
    let attempts = 0;
    
    while (!isContractDeployed && attempts < maxAttempts) {
      try {
        const code = await this.provider.getCode(contractAddress);
        if (code !== '0x') {
          isContractDeployed = true;
          console.log('✅ Contract deployment confirmed');
          return true;
        }
      } catch (error) {
        // Contract not yet deployed, continue waiting
      }
      
      attempts++;
      console.log(`   Attempt ${attempts}/${maxAttempts} - waiting for deployment...`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    if (!isContractDeployed) {
      throw new Error(`Contract deployment timeout - contract not deployed within ${maxAttempts} attempts`);
    }
    
    return false;
  }

  async getDeployedContractAddress() {
    const contractAddress = await this.getPreDeployedContractAddress();
    await this.waitForContractDeployment(contractAddress);
    return contractAddress;
  }
}

module.exports = EthereumTestnet;
