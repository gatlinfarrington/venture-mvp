"""Generate one reconciled example studio for RevenueSheet's hero, /sample and Marketplace shots.
Run: python3 gen_sample_dataset.py  -> sample-dataset.json (asserts every reconciliation check)."""
import json, random, datetime as dt
from collections import Counter, defaultdict
random.seed(16)
AS_OF = dt.datetime(2026, 10, 9, 10, 2)
SOURCES = ["Lemon Squeezy", "Polar", "Gumroad", "Stripe"]
STORE = {"Lemon Squeezy": "example-store", "Polar": "example-org", "Gumroad": "example-seller", "Stripe": "example-acct"}
SRC_W = [0.30, 0.34, 0.16, 0.20]
# Subscription plans: (product, monthly price, yearly price = 10x monthly). All $9 to $49.
PLANS = [("Demo SaaS · Pro", 19), ("Demo SaaS · Team", 49), ("Icon Pack Updates", 9), ("Example Course Membership", 15)]
PLAN_W = [0.42, 0.14, 0.26, 0.18]
ONE_TIME = [("Template Kit", 29), ("Sample Icon Pack", 12), ("Example Course", 49), ("Notion Starter", 19)]
COUNTRIES = ["US", "US", "US", "GB", "DE", "CA", "AU", "NL", "FR", "SE"]
def pick(seq, w): return random.choices(seq, w)[0]
def mo(p, interval): return p if interval == "month" else round(p * 10 / 12, 2)

# ---- subscriptions: simulate Nov 2025 .. as-of
subs = []; cust = 100
def new_sub(created):
    global cust
    prod, price = pick(PLANS, PLAN_W); interval = "year" if random.random() < 0.18 else "month"
    cust += 1
    return dict(source=pick(SOURCES, SRC_W), product=prod, price=price if interval == "month" else price * 10,
                interval=interval, mrr=mo(price, interval), created=created, cancelled=None, status="active",
                email=f"customer{cust}@example.com", country=random.choice(COUNTRIES))
start = dt.datetime(2025, 11, 1)
for i in range(120):  # base before Nov 2025
    s = new_sub(start - dt.timedelta(days=random.randint(5, 400))); subs.append(s)
d = start
while d < AS_OF - dt.timedelta(days=1):
    for _ in range(random.choice([0, 0, 0, 1, 1])):  # ~0.6 new subs/day ~ 18/month
        subs.append(new_sub(d + dt.timedelta(hours=random.randint(8, 22), minutes=random.randint(0, 59))))
    d += dt.timedelta(days=1)
# cancellations: ~3.5% monthly logo churn, monthly subs only cancel; yearly rarely
for s in subs:
    t = max(s["created"], start) + dt.timedelta(days=random.randint(20, 60))
    while t < AS_OF and s["cancelled"] is None:
        if random.random() < (0.022 if s["interval"] == "month" else 0.01):
            s["cancelled"] = t; s["status"] = "canceled"
        t += dt.timedelta(days=30)
# keep the hero window (last 14 orders) free of cancellations
for s in subs:
    if s["cancelled"] and s["cancelled"] > AS_OF - dt.timedelta(days=3): s["cancelled"] -= dt.timedelta(days=5)
# past due: a few live monthly subs
live = [s for s in subs if s["status"] == "active" and s["interval"] == "month" and s["created"] < AS_OF - dt.timedelta(days=40)]
for s in random.sample(live, 5): s["status"] = "past_due"
# trialing: 3 recent ones (not in MRR)
recent = [s for s in subs if s["status"] == "active" and s["created"] > AS_OF - dt.timedelta(days=12)]
for s in recent[:3]: s["status"] = "trialing"
# five new subscriptions in the last ~30h so the hero loop shows real MRR ticks
for h in (29, 22, 15, 9, 3):
    subs.append(new_sub(AS_OF - dt.timedelta(hours=h, minutes=random.randint(0, 50))))
subs.sort(key=lambda s: s["created"], reverse=True)
for i, s in enumerate(subs): s["id"] = f"EXS-{3000 + len(subs) - i}"

def active_at(s, t):  # counted in MRR at time t (status at as-of only matters for the final point)
    if s["created"] > t or (s["cancelled"] and s["cancelled"] <= t): return False
    if t >= AS_OF: return s["status"] == "active"
    return True
