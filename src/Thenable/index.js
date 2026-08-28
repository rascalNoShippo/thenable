/**
 * フルスペックに近い Thenable オブジェクトを作成するコンストラクター
 *
 * @template T
 * @param {(
 *   resolve: (value: T) => void,
 *   reject: (reason: unknown) => void
 * ) => void} executor
 */
function LegacyThenable(executor) {
  this.state = "pending"; // 'pending', 'fulfilled', 'rejected'
  this.value;
  this.reason; // 拒絶理由（エラー内容）
  this.onResolved = null;
  this.onRejected = null;

  /**
   * 成功時の処理
   * @param {T | PromiseLike<T>} val
   */
  const resolve = (val) => {
    if (this.state !== "pending") return;
    // Thenable の場合はアンラップ
    if (val && typeof val.then === "function") {
      val.then(resolve, reject);
      return;
    }
    this.state = "fulfilled";
    this.value = val;
    if (this.onResolved) this.onResolved();
  };
  
  /**
   * 失敗時の処理
   * @param {unknown} reason
   */
  const reject = (reason) => {
    if (this.state !== "pending") return;
    this.state = "rejected";
    this.reason = reason;
    if (this.onRejected) this.onRejected();
  };

  // executor に resolve と reject の両方を渡す
  try {
    executor(resolve, reject);
  } catch (err) {
    reject(err); // 実行中にエラーが発生した場合は reject する
  }
}
/**
 * Promise 互換の then メソッド（成功/失敗の両方に対応）
 * 
 * @template TFullfilled
 * @template TRejected
 * @param {(value: T) => TFullfilled} onFulfilled
 * @param {(reason: unknown) => TRejected} onRejected
 * @returns {LegacyThenable<TFullfilled | TRejected>}
 */
LegacyThenable.prototype.then = function (onFulfilled, onRejected) {
  // 1. 新しい Thenable を返してチェーンを可能にする
  return new LegacyThenable((resolve, reject) => {
    // 内部で非同期実行をエミュレートする関数
    const handle = () => {
      try {
        if (this.state === "fulfilled") {
          const result = onFulfilled ? onFulfilled(this.value) : this.value;
          resolve(result); // 次の then へ
        } else if (this.state === "rejected") {
          if (onRejected) {
            const result = onRejected(this.reason);
            resolve(result); // キャッチされたら resolve へ
          } else {
            reject(this.reason); // キャッチされなければそのまま reject
          }
        }
      } catch (e) {
        reject(e);
      }
    };

    // 2. マイクロタスク（setTimeout等）で非同期を保証する
    if (this.state === "pending") {
      this.onResolved = () => setTimeout(handle, 0);
      this.onRejected = () => setTimeout(handle, 0);
    } else {
      setTimeout(handle, 0);
    }
  });
};

LegacyThenable.prototype.getState = function () {
  return this.state;
};

export default LegacyThenable;
