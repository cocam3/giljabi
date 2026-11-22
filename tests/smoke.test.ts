import { expect, test } from "vitest";

test("@/ alias로 데이터 로더 모듈을 불러온다", async () => {
  await expect(import("@/lib/data")).resolves.toBeDefined();
});
