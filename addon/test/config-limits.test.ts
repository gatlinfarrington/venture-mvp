import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUSINESS_MAX_STORES,
  EMAIL_DIGEST_SCOPE_DECLARED,
} from "../src/lib/config";

describe("addon limits match /pricing", () => {
  it("Business maxStores is 20", () => {
    assert.equal(BUSINESS_MAX_STORES, 20);
  });

  it("does not declare send_mail digest scope by default", () => {
    assert.equal(EMAIL_DIGEST_SCOPE_DECLARED, false);
  });
});
