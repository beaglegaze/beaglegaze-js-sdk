const MeteringEventObserver = require('./MeteringEventObserver');
const { BatchReadyEvent } = require('./events');
const logger = require('./logger');

class ContractConsumer extends MeteringEventObserver {
  constructor(smartContract) {
    super();
    this.contract = smartContract;
    this.blocked = false;
  }

  async handle(event) {
    if (this.isBlockedAndBatchReady(event)) {
      await this.handleBlockedState(event);
      return;
    }

    if (this.blocked) {
      throw new Error('Refund the smart contract to continue using this library.');
    }

    if (event instanceof BatchReadyEvent) {
      const hasValidSubscription = await this.contract.hasValidSubscription();
      if (hasValidSubscription) {
        logger.debug('Client has valid NFT subscription, proceeding with consumption');
      } else {
        await this.consumeFromContract(event);
      }
    }
  }

  isBlockedAndBatchReady(event) {
    return this.blocked && event instanceof BatchReadyEvent;
  }

  async handleBlockedState(batchEvent) {
    await this.attemptUnblocking(batchEvent.batchSum);
    if (this.blocked) {
      throw new Error('Refund the smart contract to continue using this library.');
    }
    await this.consumeFromContract(batchEvent);
  }

  async consumeFromContract(batchEvent) {
    try {
      await this.contract.consume(BigInt(batchEvent.batchSum));
    } catch (e) {
      this.blocked = true;
      logger.error(
        "Failed to consume from contract, switching to 'blocked' state. Refund the smart contract to continue using this library.",
        e
      );
      throw new Error('Failed to consume from contract', { cause: e });
    }
  }

  async attemptUnblocking(requiredAmount) {
    logger.debug('Attempting to unblock contract consumer...');
    try {
      const availableFunds = await this.contract.getClientFunding();
      const required = BigInt(requiredAmount);

      this.logUnblockingAttempt(availableFunds, required);

      if (this.hasSufficientFunds(availableFunds, required)) {
        this.unblockConsumer(availableFunds, required);
      } else {
        this.logInsufficientFunds(availableFunds, required);
      }
    } catch (e) {
      logger.warn(`Failed to check client funding while attempting to unblock: ${e.message}`);
    }
  }

  logUnblockingAttempt(availableFunds, required) {
    logger.debug(`Available funds: ${availableFunds}, Required amount: ${required}`);
  }

  hasSufficientFunds(availableFunds, required) {
    return availableFunds >= required;
  }

  unblockConsumer(availableFunds, required) {
    this.blocked = false;
    logger.info(`Contract consumer unblocked with sufficient funds: ${availableFunds} (required: ${required})`);
  }

  logInsufficientFunds(availableFunds, required) {
    logger.warn(`Not enough funding available, remaining blocked. Available funds: ${availableFunds}, Required: ${required}`);
  }

  isInErrorState() {
    return this.blocked;
  }
}

module.exports = ContractConsumer;
