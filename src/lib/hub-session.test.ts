import { extractLocationId, parseCookieHeader, configFromRequest } from "./hub-session";
import { explainHubError } from "./ghl";
import { describe, expect, it } from "vitest";

describe("extractLocationId", () => {
  it("pulls the id out of a Hub sub-account URL", () => {
    expect(
      extractLocationId("https://app.captivationhub.com/v2/location/ve9EPM428h8vShlRW1KT/dashboard"),
    ).toBe("ve9EPM428h8vShlRW1KT");
    expect(
      extractLocationId("https://app.gohighlevel.com/v2/location/abc123/settings/private-integrations"),
    ).toBe("abc123");
  });

  it("accepts a pasted id or query param", () => {
    expect(extractLocationId("ve9EPM428h8vShlRW1KT")).toBe("ve9EPM428h8vShlRW1KT");
    expect(
      extractLocationId("https://app.captivationhub.com/v2/?locationId=locFromQuery"),
    ).toBe("locFromQuery");
  });
});

describe("hub session cookies", () => {
  it("reads a Private Integration session from the cookie header", () => {
    const request = new Request("https://example.com/api/pipeline", {
      headers: {
        cookie: "hub_pit=pit-test; hub_location=loc123; hub_pipeline=pipe9",
      },
    });
    expect(configFromRequest(request)).toEqual({
      apiKey: "pit-test",
      locationId: "loc123",
      pipelineId: "pipe9",
    });
    expect(parseCookieHeader("hub_pit=pit-test")["hub_pit"]).toBe("pit-test");
  });
});

describe("explainHubError", () => {
  it("turns Hub HTTP failures into next actions", () => {
    expect(explainHubError(new Error("Captivation Hub request failed (401): nope"))).toMatch(
      /rejected the token/i,
    );
    expect(explainHubError(new Error("Captivation Hub request failed (422): bad"))).toMatch(
      /Location ID/i,
    );
  });
});
