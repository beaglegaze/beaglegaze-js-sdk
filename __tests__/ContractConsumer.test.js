const ContractConsumer = require('../src/ContractConsumer');
const { BatchReadyEvent } = require('../src/events');

describe('ContractConsumer', () => {
  const BATCH_AMOUNT = 100;
  const SUFFICIENT_FUNDS = 100n;
  const INSUFFICIENT_FUNDS = 50n;

  let mockContract;
  let contractConsumer;

  beforeEach(() => {
    mockContract = {
      consume: jest.fn(),
      getClientFunding: jest.fn(),
      hasValidSubscription: jest.fn().mockResolvedValue(false),
    };
    contractConsumer = new ContractConsumer(mockContract);
  });

  const blockConsumerWithInitialFailedBatch = async () => {
    const initialBatchEvent = new BatchReadyEvent(BATCH_AMOUNT);
    await expect(contractConsumer.handle(initialBatchEvent)).rejects.toThrow('Failed to consume from contract');
    expect(contractConsumer.isInErrorState()).toBe(true);
  };

  const setupContractToThrowInsufficientFundsError = () => {
    mockContract.consume.mockImplementation(() => {
      throw new Error('Insufficient funds');
    });
  };

  it('should keep throwing exceptions while blocked', async () => {
    setupContractToThrowInsufficientFundsError();
    await blockConsumerWithInitialFailedBatch();

    const secondBatchEvent = new BatchReadyEvent(50);
    await expect(contractConsumer.handle(secondBatchEvent)).rejects.toThrow('Refund the smart contract to continue using this library.');
    expect(contractConsumer.isInErrorState()).toBe(true);

    const thirdBatchEvent = new BatchReadyEvent(25);
    await expect(contractConsumer.handle(thirdBatchEvent)).rejects.toThrow('Refund the smart contract to continue using this library.');
    expect(contractConsumer.isInErrorState()).toBe(true);
  });

  it('should unblock when receiving unblocking attempt event with sufficient funds', async () => {
    setupContractToThrowInsufficientFundsError();
    await blockConsumerWithInitialFailedBatch();

    mockContract.getClientFunding.mockResolvedValue(SUFFICIENT_FUNDS);
    mockContract.consume.mockImplementation(() => Promise.resolve(true)); // un-mock the throwing

    const unblockingBatchEvent = new BatchReadyEvent(BATCH_AMOUNT);
    await contractConsumer.handle(unblockingBatchEvent);

    expect(contractConsumer.isInErrorState()).toBe(false);
    expect(mockContract.consume).toHaveBeenCalledTimes(2);
  });

  it('should remain blocked when funding is insufficient for pending batch', async () => {
    setupContractToThrowInsufficientFundsError();
    await blockConsumerWithInitialFailedBatch();

    mockContract.getClientFunding.mockResolvedValue(INSUFFICIENT_FUNDS);

    const batchEvent = new BatchReadyEvent(BATCH_AMOUNT);
    await expect(contractConsumer.handle(batchEvent)).rejects.toThrow('Refund the smart contract to continue using this library.');

    expect(contractConsumer.isInErrorState()).toBe(true);
    expect(mockContract.consume).toHaveBeenCalledTimes(1);
  });
});
