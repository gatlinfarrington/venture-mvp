/**
 * Card UI for connected accounts (N per provider). CardService only; actions run as the
 * Google account that opened the Sheet. Keys are never echoed back — only a masked tail.
 */
import { SOURCES, type SourceId } from "../lib/config";
import type { LicenseStatus } from "../lib/license";
import { DEFAULT_STORE_ID, type StoreCredential, type StoresBySource } from "../lib/stores";

export const KEY_HELP: Record<string, { field: string; hint: string }> = {
  stripe: { field: "Restricted key", hint: "rk_live_… with Read on Charges, Subscriptions, Customers, Refunds, Products" },
  lemon_squeezy: { field: "API key", hint: "Lemon Squeezy → Settings → API" },
  polar: { field: "Organization access token", hint: "polar_oat_… with orders, subscriptions, customers, refunds read (sandbox tokens work too)" },
  gumroad: { field: "Access token", hint: "Gumroad → Settings → Advanced → Applications → Generate access token" },
};

export function maskKey(key: string): string {
  const k = String(key || "");
  if (k.length <= 8) return k ? "••••" : "";
  return `${k.slice(0, Math.min(8, k.indexOf("_", 3) + 1 || 4))}••••${k.slice(-4)}`;
}

export function sourceLabel(id: string): string {
  return SOURCES.find((s) => s.id === id)?.label || id;
}

/** Unique, stable id for a new account (first account per source keeps "default"). */
export function newAccountId(existing: StoreCredential[], label: string): string {
  if (!existing.length) return DEFAULT_STORE_ID;
  const base = String(label || "account").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "account";
  const taken = new Set(existing.map((s) => s.id));
  let id = base;
  for (let i = 2; taken.has(id) || id === DEFAULT_STORE_ID; i++) id = `${base}-${i}`;
  return id;
}

function action(fn: string, params: Record<string, string> = {}): GoogleAppsScript.Card_Service.Action {
  return CardService.newAction().setFunctionName(fn).setParameters(params);
}

/** Accounts section for the homepage card. */
export function accountsSection(stores: StoresBySource, license: Pick<LicenseStatus, "maxStores" | "maxSources" | "tier">): GoogleAppsScript.Card_Service.CardSection {
  const section = CardService.newCardSection().setHeader("Accounts");
  let count = 0;
  for (const meta of SOURCES) {
    const list = (stores[meta.id] || []).filter((s) => s.apiKey);
    list.forEach((store, i) => {
      count++;
      const over = i >= license.maxStores;
      section.addWidget(
        CardService.newDecoratedText()
          .setTopLabel(meta.label)
          .setText(`<b>${escapeHtml(store.label)}</b>`)
          .setBottomLabel(over ? `Not syncing · plan allows ${license.maxStores} per source` : maskKey(store.apiKey))
          .setWrapText(true)
          .setButton(
            CardService.newTextButton().setText("Edit").setOnClickAction(action("cardEditAccount", { source: meta.id, id: store.id })),
          ),
      );
    });
  }
  if (!count) {
    section.addWidget(
      CardService.newTextParagraph().setText("No accounts yet. Add Stripe, Lemon Squeezy, Polar or Gumroad — you can connect several accounts per provider."),
    );
  }
  section.addWidget(
    CardService.newTextButton()
      .setText(count ? "Add account" : "Connect an account")
      .setTextButtonStyle(count ? CardService.TextButtonStyle.TEXT : CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action("cardEditAccount", {})),
  );
  return section;
}

/** Add / edit one account. `store` undefined → add mode. */
export function accountEditorCard(
  source: SourceId | "",
  store: StoreCredential | undefined,
  info: { planNote?: string } = {},
): GoogleAppsScript.Card_Service.Card {
  const editing = Boolean(store);
  const card = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle(editing ? `Edit ${sourceLabel(source)} account` : "Connect an account")
      .setSubtitle(editing ? store!.label : "Read-only keys. Stored in your Google user properties."),
  );
  const s = CardService.newCardSection();
  if (!editing) {
    const picker = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setTitle("Provider")
      .setFieldName("source");
    SOURCES.forEach((m, i) => picker.addItem(m.label, m.id, source ? m.id === source : i === SOURCES.length - 1));
    picker.setOnChangeAction(action("cardPickSource"));
    s.addWidget(picker);
  }
  s.addWidget(
    CardService.newTextInput()
      .setFieldName("label")
      .setTitle("Account name")
      .setHint("Shown in the Account column and dashboard, e.g. “Main store”, “EU”")
      .setValue(store?.label || ""),
  );
  const help = KEY_HELP[source || "stripe"];
  s.addWidget(
    CardService.newTextInput()
      .setFieldName("apiKey")
      .setTitle(editing ? `${help.field} (leave blank to keep ${maskKey(store!.apiKey)})` : "API key / token")
      .setHint(help.hint),
  );
  if (info.planNote) s.addWidget(CardService.newTextParagraph().setText(info.planNote));
  const params: Record<string, string> = editing ? { source, id: store!.id } : {};
  const buttons = CardService.newButtonSet().addButton(
    CardService.newTextButton()
      .setText(editing ? "Save changes" : "Connect")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action("cardSaveAccount", params)),
  );
  buttons.addButton(CardService.newTextButton().setText("Cancel").setOnClickAction(action("cardBack")));
  s.addWidget(buttons);
  card.addSection(s);
  if (editing) {
    card.addSection(
      CardService.newCardSection()
        .setHeader("Remove")
        .addWidget(
          CardService.newTextParagraph().setText(
            "Removing disconnects this account and deletes its rows from the data tabs. Other accounts are untouched.",
          ),
        )
        .addWidget(
          CardService.newTextButton()
            .setText(`Remove ${store!.label}`)
            .setOnClickAction(action("cardRemoveAccount", params)),
        ),
    );
  }
  return card.build();
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