def mrr_at(t, src=None): return round(sum(s["mrr"] for s in subs if active_at(s, t) and (src is None or s["source"] == src)), 2)

# ---- orders in the last 30 days: renewals, new-sub first charges, one-time sales, refunds
W0 = AS_OF - dt.timedelta(days=30); orders = []
for s in subs:
    if s["status"] in ("canceled",) and s["cancelled"] <= W0: continue
    # first charge (new sub) or monthly renewal on the anniversary day inside the window
    if s["status"] == "trialing": continue
    if W0 < s["created"] <= AS_OF:
        orders.append(dict(t=s["created"], source=s["source"], product=s["product"], amount=s["price"], kind="new_sub", sub=s["id"], mrr_delta=s["mrr"], email=s["email"], country=s["country"]))
    elif s["interval"] == "month" and s["status"] != "past_due":
        day = min(s["created"].day, 28); t = AS_OF.replace(day=day, hour=s["created"].hour, minute=s["created"].minute)
        if t > AS_OF: t = (t.replace(day=1) - dt.timedelta(days=1)).replace(day=day)
        if W0 < t <= AS_OF and not (s["cancelled"] and s["cancelled"] <= t):
            orders.append(dict(t=t, source=s["source"], product=s["product"], amount=s["price"], kind="renewal", sub=s["id"], mrr_delta=0, email=s["email"], country=s["country"]))
    elif s["interval"] == "year":
        t = s["created"].replace(year=2026) if s["created"].year < 2026 else None
        if t and W0 < t <= AS_OF and not s["cancelled"]:
            orders.append(dict(t=t, source=s["source"], product=s["product"], amount=s["price"], kind="renewal", sub=s["id"], mrr_delta=0, email=s["email"], country=s["country"]))
t = W0
while t < AS_OF:
    for _ in range(random.choice([1, 2, 2, 3])):
        p, a = random.choice(ONE_TIME); cust += 1
        tt = t + dt.timedelta(hours=random.randint(7, 23), minutes=random.randint(0, 59))
        if tt < AS_OF: orders.append(dict(t=tt, source=pick(SOURCES, SRC_W), product=p, amount=a, kind="one_time", sub=None, mrr_delta=0, email=f"customer{cust}@example.com", country=random.choice(COUNTRIES)))
    t += dt.timedelta(days=1)
orders.sort(key=lambda o: o["t"], reverse=True)
# hero window: force the newest 14 to include 5 new-sub charges spread through the loop
hero = orders[:14]
assert sum(1 for o in hero if o["kind"] == "new_sub") >= 3, "hero window needs visible MRR ticks; reseed"
for i, o in enumerate(orders): o["id"] = f"EX-{10000 + len(orders) - i}"
for o in orders: o["status"] = "paid"
for o in random.sample([o for o in orders[20:] if o["kind"] == "one_time"], 4): o["status"] = "refunded"

