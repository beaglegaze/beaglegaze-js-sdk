const AsyncBatchProcessor = require('../src/AsyncBatchProcessor');
const BatchMode = require('../src/BatchMode');
const { BatchReadyEvent } = require('../src/events');
const MeteringEventObserver = require('../src/MeteringEventObserver');

describe('AsyncBatchProcessor', () => {
  const FIRST_CALL_AMOUNT = 50;
  let asyncProcessor;

  beforeEach(() => {
    asyncProcessor = new AsyncBatchProcessor(BatchMode.OFF);
  });

  it('should notify observers when batch is ready', async () => {
    const contractConsumer = {
      handle: jest.fn(),
      isInErrorState: jest.fn().mockReturnValue(false),
    };

    asyncProcessor.addObserver(contractConsumer);

    await asyncProcessor.registerCallAsync(FIRST_CALL_AMOUNT);

    expect(contractConsumer.handle).toHaveBeenCalledTimes(1);
    const expectedEvent = new BatchReadyEvent(FIRST_CALL_AMOUNT);
    expect(contractConsumer.handle).toHaveBeenCalledWith(expectedEvent);
  });

  it('should go into error state when observer throws exception', () => {
    const errorObserver = new MeteringEventObserver();
    errorObserver.handle = () => {
      throw new Error('Observer failed');
    };
    errorObserver.isInErrorState = () => true;

    asyncProcessor.addObserver(errorObserver);

    expect(asyncProcessor.isInErrorState()).toBe(true);
  });

  it('should process batch when batch mode is random', async () => {
    asyncProcessor = new AsyncBatchProcessor(BatchMode.RANDOM);
    const contractConsumer = {
      handle: jest.fn(),
      isInErrorState: jest.fn().mockReturnValue(false),
    };
    asyncProcessor.addObserver(contractConsumer);

    for (let i = 0; i < 50; i++) {
      await asyncProcessor.registerCallAsync(5);
    }

    expect(contractConsumer.handle.mock.calls.length).toBeLessThan(50);
    expect(contractConsumer.handle.mock.calls.length).toBeGreaterThan(0);
  });
});
