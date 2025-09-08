const { BatchReadyEvent } = require('./events');
const logger = require('./logger');

class AsyncBatchProcessor {
  constructor(batchMode) {
    this.observers = [];
    this.batchMode = batchMode;
    this.batchSum = 0;
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  async registerCallAsync(pricePerInvocation) {
    this.addToCurrentBatch(pricePerInvocation);

    if (this.shouldProcessBatch()) {
      await this.processBatchAsync();
    }
  }

  addToCurrentBatch(pricePerInvocation) {
    this.batchSum += pricePerInvocation;
  }

  shouldProcessBatch() {
    return this.batchMode.hit();
  }

  async processBatchAsync() {
    logger.info(`Processing batch with sum ${this.batchSum}...`);
    const currentBatchSum = this.getCurrentBatchSum();
    this.resetBatch();
    await this.notifyObserversAsync(new BatchReadyEvent(currentBatchSum));
  }

  getCurrentBatchSum() {
    return this.batchSum;
  }

  resetBatch() {
    this.batchSum = 0;
  }

  async notifyObserversAsync(event) {
    for (const observer of this.observers) {
      await observer.handle(event);
    }
  }

  isInErrorState() {
    return this.observers.some((observer) => observer.isInErrorState());
  }
}

module.exports = AsyncBatchProcessor;
