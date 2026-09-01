type ThenableState = "pending" | "fulfilled" | "rejected";

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return typeof (value as PromiseLike<T>)?.then === "function";
}

/**
 * Thenable オブジェクトを作成するコンストラクター
 */
export class Thenable<T> implements PromiseLike<T> {
  private state: ThenableState = "pending";
  private value?: T;
  private reason?: unknown;
  private onFulfilled: (() => void) | null = null;
  private onRejected: (() => void) | null = null;

  constructor(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason: unknown) => void,
    ) => void,
  ) {
    const resolve = (val: T | PromiseLike<T>) => {
      if (this.state !== "pending") return;

      // Thenable の場合はアンラップ
      if (isPromiseLike(val)) {
        val.then(resolve, reject);
        return;
      }

      this.state = "fulfilled";
      this.value = val;
      this.onFulfilled?.();
    };

    const reject = (reason: unknown) => {
      if (this.state !== "pending") return;

      this.state = "rejected";
      this.reason = reason;
      this.onRejected?.();
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  /**
   * Promise 互換の then メソッド（成功/失敗の両方に対応）
   */
  then<TFulfilled = T, TRejected = never>(
    onFulfilled?: (value: T) => TFulfilled | PromiseLike<TFulfilled>,
    onRejected?: (reason: unknown) => TRejected | PromiseLike<TRejected>,
  ): Thenable<TFulfilled | TRejected> {
    return new Thenable((resolve, reject) => {
      const handleFulfilled = () => {
        try {
          const result = onFulfilled
            ? onFulfilled(this.value!)
            : (this.value as TFulfilled);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };

      const handleRejected = () => {
        try {
          if (!onRejected) {
            reject(this.reason);
            return;
          }

          const result = onRejected(this.reason);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };

      // マイクロタスク（setTimeout等）で非同期を保証する
      switch (this.state) {
        case "pending":
          this.onFulfilled = () => setTimeout(handleFulfilled, 0);
          this.onRejected = () => setTimeout(handleRejected, 0);
          break;
        case "fulfilled":
          setTimeout(handleFulfilled, 0);
          break;
        case "rejected":
          setTimeout(handleRejected, 0);
          break;
      }
    });
  }

  /**
   * Promise 互換の catch メソッド（失敗時のみに対応）
   */
  catch<TRejected = never>(
    onRejected?: (reason: unknown) => TRejected | PromiseLike<TRejected>,
  ): Thenable<T | TRejected> {
    return this.then(undefined, onRejected);
  }

  /**
   * Promise 互換の finally メソッド（成功/失敗の両方に対応）
   */
  finally(onFinally: () => void): Thenable<T> {
    return this.then(
      (value) => {
        onFinally();
        return value;
      },
      (reason) => {
        onFinally();
        throw reason;
      },
    );
  }

  getState(): ThenableState {
    return this.state;
  }
}
