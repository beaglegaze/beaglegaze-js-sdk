const BatchMode = {
  OFF: {
    hit() {
      return true;
    },
  },
  RANDOM: {
    hit() {
      return Math.random() < 0.1;
    },
  },
};

module.exports = BatchMode;
