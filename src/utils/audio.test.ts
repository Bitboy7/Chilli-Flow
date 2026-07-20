import { describe, expect, it } from "vitest";

import { comparisonGains } from "./audio";

describe("comparisonGains", () => {
  it("attenuates only the louder source", () => {
    const gain = comparisonGains(-8, -14, true);
    expect(gain.a).toBeCloseTo(0.501, 2);
    expect(gain.b).toBe(1);
  });

  it("keeps unity gain when measurements are unavailable", () => {
    expect(comparisonGains(null, -14, true)).toEqual({ a: 1, b: 1 });
    expect(comparisonGains(-8, -14, false)).toEqual({ a: 1, b: 1 });
  });
});
