const AsyncBatchProcessor = require('./AsyncBatchProcessor');
const ContractConsumer = require('./ContractConsumer');
const SmartContract = require('./SmartContract');
const MicroPayment = require('./MicroPayment');
const BatchMode = require('./BatchMode');

class BeagleGaze {
  constructor({
    contractAddress,
    networkAddress,
    clientPrivateKey,
    lowFundingThreshold = 1000,
    batchMode = BatchMode.OFF,
  }) {
    if (!contractAddress || !networkAddress || !clientPrivateKey) {
      throw new Error('contractAddress, networkAddress, and clientPrivateKey are required');
    }

    const smartContract = new SmartContract(contractAddress, networkAddress, clientPrivateKey, lowFundingThreshold);
    const contractConsumer = new ContractConsumer(smartContract);

    this.asyncBatchProcessor = new AsyncBatchProcessor(batchMode);
    this.asyncBatchProcessor.addObserver(contractConsumer);

    const microPayment = new MicroPayment(this.asyncBatchProcessor);
    this.withPayPerCall = microPayment.withPayPerCall.bind(microPayment);
  }
}

module.exports = {
    BeagleGaze,
    BatchMode,
};
