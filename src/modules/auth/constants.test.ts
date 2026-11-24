import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./constants";

describe("safeReturnPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeReturnPath("/criar?etapa=2")).toBe("/criar?etapa=2");
  });

  it("recusa destinos externos e valores estranhos", () => {
    for (const value of ["https://mal.com", "//mal.com", "/\\mal.com", "criar", "", null, 3]) {
      expect(safeReturnPath(value, "/x")).toBe("/x");
    }
  });
});
