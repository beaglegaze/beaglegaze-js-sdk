const { BeagleGaze, BatchMode } = require('../src');
const AsyncBatchProcessor = require('../src/AsyncBatchProcessor');
const ContractConsumer = require('../src/ContractConsumer');
const SmartContract = require('../src/SmartContract');
const MicroPayment = require('../src/MicroPayment');

jest.mock('../src/AsyncBatchProcessor');
jest.mock('../src/ContractConsumer');
jest.mock('../src/SmartContract');
jest.mock('../src/MicroPayment');

describe('BeagleGaze', () => {
    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        AsyncBatchProcessor.mockClear();
        ContractConsumer.mockClear();
        SmartContract.mockClear();
        MicroPayment.mockClear();
    });

    it('should throw an error if config is not provided', () => {
        expect(() => new BeagleGaze({})).toThrow('contractAddress, networkAddress, and clientPrivateKey are required');
    });

    it('should initialize all components correctly', () => {
        const config = {
            contractAddress: '0x123',
            networkAddress: 'http://localhost:8545',
            clientPrivateKey: '0xabc',
            lowFundingThreshold: 500,
            batchMode: BatchMode.RANDOM,
        };

        const bg = new BeagleGaze(config);

        expect(SmartContract).toHaveBeenCalledWith(config.contractAddress, config.networkAddress, config.clientPrivateKey, config.lowFundingThreshold);
        expect(ContractConsumer).toHaveBeenCalledWith(expect.any(SmartContract));
        expect(AsyncBatchProcessor).toHaveBeenCalledWith(config.batchMode);

        const asyncProcessorInstance = AsyncBatchProcessor.mock.instances[0];
        expect(asyncProcessorInstance.addObserver).toHaveBeenCalledWith(expect.any(ContractConsumer));

        expect(MicroPayment).toHaveBeenCalledWith(asyncProcessorInstance);

        expect(bg.withPayPerCall).toBeDefined();
    });
});
