import { describe, expect, it } from "vitest";
import LegacyThenable from "./index.js";

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("LegacyThenable", () => {
  describe("初期状態", () => {
    it("生成直後は pending", () => {
      const thenable = new LegacyThenable(() => {});
      expect(thenable.getState()).toBe("pending");
    });
  });

  describe("resolve", () => {
    it("同期 resolve で fulfilled になり値を保持する", () => {
      const thenable = new LegacyThenable<number>((resolve) => {
        resolve(42);
      });
      expect(thenable.getState()).toBe("fulfilled");
    });

    it("then で resolve された値を受け取れる", async () => {
      const thenable = new LegacyThenable<number>((resolve) => {
        resolve(42);
      });
      await expect(thenable).resolves.toBe(42);
    });

    it("非同期 resolve 後に fulfilled になる", async () => {
      const thenable = new LegacyThenable<string>((resolve) => {
        setTimeout(() => resolve("done"), 10);
      });
      expect(thenable.getState()).toBe("pending");
      await expect(thenable).resolves.toBe("done");
      expect(thenable.getState()).toBe("fulfilled");
    });

    it("2回目以降の resolve は無視する", async () => {
      const thenable = new LegacyThenable<string>((resolve) => {
        resolve("first");
        resolve("second");
      });
      await expect(thenable).resolves.toBe("first");
    });

    it("resolve 後の reject は無視する", async () => {
      const thenable = new LegacyThenable<string>((resolve, reject) => {
        resolve("ok");
        reject(new Error("ng"));
      });
      expect(thenable.getState()).toBe("fulfilled");
      await expect(thenable).resolves.toBe("ok");
    });
  });

  describe("reject", () => {
    it("同期 reject で rejected になる", () => {
      const thenable = new LegacyThenable((_, reject) => {
        reject(new Error("fail"));
      });
      expect(thenable.getState()).toBe("rejected");
    });

    it("then の onRejected で理由を受け取れる", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable((_, reject) => {
        reject(error);
      });
      await expect(thenable).rejects.toBe(error);
    });

    it("2回目以降の reject は無視する", async () => {
      const first = new Error("first");
      const thenable = new LegacyThenable((_, reject) => {
        reject(first);
        reject(new Error("second"));
      });
      await expect(thenable).rejects.toBe(first);
    });

    it("reject 後の resolve は無視する", async () => {
      const error = new Error("ng");
      const thenable = new LegacyThenable((resolve, reject) => {
        reject(error);
        resolve("ok");
      });
      expect(thenable.getState()).toBe("rejected");
      await expect(thenable).rejects.toBe(error);
    });
  });

  describe("executor の例外", () => {
    it("executor が throw したら rejected になる", async () => {
      const error = new Error("boom");
      const thenable = new LegacyThenable(() => {
        throw error;
      });
      expect(thenable.getState()).toBe("rejected");
      await expect(thenable).rejects.toBe(error);
    });
  });

  describe("Thenable のアンラップ", () => {
    it("resolve に Thenable を渡すと値をアンラップする", async () => {
      const inner = new LegacyThenable<number>((resolve) => {
        resolve(7);
      });
      const outer = new LegacyThenable<number>((resolve) => {
        resolve(inner);
      });
      await expect(outer).resolves.toBe(7);
    });

    it("resolve に Promise を渡すと値をアンラップする", async () => {
      const thenable = new LegacyThenable<string>((resolve) => {
        resolve(Promise.resolve("unwrapped"));
      });
      await expect(thenable).resolves.toBe("unwrapped");
    });

    it("内側の Thenable が reject したら外側も reject する", async () => {
      const error = new Error("inner");
      const inner = new LegacyThenable((_, reject) => {
        reject(error);
      });
      const outer = new LegacyThenable((resolve) => {
        resolve(inner);
      });
      await expect(outer).rejects.toBe(error);
    });
  });

  describe("then", () => {
    it("新しい Thenable を返す", () => {
      const thenable = new LegacyThenable<number>((resolve) => {
        resolve(1);
      });
      const next = thenable.then((value) => value + 1);
      expect(next).toBeInstanceOf(LegacyThenable);
      expect(next).not.toBe(thenable);
    });

    it("onFulfilled の戻り値を次の then に渡す", async () => {
      const result = await new LegacyThenable<number>((resolve) => {
        resolve(1);
      })
        .then((value) => value + 1)
        .then((value) => value + 1);
      expect(result).toBe(3);
    });

    it("onFulfilled を省略すると値をそのまま渡す", async () => {
      const thenable = new LegacyThenable<number>((resolve) => {
        resolve(10);
      });
      await expect(thenable.then()).resolves.toBe(10);
    });

    it("onRejected でキャッチすると次は fulfilled になる", async () => {
      const result = await new LegacyThenable((_, reject) => {
        reject(new Error("fail"));
      }).then(
        () => "unused",
        () => "recovered",
      );
      expect(result).toBe("recovered");
    });

    it("onRejected を省略すると reject を伝播する", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable((_, reject) => {
        reject(error);
      });
      await expect(thenable.then((value) => value)).rejects.toBe(error);
    });

    it("onFulfilled が throw したら次は rejected になる", async () => {
      const error = new Error("handler");
      const thenable = new LegacyThenable<number>((resolve) => {
        resolve(1);
      }).then(() => {
        throw error;
      });
      await expect(thenable).rejects.toBe(error);
    });

    it("onRejected が throw したら次は rejected になる", async () => {
      const error = new Error("handler");
      const thenable = new LegacyThenable((_, reject) => {
        reject(new Error("original"));
      }).then(
        () => "unused",
        () => {
          throw error;
        },
      );
      await expect(thenable).rejects.toBe(error);
    });

    it("onFulfilled が throw しても、同じ then() の onRejected は呼ばれない", async () => {
      const error = new Error("handler");
      const thenable = new LegacyThenable((resolve) => resolve("ok")).then(
        () => {
          throw error;
        },
        () => {
          throw new Error("this error should not be thrown");
        },
      );

      await expect(thenable).rejects.toBe(error);
    });

    it("pending 中に登録した then は解決後に呼ばれる", async () => {
      let resolveNow!: (value: string) => void;
      const thenable = new LegacyThenable<string>((resolve) => {
        resolveNow = resolve;
      });
      const next = thenable.then((value) => value.toUpperCase());
      expect(thenable.getState()).toBe("pending");
      resolveNow("hello");
      await expect(next).resolves.toBe("HELLO");
    });

    it("then のコールバックは非同期で実行される", async () => {
      const order: string[] = [];
      const thenable = new LegacyThenable<void>((resolve) => {
        resolve();
      });
      thenable.then(() => {
        order.push("then");
      });
      order.push("sync");
      expect(order).toEqual(["sync"]);
      await wait();
      expect(order).toEqual(["sync", "then"]);
    });

    it("onFulfilled が PromiseLike を返す場合、その結果を待つ", async () => {
      const thenable = new LegacyThenable<number>((resolve) => resolve(1)).then(
        (_) => {
          return new LegacyThenable<string>((resolve) => resolve("unwrapped"));
        },
      );

      await expect(thenable).resolves.toBe("unwrapped");
    });
  });

  describe("catch", () => {
    it("catch でエラーをキャッチできる", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable((_, reject) => {
        reject(error);
      });

      await expect(thenable.catch((reason) => reason)).resolves.toBe(error);
    });

    it("catch を省略するとエラーを伝播する", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable((_, reject) => {
        reject(error);
      });

      await expect(thenable.catch()).rejects.toBe(error);
    });
  });

  describe("finally", () => {
    it("finally で成功後の処理を実行できる", async () => {
      const thenable = new LegacyThenable<number>((resolve) => resolve(1));

      await expect(thenable.finally(() => 2)).resolves.toBe(1);
    });

    it("finally で失敗後の処理を実行できる", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable<number>((_, reject) => reject(error));

      await expect(thenable.finally(() => 2)).rejects.toBe(error);
    });
  });

  describe("await", () => {
    it("await で値を取り出せる", async () => {
      const thenable = new LegacyThenable<string>((resolve) => {
        setTimeout(() => resolve("2.23"), 10);
      });
      await expect(thenable).resolves.toBe("2.23");
    });

    it("await でエラーが表面化する", async () => {
      const error = new Error("fail");
      const thenable = new LegacyThenable((_, reject) => {
        reject(error);
      });

      try {
        await thenable;
      } catch (e) {
        expect(e).toBe(error);
        return;
      }

      throw new Error("await thenable should throw an error but did not");
    });
  });
});
