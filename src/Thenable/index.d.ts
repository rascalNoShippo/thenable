interface LegacyThenable<T> extends PromiseLike<T> {
  then<TFulfilled, TRejected = never>(
    onFulfilled: (value: T) => TFulfilled,
    onRejected?: (reason: unknown) => TRejected
  ): LegacyThenable<TFulfilled | TRejected>;

  getState(): "pending" | "fulfilled" | "rejected";
}

declare var LegacyThenable: {
  new <T>(
    executor: (
      resolve: (value: T) => void,
      reject: (reason: unknown) => void
    ) => void
  ): LegacyThenable<T>;
};

export default LegacyThenable;
