class MeteringEvent {}

class BatchReadyEvent extends MeteringEvent {
  constructor(batchSum) {
    super();
    this.batchSum = batchSum;
  }
}

module.exports = {
  MeteringEvent,
  BatchReadyEvent,
};
