class MeteringEventObserver {
    handle(event) {
        throw new Error("handle() must be implemented");
    }

    isInErrorState() {
        return false;
    }
}

module.exports = MeteringEventObserver;
