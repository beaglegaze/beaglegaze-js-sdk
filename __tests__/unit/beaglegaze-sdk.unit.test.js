const AsyncBatchProcessor = require('../../src/AsyncBatchProcessor');
const ContractConsumer = require('../../src/ContractConsumer');
const MicroPayment = require('../../src/MicroPayment');
const SmartContract = require('../../src/SmartContract');
const BatchMode = require('../../src/BatchMode');
const { BatchReadyEvent } = require('../../src/events');

// Mock ethers for unit tests
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Wallet: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({
      consume: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({ status: 1 }) }),
      getClientFunding: jest.fn().mockResolvedValue(5000n),
      hasValidSubscription: jest.fn().mockResolvedValue(false)
    }))
  }
}));

describe('BeagleGaze SDK Unit Tests', () => {
  describe('BatchMode', () => {
    test('BatchMode.OFF should always hit', () => {
      expect(BatchMode.OFF.hit()).toBe(true);
      expect(BatchMode.OFF.hit()).toBe(true);
    });

    test('BatchMode.RANDOM should hit approximately 10% of the time', () => {
      const hits = [];
      for (let i = 0; i < 1000; i++) {
        hits.push(BatchMode.RANDOM.hit());
      }
      const hitRate = hits.filter(hit => hit).length / hits.length;
      expect(hitRate).toBeGreaterThan(0.05);
      expect(hitRate).toBeLessThan(0.15);
    });
  });

  describe('AsyncBatchProcessor', () => {
    let processor;
    let mockObserver;

    beforeEach(() => {
      processor = new AsyncBatchProcessor(BatchMode.OFF);
      mockObserver = {
        handle: jest.fn().mockResolvedValue(undefined),
        isInErrorState: jest.fn().mockReturnValue(false)
      };
      processor.addObserver(mockObserver);
    });

    test('should accumulate batch sum correctly', () => {
      processor.addToCurrentBatch(100);
      processor.addToCurrentBatch(200);
      expect(processor.getCurrentBatchSum()).toBe(300);
    });

    test('should process batch when mode hits', async () => {
      processor.addToCurrentBatch(150);
      
      await processor.registerCallAsync(100);
      
      expect(mockObserver.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          batchSum: 250
        })
      );
      expect(processor.getCurrentBatchSum()).toBe(0); // Reset after processing
    });

    test('should not process batch when mode does not hit', async () => {
      const neverHitMode = { hit: () => false };
      processor = new AsyncBatchProcessor(neverHitMode);
      processor.addObserver(mockObserver);
      
      await processor.registerCallAsync(100);
      
      expect(mockObserver.handle).not.toHaveBeenCalled();
      expect(processor.getCurrentBatchSum()).toBe(100);
    });

    test('should check if in error state', () => {
      mockObserver.isInErrorState.mockReturnValue(true);
      expect(processor.isInErrorState()).toBe(true);
      
      mockObserver.isInErrorState.mockReturnValue(false);
      expect(processor.isInErrorState()).toBe(false);
    });
  });

  describe('MicroPayment', () => {
    let microPayment;
    let mockProcessor;

    beforeEach(() => {
      mockProcessor = {
        registerCallAsync: jest.fn().mockResolvedValue(undefined),
        isInErrorState: jest.fn().mockReturnValue(false)
      };
      microPayment = new MicroPayment(mockProcessor);
    });

    test('should wrap function and register call', async () => {
      const originalFunction = jest.fn((a, b) => a + b);
      const wrappedFunction = microPayment.withPayPerCall(originalFunction, 50);
      
      const result = await wrappedFunction(3, 7);
      
      expect(result).toBe(10);
      expect(originalFunction).toHaveBeenCalledWith(3, 7);
      expect(mockProcessor.registerCallAsync).toHaveBeenCalledWith(50);
    });

    test('should throw error when processor is in error state', async () => {
      mockProcessor.isInErrorState.mockReturnValue(true);
      
      const originalFunction = jest.fn();
      const wrappedFunction = microPayment.withPayPerCall(originalFunction, 50);
      
      await expect(wrappedFunction()).rejects.toThrow('Micro-payment processing is in error state');
      expect(originalFunction).not.toHaveBeenCalled();
    });

    test('should preserve function context', async () => {
      class TestClass {
        constructor(value) {
          this.value = value;
        }
        
        getValue() {
          return this.value;
        }
      }
      
      const instance = new TestClass(42);
      const wrappedGetValue = microPayment.withPayPerCall(instance.getValue.bind(instance), 25);
      
      const result = await wrappedGetValue();
      expect(result).toBe(42);
    });
  });

  describe('SmartContract', () => {
    let smartContract;
    let mockContract;

    beforeEach(() => {
      mockContract = {
        consume: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({ status: 1 }) }),
        getClientFunding: jest.fn().mockResolvedValue(5000n),
        hasValidSubscription: jest.fn().mockResolvedValue(false)
      };
      
      // Mock the ethers Contract constructor to return our mock
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementation(() => mockContract);
      
      smartContract = new SmartContract(
        '0x123...',
        'http://localhost:8545',
        '0xabc...',
        1000
      );
    });

    test('should consume successfully', async () => {
      const result = await smartContract.consume(100n);
      
      expect(result).toBe(true);
      expect(mockContract.consume).toHaveBeenCalledWith(100n);
    });

    test('should handle consume failure', async () => {
      mockContract.consume.mockRejectedValue(new Error('Transaction failed'));
      
      await expect(smartContract.consume(100n)).rejects.toThrow('Failed to consume from contract');
    });

    test('should get client funding', async () => {
      const funding = await smartContract.getClientFunding();
      expect(funding).toBe(5000n);
    });

    test('should handle funding check failure gracefully', async () => {
      mockContract.getClientFunding.mockRejectedValue(new Error('Network error'));
      
      const funding = await smartContract.getClientFunding();
      expect(funding).toBe(0n);
    });

    test('should check subscription status', async () => {
      mockContract.hasValidSubscription.mockResolvedValue(true);
      
      const hasSubscription = await smartContract.hasValidSubscription();
      expect(hasSubscription).toBe(true);
    });
  });

  describe('ContractConsumer', () => {
    let contractConsumer;
    let mockSmartContract;

    beforeEach(() => {
      mockSmartContract = {
        consume: jest.fn().mockResolvedValue(true),
        getClientFunding: jest.fn().mockResolvedValue(5000n),
        hasValidSubscription: jest.fn().mockResolvedValue(false)
      };
      contractConsumer = new ContractConsumer(mockSmartContract);
    });

    test('should handle BatchReadyEvent with valid subscription', async () => {
      mockSmartContract.hasValidSubscription.mockResolvedValue(true);
      
      const event = new BatchReadyEvent(100);
      await contractConsumer.handle(event);
      
      expect(mockSmartContract.hasValidSubscription).toHaveBeenCalled();
      expect(mockSmartContract.consume).not.toHaveBeenCalled();
    });

    test('should consume from contract without subscription', async () => {
      const event = new BatchReadyEvent(250);
      await contractConsumer.handle(event);
      
      expect(mockSmartContract.consume).toHaveBeenCalledWith(250n);
    });

    test('should handle consume failure and enter blocked state', async () => {
      mockSmartContract.consume.mockRejectedValue(new Error('Insufficient funds'));
      
      const event = new BatchReadyEvent(100);
      
      await expect(contractConsumer.handle(event)).rejects.toThrow('Failed to consume from contract');
      expect(contractConsumer.isInErrorState()).toBe(true);
    });

    test('should attempt unblocking when blocked and sufficient funds available', async () => {
      // First put consumer in blocked state
      mockSmartContract.consume.mockRejectedValueOnce(new Error('Insufficient funds'));
      const event1 = new BatchReadyEvent(100);
      await expect(contractConsumer.handle(event1)).rejects.toThrow();
      expect(contractConsumer.isInErrorState()).toBe(true);
      
      // Now try with sufficient funds
      mockSmartContract.consume.mockResolvedValue(true);
      mockSmartContract.getClientFunding.mockResolvedValue(5000n);
      
      const event2 = new BatchReadyEvent(200);
      await contractConsumer.handle(event2);
      
      expect(contractConsumer.isInErrorState()).toBe(false);
      expect(mockSmartContract.consume).toHaveBeenCalledWith(200n);
    });
  });
});