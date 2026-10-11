import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { EMAIL_DIGEST_SCOPE_DECLARED } from "../src/lib/config";
import { hasFileScopePermission } from "../src/lib/fileScope";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "src", "appsscript.json");

const SCOPE = {
  driveFile: "https://www.googleapis.com/auth/drive.file",
  sheetsCurrent: "https://www.googleapis.com/auth/spreadsheets.currentonly",
  containerUi: "https://www.googleapis.com/auth/script.container.ui",
  externalRequest: "https://www.googleapis.com/auth/script.external_request",
  scriptApp: "https://www.googleapis.com/auth/script.scriptapp",
  sendMail: "https://www.googleapis.com/auth/script.send_mail",
} as const;

/** Service token → required oauthScopes (substring match on full URL). */
const SERVICE_RULES: Array<{
  id: string;
  re: RegExp;
  scopes: string[];
  /** Skip this rule when digest is not declared in the manifest. */
  digestOnly?: boolean;
}> = [
  {
    id: "SpreadsheetApp",
    re: /\bSpreadsheetApp\b/,
    scopes: [SCOPE.driveFile, SCOPE.sheetsCurrent],
  },
  {
    id: "UrlFetchApp",
    re: /\bUrlFetchApp\b/,
    scopes: [SCOPE.externalRequest],
  },
  {
    id: "ScriptApp",
    re: /\bScriptApp\b/,
    scopes: [SCOPE.scriptApp],
  },
  {
    id: "HtmlService",
    re: /\bHtmlService\b/,
    scopes: [SCOPE.containerUi],
  },
  {
    id: "requestFileScopeForActiveDocument",
    re: /requestFileScopeForActiveDocument\s*\(/,
    scopes: [SCOPE.driveFile],
  },
  {
    id: "MailApp",
    re: /\bMailApp\b/,
    scopes: [SCOPE.sendMail],
    digestOnly: true,
  },
];

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkTs(full, out);
    else if (name.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function readScopes(): string[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    oauthScopes?: string[];
  };
  return manifest.oauthScopes || [];
}

describe("hasFileScopePermission", () => {
  it("reads sheets.addonHasFileScopePermission", () => {
    assert.equal(hasFileScopePermission(undefined), false);
    assert.equal(hasFileScopePermission({}), false);
    assert.equal(hasFileScopePermission({ sheets: { addonHasFileScopePermission: false } }), false);
    assert.equal(hasFileScopePermission({ sheets: { addonHasFileScopePermission: true } }), true);
  });
});

describe("oauthScopes cover used Apps Script services", () => {
  it("declares drive.file + spreadsheets.currentonly + UI + UrlFetch + ScriptApp", () => {
    const scopes = new Set(readScopes());
    for (const required of [
      SCOPE.driveFile,
      SCOPE.sheetsCurrent,
      SCOPE.containerUi,
      SCOPE.externalRequest,
      SCOPE.scriptApp,
    ]) {
      assert.ok(scopes.has(required), `missing scope ${required}`);
    }
    assert.equal(scopes.has(SCOPE.sendMail), false, "send_mail must stay out of default manifest");
  });

  it("fails if a used service lacks its scope", () => {
    const scopes = readScopes();
    const files = walkTs(path.join(root, "src"));
    const missing: string[] = [];

    for (const rule of SERVICE_RULES) {
      if (rule.digestOnly && !EMAIL_DIGEST_SCOPE_DECLARED) continue;
      let used = false;
      for (const file of files) {
        // Skip type-only / unused digest path when not declared.
        if (!EMAIL_DIGEST_SCOPE_DECLARED && file.endsWith(`${path.sep}emailDigest.ts`)) continue;
        const text = readFileSync(file, "utf8");
        if (rule.re.test(text)) {
          used = true;
          break;
        }
      }
      if (!used) continue;
      for (const need of rule.scopes) {
        if (!scopes.includes(need)) {
          missing.push(`${rule.id} needs ${need}`);
        }
      }
    }

    assert.deepEqual(missing, [], `Scope gaps:\n${missing.join("\n")}`);
  });

  it("homepage requests file scope before SpreadsheetApp (source contract)", () => {
    const main = readFileSync(path.join(root, "src", "main.ts"), "utf8");
    assert.match(main, /hasFileScopePermission/);
    assert.match(main, /requestFileScopeForActiveDocument/);
    assert.match(main, /onRequestFileScope/);
    // onHomepage must branch on file scope before any other work.
    const homepageFn = main.slice(main.indexOf("function onHomepage"));
    const body = homepageFn.slice(0, homepageFn.indexOf("\nfunction "));
    assert.match(body, /hasFileScopePermission/);
    assert.doesNotMatch(body, /SpreadsheetApp/);
  });
});
