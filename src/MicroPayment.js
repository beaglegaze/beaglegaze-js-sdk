const logger = require('./logger');

class MicroPayment {
    constructor(asyncBatchProcessor) {
        this.asyncBatchProcessor = asyncBatchProcessor;
    }

    withPayPerCall(fn, price) {
        const self = this;
        return async function(...args) {
            logger.info(`[Call tracked]: ${fn.name}`);

            await self.asyncBatchProcessor.registerCallAsync(price);

            if (self.asyncBatchProcessor.isInErrorState()) {
                throw new Error("Micro-payment processing is in error state, method execution blocked.");
            }

            return fn.apply(this, args);
        };
    }
}

module.exports = MicroPayment;
