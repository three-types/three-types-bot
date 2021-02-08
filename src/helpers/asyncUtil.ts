export const mapSeries = <Arr>(fn: (item: Arr) => Promise<void>, arr: Arr[]) => {
    return arr.reduce((promise, el) => promise.then(() => fn(el)), Promise.resolve());
};