# ---- headline numbers
MRR = mrr_at(AS_OF)
active = [s for s in subs if s["status"] == "active"]
assert abs(MRR - round(sum(s["mrr"] for s in active), 2)) < 0.01, "MRR != sum of active subs"
by_src = {k: mrr_at(AS_OF, k) for k in SOURCES}
assert abs(sum(by_src.values()) - MRR) < 0.01, "sources do not sum to MRR"
months = []
for y, m in [(2025, 11), (2025, 12)] + [(2026, k) for k in range(1, 11)]:
    end = AS_OF if (y, m) == (2026, 10) else (dt.datetime(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(seconds=1))
    months.append(dict(month=dt.date(y, m, 1).strftime("%b %Y"), **{k: round(mrr_at(end, k)) for k in SOURCES}))
for row in months: row["total"] = sum(row[k] for k in SOURCES)
assert abs(months[-1]["total"] - MRR) <= 2, "12-month series must end at current MRR (rounding <= $2)"
# round per-source so the displayed series ends exactly at displayed MRR
months[-1].update({k: round(by_src[k]) for k in SOURCES}); months[-1]["total"] = sum(months[-1][k] for k in SOURCES)
MRR_DISPLAY = months[-1]["total"]
assert abs(MRR_DISPLAY - MRR) < 2
paid = [o for o in orders if o["status"] == "paid"]; ref = [o for o in orders if o["status"] == "refunded"]
NET30 = sum(o["amount"] for o in paid) - 0  # refunded orders are excluded (gross of refunds = paid only)
start_active = [s for s in subs if s["created"] <= W0 and (not s["cancelled"] or s["cancelled"] > W0)]
churned = [s for s in start_active if s["cancelled"] and W0 < s["cancelled"] <= AS_OF]
CHURN = round(100 * len(churned) / len(start_active), 1)
past_due = [s for s in subs if s["status"] == "past_due"]
PD_MRR = round(sum(s["mrr"] for s in past_due), 2)
prev30 = mrr_at(AS_OF - dt.timedelta(days=30)); MOM = round(100 * (MRR - prev30) / prev30, 1)  # vs 30 days ago, like the add-on
FINAL_MRR = MRR_DISPLAY; START_MRR = round(FINAL_MRR - sum(o["mrr_delta"] for o in hero), 2)
assert START_MRR < FINAL_MRR
# hero loop rows
fmt = lambda o: dict(id=o["id"], created=o["t"].strftime("%Y-%m-%d %H:%M"), source=o["source"], product=o["product"], email=o["email"], amount=o["amount"], status=o["status"], country=o["country"], kind=o["kind"], mrrDelta=o["mrr_delta"])
ORD = [fmt(o) for o in orders]
ids = [o["id"] for o in ORD]; assert len(ids) == len(set(ids))
src_orders = Counter(o["source"] for o in orders)
assert sum(src_orders.values()) == len(orders)
src_active = Counter(s["source"] for s in active); assert sum(src_active.values()) == len(active)
out = dict(
  asOf=AS_OF.strftime("%Y-%m-%d %H:%M"), studio="Example Studio", currency="USD",
  stores=STORE,
  headline=dict(mrr=MRR_DISPLAY, mrrExact=MRR, mrrMoMPct=MOM, net30d=NET30, refunds30dCount=len(ref), refunds30dAmount=sum(o["amount"] for o in ref),
                activeSubs=len(active), trialingSubs=sum(s["status"] == "trialing" for s in subs), churn30dPct=CHURN, churned30d=len(churned), activeAtWindowStart=len(start_active),
                pastDueCount=len(past_due), pastDueMrr=PD_MRR, orders30d=len(orders)),
  bySource={k: dict(mrr=round(by_src[k]), activeSubs=src_active[k], orders30d=src_orders[k]) for k in SOURCES},
  mrrByMonth=months,
  hero=dict(startMrr=START_MRR, finalMrr=FINAL_MRR, seedIds=ids[14:23], landingIds=list(reversed(ids[:14])), finalIds=ids[:9],
            landings=[dict(id=o["id"], source=o["source"], product=o["product"], amount=o["amount"], kind=o["kind"], mrrDelta=o["mrr_delta"]) for o in reversed(orders[:14])]),
  orders=ORD,
  subscriptions=[dict(id=s["id"], created=s["created"].strftime("%Y-%m-%d"), source=s["source"], product=s["product"], email=s["email"], price=s["price"], interval=s["interval"], mrr=s["mrr"], status=s["status"], cancelled=s["cancelled"].strftime("%Y-%m-%d") if s["cancelled"] else "", country=s["country"]) for s in subs],
)
# final re-check from the emitted JSON
assert abs(sum(s["mrr"] for s in out["subscriptions"] if s["status"] == "active") - MRR) < 0.01
assert sum(v["mrr"] for v in out["bySource"].values()) == out["mrrByMonth"][-1]["total"] == out["headline"]["mrr"]
assert round(out["hero"]["startMrr"] + sum(l["mrrDelta"] for l in out["hero"]["landings"]), 2) == out["hero"]["finalMrr"]
assert all(9 <= p <= 49 for _, p in PLANS + ONE_TIME)
assert 1 <= MOM <= 8 and 1 <= CHURN <= 4.5, "keep it believable for an indie studio"
out["headline"]["mrr30dAgo"] = round(prev30, 2)
json.dump(out, open("sample-dataset.json", "w"), indent=1)
h = out["headline"]; print(json.dumps(h, indent=1)); print(json.dumps(out["bySource"])); print([m["total"] for m in months]); print(out["hero"]["startMrr"], out["hero"]["finalMrr"], [(l["id"], l["kind"], l["mrrDelta"]) for l in out["hero"]["landings"]]); print("subs", len(subs), "ALL CHECKS PASS")

