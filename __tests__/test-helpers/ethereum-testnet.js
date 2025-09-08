const { GenericContainer } = require('testcontainers');
const { ethers } = require('ethers');

const CLIENT_ACCOUNT_PK = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SMART_CONTRACT_OWNER_PK = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const DEVELOPER_ACCOUNT_PK = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

const ONE_THOUSAND_ETH = '1000000000000000000000';

class EthereumTestnet {
  constructor() {
    this.container = null;
    this.provider = null;
  }

  async start() {
    const command = [
      'ganache-cli',
      '--host=0.0.0.0',
      '--port=8545',
      `--account=${CLIENT_ACCOUNT_PK},${ONE_THOUSAND_ETH}`,
      `--account=${SMART_CONTRACT_OWNER_PK},${ONE_THOUSAND_ETH}`,
      `--account=${DEVELOPER_ACCOUNT_PK},${ONE_THOUSAND_ETH}`,
    ];

    this.container = await new GenericContainer('trufflesuite/ganache-cli:v6.12.2')
      .withExposedPorts(8545)
      .withCommand(command)
      .start();

    const networkAddress = `http://${this.container.getHost()}:${this.container.getMappedPort(8545)}`;
    this.provider = new ethers.JsonRpcProvider(networkAddress);
  }

  async stop() {
    if (this.container) {
      await this.container.stop();
    }
  }

  getProvider() {
    return this.provider;
  }

  getSigner(privateKey) {
    return new ethers.Wallet(privateKey, this.provider);
  }

  getAccounts() {
    return {
      client: this.getSigner(CLIENT_ACCOUNT_PK),
      owner: this.getSigner(SMART_CONTRACT_OWNER_PK),
      developer: this.getSigner(DEVELOPER_ACCOUNT_PK),
    };
  }
}

module.exports = EthereumTestnet;
