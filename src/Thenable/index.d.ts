interface LegacyThenable<T> extends PromiseLike<T> {
  then<TFulfilled, TRejected = never>(
    onFulfilled?: (value: T) => TFulfilled | PromiseLike<TFulfilled>,
    onRejected?: (reason: unknown) => TRejected | PromiseLike<TRejected>
  ): LegacyThenable<TFulfilled | TRejected>;

  catch<TRejected = never>(
    onRejected?: (reason: unknown) => TRejected | PromiseLike<TRejected>
  ): LegacyThenable<T | TRejected>;

  getState(): "pending" | "fulfilled" | "rejected";
}

declare var LegacyThenable: {
  new <T>(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason: unknown) => void
    ) => void
  ): LegacyThenable<T>;
};

export default LegacyThenable;
