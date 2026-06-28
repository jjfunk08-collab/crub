"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Anchor, Home, CalendarDays, Compass, Receipt, MessageCircle,
  Plus, X, Check, CheckCheck, Clock, MapPin, ArrowRight,
  ChevronRight, Bell, BarChart3, Trash2, LogOut, Send,
  PartyPopper, Sparkles
} from "lucide-react";

/* ============================================================
   CREW HUB  —  a private hub for you and your friends
   Change the passcode and starter names right here:
   ============================================================ */
const PASSCODE = "1250";
const SEED_NAMES = ["JJ", "Gabe", "Lucas", "Max", "Ted"];
const APP_NAME = "Crew Hub";

/* ---------- shared storage (server-backed via /api/storage) ---------- */
const K = {
  roster: "crew:roster",
  events: "crew:events",
  expenses: "crew:expenses",
  settlements: "crew:settlements",
  chat: "crew:chat",
  polls: "crew:polls",
};
const ALL_KEYS = [K.roster, K.events, K.expenses, K.settlements, K.chat, K.polls];

async function api(action, payload) {
  const r = await fetch("/api/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!r.ok) throw new Error("storage " + r.status);
  return r.json();
}
const sGet = async (key) => { try { const d = await api("get", { key }); return d.value ?? null; } catch { return null; } };
const sSet = async (key, val) => { try { await api("set", { key, value: val }); return true; } catch { return false; } };
const sMget = async (keys) => { try { const d = await api("mget", { keys }); return d.values || []; } catch { return []; } };

/* ---------- personal identity (this device only) ---------- */
const getMe = () => { try { return localStorage.getItem("crew:me"); } catch { return null; } };
const saveMe = (n) => { try { if (n) localStorage.setItem("crew:me", n); else localStorage.removeItem("crew:me"); } catch {} };

/* ---------- curated Northeast events (verify dates each year) ---------- */
const CURATED = [
  { st: "RI", name: "WaterFire Providence", when: "May–Oct nights", where: "Providence", blurb: "Braziers set the downtown rivers ablaze. Free, atmospheric, very RI." },
  { st: "RI", name: "Newport Folk Festival", when: "Late July", where: "Fort Adams, Newport", blurb: "Legendary folk & Americana lineup right on the harbor." },
  { st: "RI", name: "Bristol Fourth of July", when: "July 4", where: "Bristol", blurb: "The oldest continuous Independence Day celebration in the country." },
  { st: "RI", name: "Newport Jazz Festival", when: "Early August", where: "Newport", blurb: "World-class jazz by the water — a summer institution." },
  { st: "MA", name: "Boston Calling", when: "Late May", where: "Allston", blurb: "Three-day music festival at the Harvard Athletic Complex." },
  { st: "MA", name: "Head of the Charles", when: "October", where: "Boston / Cambridge", blurb: "The world's largest rowing regatta, with riverbank crowds." },
  { st: "MA", name: "Salem Haunted Happenings", when: "All October", where: "Salem", blurb: "A month of Halloween everything in the witch city." },
  { st: "MA", name: "Boston Marathon", when: "April (Patriots' Day)", where: "Hopkinton → Boston", blurb: "Cheer the runners or just claim a good spot on the route." },
  { st: "CT", name: "Mystic Seaport", when: "Year-round", where: "Mystic", blurb: "Maritime museum, tall ships, and a postcard seaside village." },
  { st: "CT", name: "Durham Fair", when: "Late September", where: "Durham", blurb: "Connecticut's largest agricultural fair — rides, animals, fried everything." },
  { st: "CT", name: "Foxwoods / Mohegan Sun", when: "Year-round", where: "SE Connecticut", blurb: "Big-name concerts, comedy, and shows under one roof." },
  { st: "CT", name: "New Haven apizza crawl", when: "Anytime", where: "New Haven", blurb: "Pepe's, Sally's, Modern — settle the great coal-fired debate." },
  { st: "NY", name: "Saratoga Race Course", when: "Jul–Sep", where: "Saratoga Springs", blurb: "Historic summer thoroughbred meet; dress up, place a bet." },
  { st: "NY", name: "Governors Ball", when: "June", where: "NYC", blurb: "New York's marquee summer music festival." },
  { st: "NY", name: "US Open Tennis", when: "Aug–Sep", where: "Flushing, Queens", blurb: "Grand Slam tennis with a famous night-session atmosphere." },
  { st: "NY", name: "Hudson Valley foliage", when: "October", where: "Hudson Valley", blurb: "Leaf-peeping, orchards, and cider weekends up the river." },
];
const STATE_NAMES = { RI: "Rhode Island", MA: "Massachusetts", CT: "Connecticut", NY: "New York" };

/* ---------- small utils ---------- */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const money = (n) => "$" + (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
const initials = (n) => (n || "?").trim().slice(0, 2).toUpperCase();
const todayISO = () => new Date().toISOString().slice(0, 10);
function prettyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}
const PALETTE = ["#20707A", "#E36B4E", "#3F9B7C", "#7C6BD6", "#D8943A", "#2F7FB0", "#C25A7E", "#5E8C3E"];
const colorFor = (name) => {
  let h = 0; for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

/* ============================================================
   ROOT
   ============================================================ */
export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("home");

  const [roster, setRoster] = useState(SEED_NAMES);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [chat, setChat] = useState([]);
  const [polls, setPolls] = useState([]);

  const loadAll = useCallback(async () => {
    const [r, e, x, st, c, p] = await sMget(ALL_KEYS);
    if (r && r.length) setRoster(r); else if (r == null) sSet(K.roster, SEED_NAMES);
    setEvents(e || []); setExpenses(x || []); setSettlements(st || []);
    setChat(c || []); setPolls(p || []);
  }, []);

  // boot
  useEffect(() => {
    (async () => {
      setMe(getMe());
      await loadAll();
      setReady(true);
    })();
  }, [loadAll]);

  // live refresh (only while the tab is visible, to be gentle on the free tier)
  useEffect(() => {
    if (!me) return;
    const tick = () => { if (document.visibilityState === "visible") loadAll(); };
    const id = setInterval(tick, 6000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [me, loadAll]);

  const chooseMe = (name) => { setMe(name); saveMe(name); };
  const signOut = () => { saveMe(null); setMe(null); setTab("home"); };

  const addMember = async (name) => {
    const clean = name.trim(); if (!clean || roster.includes(clean)) return;
    const next = [...roster, clean]; setRoster(next); await sSet(K.roster, next);
  };

  // mutation helper: read latest, modify, write back, update local state
  const mutate = useCallback(async (key, setter, fn) => {
    const current = (await sGet(key)) || [];
    const next = fn(current);
    setter(next); await sSet(key, next);
  }, []);

  if (!ready) {
    return (
      <div className="ch-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Anchor size={30} color="var(--harbor)" />
      </div>
    );
  }
  if (!me) return <Lock onPick={chooseMe} roster={roster} onAdd={addMember} />;

  const pendingForMe = settlements.filter((s) => s.status === "pending" && approverOf(s) === me).length;

  const shared = {
    me, roster, events, expenses, settlements, chat, polls,
    setEvents, setExpenses, setSettlements, setChat, setPolls, mutate, addMember,
  };

  return (
    <div className="ch-root">
      <div className="ch-shell">
        <header className="ch-header">
          <div className="ch-brand">
            <div className="ch-brand-badge"><Anchor size={18} /></div>
            <div>
              <h1 className="ch-display">{APP_NAME}</h1>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>RI · MA · CT · NY crew</div>
            </div>
          </div>
          <button className="ch-mepill" onClick={signOut} title="Not you? Switch">
            <Avatar name={me} size={26} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{me}</span>
            <LogOut size={13} color="var(--muted)" />
          </button>
        </header>

        <div className="ch-scroll">
          {tab === "home" && <HomeTab {...shared} go={setTab} />}
          {tab === "calendar" && <CalendarTab {...shared} />}
          {tab === "events" && <EventsTab {...shared} />}
          {tab === "money" && <MoneyTab {...shared} />}
          {tab === "chat" && <ChatTab {...shared} />}
        </div>

        <nav className="ch-nav">
          <div className="ch-nav-inner">
            <NavBtn id="home" tab={tab} set={setTab} icon={Home} label="Home" />
            <NavBtn id="calendar" tab={tab} set={setTab} icon={CalendarDays} label="Calendar" />
            <NavBtn id="events" tab={tab} set={setTab} icon={Compass} label="Events" />
            <NavBtn id="money" tab={tab} set={setTab} icon={Receipt} label="Money" badge={pendingForMe} />
            <NavBtn id="chat" tab={tab} set={setTab} icon={MessageCircle} label="Chat" />
          </div>
        </nav>
      </div>
    </div>
  );
}

/* ---------- shared little components ---------- */
function Avatar({ name, size = 30 }) {
  return (
    <div className="ch-avatar" style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  );
}
function NavBtn({ id, tab, set, icon: Icon, label, badge }) {
  return (
    <button className={"ch-tab" + (tab === id ? " on" : "")} onClick={() => set(id)} aria-label={label}>
      <div className="ch-tab-ico"><Icon size={19} /></div>
      {label}
      {badge > 0 && <span className="dot" />}
    </button>
  );
}
function Sheet({ title, onClose, children }) {
  return (
    <div className="ch-sheet-bg" onClick={onClose}>
      <div className="ch-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="ch-display" style={{ fontSize: 20, margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="ch-avatar" style={{ width: 30, height: 30, background: "#fff", color: "var(--slate)", border: "1px solid var(--line)" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   LOCK SCREEN
   ============================================================ */
function Lock({ onPick, roster, onAdd }) {
  const [pin, setPin] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  const [newName, setNewName] = useState("");

  const submit = () => {
    if (pin === PASSCODE) { setOk(true); setErr(false); }
    else { setErr(true); setPin(""); }
  };

  return (
    <div className="ch-root">
      <div className="ch-lock">
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div className="ch-brand-badge" style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px" }}>
            <Anchor size={28} />
          </div>
          <h1 className="ch-display" style={{ fontSize: 34, margin: "0 0 6px" }}>{APP_NAME}</h1>
          <p style={{ color: "var(--slate)", margin: 0, fontSize: 14 }}>
            One spot for the crew — plans, events, and who owes who.
          </p>
        </div>

        {!ok ? (
          <>
            <label className="ch-label" style={{ textAlign: "center" }}>Enter the passcode</label>
            <input
              className="ch-pin ch-mono" value={pin} inputMode="numeric" autoFocus
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••"
            />
            {err && <p style={{ color: "var(--coral)", textAlign: "center", fontSize: 13, marginTop: 10, fontWeight: 600 }}>That code didn&apos;t work. Try again.</p>}
            <button className="ch-btn harbor" style={{ width: "100%", marginTop: 16 }} onClick={submit} disabled={!pin}>
              Unlock <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <label className="ch-label" style={{ textAlign: "center" }}>Tap your name</label>
            <div className="ch-namegrid">
              {roster.map((n) => (
                <button key={n} className="ch-namebtn" onClick={() => onPick(n)}>
                  <Avatar name={n} size={30} /> {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input className="ch-input" placeholder="New here? Add your name"
                value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { onAdd(newName); onPick(newName.trim()); } }} />
              <button className="ch-btn" onClick={() => { if (newName.trim()) { onAdd(newName); onPick(newName.trim()); } }}><Plus size={16} /></button>
            </div>
          </>
        )}
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, marginTop: 28 }}>
          No account, no app store. Add to your home screen for an app icon.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   MONEY MATH  (balances + settlements with dual approval)
   ============================================================ */
function approverOf(s) {
  return s.initiatedBy === s.from ? s.to : s.from;
}
function computeBalances(expenses, settlements, roster) {
  const bal = {}; roster.forEach((n) => (bal[n] = 0));
  const ensure = (n) => { if (!(n in bal)) bal[n] = 0; };
  expenses.forEach((e) => {
    const parts = e.split.filter(Boolean);
    if (!parts.length) return;
    const share = e.amount / parts.length;
    ensure(e.paidBy); bal[e.paidBy] += e.amount;
    parts.forEach((p) => { ensure(p); bal[p] -= share; });
  });
  settlements.filter((s) => s.status === "confirmed").forEach((s) => {
    ensure(s.from); ensure(s.to);
    bal[s.from] += s.amount;
    bal[s.to] -= s.amount;
  });
  return bal;
}
function computePairs(expenses, settlements, roster) {
  const owe = {};
  const add = (a, b, v) => { owe[a] = owe[a] || {}; owe[a][b] = (owe[a][b] || 0) + v; };
  expenses.forEach((e) => {
    const parts = e.split.filter((p) => p);
    if (!parts.length) return;
    const share = e.amount / parts.length;
    parts.forEach((p) => { if (p !== e.paidBy) add(p, e.paidBy, share); });
  });
  settlements.filter((s) => s.status === "confirmed").forEach((s) => add(s.from, s.to, -s.amount));
  const out = [];
  const seen = new Set();
  roster.forEach((a) => roster.forEach((b) => {
    if (a === b) return;
    const key = [a, b].sort().join("|");
    if (seen.has(key)) return; seen.add(key);
    const ab = (owe[a]?.[b] || 0), ba = (owe[b]?.[a] || 0);
    const net = ab - ba;
    if (Math.abs(net) < 0.01) return;
    if (net > 0) out.push({ debtor: a, creditor: b, amount: net });
    else out.push({ debtor: b, creditor: a, amount: -net });
  }));
  return out;
}

/* ============================================================
   HOME
   ============================================================ */
function HomeTab({ me, events, expenses, settlements, chat, polls, roster, go, mutate, setPolls }) {
  const bal = useMemo(() => computeBalances(expenses, settlements, roster), [expenses, settlements, roster]);
  const myBal = bal[me] || 0;
  const upcoming = useMemo(() =>
    [...events].filter((e) => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    [events]);
  const pending = settlements.filter((s) => s.status === "pending" && approverOf(s) === me);
  const lastMsg = chat[chat.length - 1];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const vote = (pollId, optId) => mutate(K.polls, setPolls, (cur) =>
    cur.map((p) => p.id !== pollId ? p : ({
      ...p, options: p.options.map((o) => ({
        ...o, votes: o.id === optId ? Array.from(new Set([...o.votes, me])) : o.votes.filter((v) => v !== me),
      })),
    })));

  return (
    <div>
      <h2 className="ch-display" style={{ fontSize: 26, margin: "20px 0 4px" }}>{greet}, {me}.</h2>
      <p style={{ color: "var(--slate)", margin: "0 0 16px" }}>Here&apos;s what&apos;s happening with the crew.</p>

      <button className="ch-balance-hero" style={{ width: "100%", textAlign: "left" }} onClick={() => go("money")}>
        <div style={{ fontSize: 12, opacity: .8, fontWeight: 700, letterSpacing: ".06em" }}>YOUR BALANCE</div>
        <div className="ch-display ch-mono" style={{ fontSize: 34, marginTop: 4, color: myBal >= 0 ? "#9be8c8" : "#ffb59f" }}>
          {myBal >= 0 ? "+" : "−"}{money(Math.abs(myBal))}
        </div>
        <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>
          {Math.abs(myBal) < 0.01 ? "You're all squared up 🎉" : myBal > 0 ? "the crew owes you, net" : "you owe the crew, net"}
          <ChevronRight size={14} style={{ verticalAlign: "-2px", marginLeft: 2 }} />
        </div>
      </button>

      {pending.length > 0 && (
        <div className="ch-card" style={{ marginTop: 14, padding: 14, borderColor: "rgba(227,107,78,.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Bell size={16} color="var(--coral)" />
            <strong style={{ fontSize: 14 }}>Needs your approval</strong>
          </div>
          {pending.map((s) => (
            <div key={s.id} style={{ fontSize: 13, color: "var(--slate)", marginBottom: 6 }}>
              {s.initiatedBy === s.from
                ? `${s.from} says they paid you ${money(s.amount)}`
                : `${s.to} marked your ${money(s.amount)} as received`}
            </div>
          ))}
          <button className="ch-btn coral sm" style={{ marginTop: 4 }} onClick={() => go("money")}>Review in Money</button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 className="ch-sec-title" style={{ marginBottom: 8 }}>Coming up</h3>
        <button onClick={() => go("calendar")} style={{ color: "var(--harbor)", fontWeight: 700, fontSize: 13 }}>All plans</button>
      </div>
      {upcoming.length === 0 ? (
        <div className="ch-card ch-empty" style={{ padding: 22 }}>
          Nothing on the books. <button onClick={() => go("calendar")} style={{ color: "var(--harbor)", fontWeight: 700 }}>Add a plan →</button>
        </div>
      ) : (
        <div className="ch-card">
          {upcoming.map((e) => (
            <div key={e.id} className="ch-row">
              <DateChip iso={e.date} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 10 }}>
                  {e.time && <span><Clock size={11} style={{ verticalAlign: "-1px" }} /> {e.time}</span>}
                  {e.location && <span><MapPin size={11} style={{ verticalAlign: "-1px" }} /> {e.location}</span>}
                </div>
              </div>
              <div style={{ display: "flex" }}>
                {e.rsvps.slice(0, 3).map((n, i) => (
                  <div key={n} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={n} size={24} /></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="ch-sec-title">Crew polls</h3>
      {polls.length === 0 ? (
        <div className="ch-card ch-empty" style={{ padding: 22 }}>
          No polls yet — start one in <button onClick={() => go("chat")} style={{ color: "var(--harbor)", fontWeight: 700 }}>Chat</button> to settle a debate.
        </div>
      ) : (
        polls.slice(-2).reverse().map((p) => {
          const total = p.options.reduce((s, o) => s + o.votes.length, 0) || 1;
          return (
            <div key={p.id} className="ch-card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{p.q}</div>
              {p.options.map((o) => {
                const mine = o.votes.includes(me);
                return (
                  <button key={o.id} onClick={() => vote(p.id, o.id)} style={{ width: "100%", marginBottom: 7 }}>
                    <div className="ch-poll-bar" style={{ borderColor: mine ? "var(--harbor)" : "var(--line)" }}>
                      <div className="ch-poll-fill" style={{ width: `${(o.votes.length / total) * 100}%` }} />
                      <span style={{ position: "relative", display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{mine && <Check size={14} style={{ verticalAlign: "-2px", color: "var(--harbor)" }} />} {o.text}</span>
                        <span className="ch-mono" style={{ color: "var(--slate)" }}>{o.votes.length}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}

      {lastMsg && (
        <>
          <h3 className="ch-sec-title">Latest chat</h3>
          <button className="ch-card ch-row" style={{ width: "100%", textAlign: "left" }} onClick={() => go("chat")}>
            <Avatar name={lastMsg.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{lastMsg.name}</div>
              <div style={{ fontSize: 13, color: "var(--slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastMsg.text}</div>
            </div>
            <ChevronRight size={18} color="var(--muted)" />
          </button>
        </>
      )}
      <div style={{ height: 8 }} />
    </div>
  );
}
function DateChip({ iso }) {
  const d = new Date(iso + "T00:00:00");
  return (
    <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--ink)", color: "#F4EDDF", display: "grid", placeItems: "center", flex: "none" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", opacity: .8 }}>{d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</div>
      <div className="ch-display" style={{ fontSize: 19, lineHeight: 1 }}>{d.getDate()}</div>
    </div>
  );
}

/* ============================================================
   CALENDAR
   ============================================================ */
function CalendarTab({ me, events, roster, setEvents, mutate }) {
  const [open, setOpen] = useState(false);
  const upcoming = useMemo(() =>
    [...events].filter((e) => e.date >= todayISO()).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))),
    [events]);
  const past = useMemo(() => [...events].filter((e) => e.date < todayISO()).sort((a, b) => b.date.localeCompare(a.date)), [events]);

  const toggleRsvp = (id) => mutate(K.events, setEvents, (cur) =>
    cur.map((e) => e.id !== id ? e : ({
      ...e, rsvps: e.rsvps.includes(me) ? e.rsvps.filter((n) => n !== me) : [...e.rsvps, me],
    })));
  const remove = (id) => mutate(K.events, setEvents, (cur) => cur.filter((e) => e.id !== id));
  const add = (ev) => mutate(K.events, setEvents, (cur) => [...cur, ev]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <h2 className="ch-display" style={{ fontSize: 26, margin: 0 }}>Calendar</h2>
        <button className="ch-btn harbor sm" onClick={() => setOpen(true)}><Plus size={16} /> Add plan</button>
      </div>
      <p style={{ color: "var(--slate)", margin: "4px 0 14px" }}>Shared plans for the crew. Tap to RSVP.</p>

      {upcoming.length === 0 && <div className="ch-card ch-empty" style={{ padding: 30 }}>No upcoming plans yet.<br />Hit <strong>Add plan</strong> to get the first one going.</div>}

      {upcoming.map((e) => (
        <EventCard key={e.id} e={e} me={me} onRsvp={() => toggleRsvp(e.id)} onDelete={() => remove(e.id)} />
      ))}

      {past.length > 0 && (
        <>
          <h3 className="ch-eyebrow" style={{ margin: "22px 0 10px" }}>Past</h3>
          {past.slice(0, 6).map((e) => (
            <div key={e.id} className="ch-card ch-row" style={{ marginBottom: 8, opacity: .6 }}>
              <DateChip iso={e.date} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.rsvps.length} went</div></div>
            </div>
          ))}
        </>
      )}

      {open && <AddEventSheet me={me} roster={roster} onClose={() => setOpen(false)} onAdd={(ev) => { add(ev); setOpen(false); }} />}
    </div>
  );
}
function EventCard({ e, me, onRsvp, onDelete }) {
  const going = e.rsvps.includes(me);
  return (
    <div className="ch-card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <DateChip iso={e.date} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }} className="ch-display">{e.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 12, marginTop: 3 }}>
            {e.time && <span><Clock size={12} style={{ verticalAlign: "-2px" }} /> {e.time}</span>}
            {e.location && <span><MapPin size={12} style={{ verticalAlign: "-2px" }} /> {e.location}</span>}
          </div>
          {e.notes && <p style={{ fontSize: 13, color: "var(--slate)", margin: "8px 0 0" }}>{e.notes}</p>}
        </div>
        {e.createdBy === me && (
          <button onClick={onDelete} style={{ color: "var(--muted)", padding: 4, height: "fit-content" }}><Trash2 size={15} /></button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex" }}>
            {e.rsvps.slice(0, 5).map((n, i) => <div key={n} style={{ marginLeft: i ? -8 : 0 }}><Avatar name={n} size={26} /></div>)}
          </div>
          <span style={{ fontSize: 12.5, color: "var(--slate)", fontWeight: 600 }}>
            {e.rsvps.length ? `${e.rsvps.length} going` : "Nobody yet"}
          </span>
        </div>
        <button className={"ch-btn sm " + (going ? "glass" : "ghost")} onClick={onRsvp}>
          {going ? <><Check size={15} /> Going</> : "I'm in"}
        </button>
      </div>
    </div>
  );
}
function AddEventSheet({ me, roster, onClose, onAdd, prefill }) {
  const [title, setTitle] = useState(prefill?.title || "");
  const [date, setDate] = useState(prefill?.date || todayISO());
  const [time, setTime] = useState("");
  const [location, setLocation] = useState(prefill?.location || "");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const submit = () => {
    if (!title.trim() || !date) return;
    onAdd({ id: uid(), title: title.trim(), date, time, location: location.trim(), notes: notes.trim(), createdBy: me, rsvps: [me] });
  };
  return (
    <Sheet title="Add a plan" onClose={onClose}>
      <label className="ch-label">What&apos;s the plan?</label>
      <input className="ch-input" autoFocus placeholder="Dinner at Federal Hill" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}><label className="ch-label">Date</label><input type="date" className="ch-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label className="ch-label">Time</label><input type="time" className="ch-input" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      <label className="ch-label" style={{ marginTop: 12 }}>Where</label>
      <input className="ch-input" placeholder="Providence, RI" value={location} onChange={(e) => setLocation(e.target.value)} />
      <label className="ch-label" style={{ marginTop: 12 }}>Notes (optional)</label>
      <textarea className="ch-input" rows={2} placeholder="Bring cash, parking is rough" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="ch-btn harbor" style={{ width: "100%", marginTop: 16 }} onClick={submit} disabled={!title.trim()}>Add to calendar</button>
    </Sheet>
  );
}

/* ============================================================
   EVENTS  (curated Northeast guide → add to shared calendar)
   ============================================================ */
function EventsTab({ me, roster, setEvents, mutate }) {
  const [st, setSt] = useState("ALL");
  const [picked, setPicked] = useState(null);
  const list = CURATED.filter((e) => st === "ALL" || e.st === st);
  const add = (ev) => mutate(K.events, setEvents, (cur) => [...cur, ev]);

  return (
    <div>
      <h2 className="ch-display" style={{ fontSize: 26, margin: "18px 0 4px" }}>Around the region</h2>
      <p style={{ color: "var(--slate)", margin: "0 0 12px" }}>
        Notable happenings across RI, MA, CT &amp; NY. Found one? Drop it on the crew calendar.
      </p>
      <div className="ch-statebar">
        {["ALL", "RI", "MA", "CT", "NY"].map((s) => (
          <button key={s} className={"ch-segbtn" + (st === s ? " on" : "")} onClick={() => setSt(s)}>
            {s === "ALL" ? "All" : s}
          </button>
        ))}
      </div>

      {list.map((e, i) => (
        <div key={i} className="ch-card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <span className="ch-chip" style={{ marginBottom: 8 }}><MapPin size={12} /> {STATE_NAMES[e.st]}</span>
              <div className="ch-display" style={{ fontSize: 17, fontWeight: 700 }}>{e.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{e.when} · {e.where}</div>
              <p style={{ fontSize: 13.5, color: "var(--slate)", margin: "8px 0 0" }}>{e.blurb}</p>
            </div>
          </div>
          <button className="ch-btn ghost sm" style={{ marginTop: 12 }} onClick={() => setPicked(e)}>
            <Plus size={15} /> Add to our calendar
          </button>
        </div>
      ))}

      <div className="ch-card" style={{ padding: 14, marginTop: 4, background: "rgba(32,112,122,.06)", borderColor: "rgba(32,112,122,.2)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Sparkles size={16} color="var(--harbor)" style={{ flex: "none", marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: "var(--slate)", margin: 0 }}>
            This is a hand-picked guide of recurring regional events — exact dates shift each year, so double-check before you commit. Adding one lets you pick the real date for your crew.
          </p>
        </div>
      </div>

      {picked && (
        <AddEventSheet me={me} roster={roster} onClose={() => setPicked(null)}
          prefill={{ title: picked.name, location: `${picked.where}, ${picked.st}`, notes: picked.blurb }}
          onAdd={(ev) => { add(ev); setPicked(null); }} />
      )}
    </div>
  );
}

/* ============================================================
   MONEY  (expenses + dual-approval settle up)
   ============================================================ */
function MoneyTab({ me, roster, expenses, settlements, setExpenses, setSettlements, mutate }) {
  const [addOpen, setAddOpen] = useState(false);
  const [settleWith, setSettleWith] = useState(null);

  const bal = useMemo(() => computeBalances(expenses, settlements, roster), [expenses, settlements, roster]);
  const pairs = useMemo(() => computePairs(expenses, settlements, roster), [expenses, settlements, roster]);
  const myBal = bal[me] || 0;

  const myPairs = pairs.filter((p) => p.debtor === me || p.creditor === me);
  const pendingMine = settlements.filter((s) => s.status === "pending" && (s.from === me || s.to === me));

  const addExpense = (x) => mutate(K.expenses, setExpenses, (cur) => [...cur, x]);
  const deleteExpense = (id) => mutate(K.expenses, setExpenses, (cur) => cur.filter((e) => e.id !== id));
  const createSettlement = (s) => mutate(K.settlements, setSettlements, (cur) => [...cur, s]);
  const confirmSettlement = (id) => mutate(K.settlements, setSettlements, (cur) =>
    cur.map((s) => s.id === id ? { ...s, status: "confirmed", confirmedAt: Date.now() } : s));
  const declineSettlement = (id) => mutate(K.settlements, setSettlements, (cur) => cur.filter((s) => s.id !== id));

  const recentExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <h2 className="ch-display" style={{ fontSize: 26, margin: 0 }}>Money</h2>
        <button className="ch-btn coral sm" onClick={() => setAddOpen(true)}><Plus size={16} /> Add expense</button>
      </div>

      <div className="ch-balance-hero" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, opacity: .8, fontWeight: 700, letterSpacing: ".06em" }}>YOUR NET BALANCE</div>
        <div className="ch-display ch-mono" style={{ fontSize: 36, marginTop: 4, color: myBal >= 0 ? "#9be8c8" : "#ffb59f" }}>
          {myBal >= 0 ? "+" : "−"}{money(Math.abs(myBal))}
        </div>
        <div style={{ fontSize: 13, opacity: .85 }}>
          {Math.abs(myBal) < 0.01 ? "All settled up." : myBal > 0 ? "you're owed overall" : "you owe overall"}
        </div>
      </div>

      {pendingMine.length > 0 && (
        <>
          <h3 className="ch-sec-title">Settle-ups in progress</h3>
          {pendingMine.map((s) => {
            const iApprove = approverOf(s) === me;
            return (
              <div key={s.id} className="ch-card" style={{ padding: 16, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, textAlign: "center", marginBottom: 4 }}>
                  {s.from} paid {s.to} {money(s.amount)}
                </div>
                <div className="ch-handshake">
                  <div className="ch-hs-node">
                    <Avatar name={s.from} size={36} />
                    <div className={"ch-check " + (s.initiatedBy === s.from ? "yes" : "")}>{s.initiatedBy === s.from ? <Check size={13} /> : "1"}</div>
                  </div>
                  <div className={"ch-hs-link" + (s.status === "confirmed" ? " done" : "")} />
                  <div className="ch-hs-node">
                    <Avatar name={s.to} size={36} />
                    <div className={"ch-check " + (s.initiatedBy === s.to ? "yes" : "")}>{s.initiatedBy === s.to ? <Check size={13} /> : "2"}</div>
                  </div>
                </div>
                <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)", margin: "6px 0 12px" }}>
                  {s.initiatedBy} logged this. Both of you confirm to close it for good.
                </p>
                {iApprove ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="ch-btn glass" style={{ flex: 1 }} onClick={() => confirmSettlement(s.id)}><CheckCheck size={16} /> Confirm it&apos;s paid</button>
                    <button className="ch-btn ghost" onClick={() => declineSettlement(s.id)}>Not yet</button>
                  </div>
                ) : (
                  <div className="ch-chip" style={{ width: "100%", justifyContent: "center", padding: "9px" }}>
                    <Clock size={13} /> Waiting on {approverOf(s)} to confirm
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <h3 className="ch-sec-title">You &amp; the crew</h3>
      {myPairs.length === 0 ? (
        <div className="ch-card ch-empty" style={{ padding: 26 }}>
          <PartyPopper size={26} color="var(--seaglass)" /><br />You&apos;re square with everyone.
        </div>
      ) : (
        <div className="ch-card">
          {myPairs.map((p, i) => {
            const iOwe = p.debtor === me;
            const other = iOwe ? p.creditor : p.debtor;
            const pend = pendingMine.find((s) => (s.from === me && s.to === other) || (s.from === other && s.to === me));
            return (
              <div key={i} className="ch-row">
                <Avatar name={other} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{other}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }} className={iOwe ? "ch-owe" : "ch-owed"}>
                    {iOwe ? "you owe" : "owes you"} <span className="ch-mono">{money(p.amount)}</span>
                  </div>
                </div>
                {pend ? (
                  <span className="ch-chip"><Clock size={12} /> pending</span>
                ) : (
                  <button className="ch-btn ghost sm" onClick={() => setSettleWith({ other, amount: p.amount, iOwe })}>
                    Settle up
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h3 className="ch-sec-title">Recent expenses</h3>
      {recentExpenses.length === 0 ? (
        <div className="ch-card ch-empty" style={{ padding: 26 }}>No expenses logged yet.<br />Add the first dinner, gas run, or grocery haul.</div>
      ) : (
        <div className="ch-card">
          {recentExpenses.map((e) => {
            const share = e.amount / (e.split.filter(Boolean).length || 1);
            return (
              <div key={e.id} className="ch-row">
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(227,107,78,.12)", display: "grid", placeItems: "center", flex: "none" }}>
                  <Receipt size={17} color="var(--coral)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{e.desc}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {e.paidBy} paid · {e.split.length} split · {money(share)} each
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ch-mono" style={{ fontWeight: 700 }}>{money(e.amount)}</div>
                  {e.createdBy === me && <button onClick={() => deleteExpense(e.id)} style={{ color: "var(--muted)", fontSize: 11 }}>delete</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && <AddExpenseSheet me={me} roster={roster} onClose={() => setAddOpen(false)} onAdd={(x) => { addExpense(x); setAddOpen(false); }} />}
      {settleWith && (
        <SettleSheet me={me} info={settleWith} onClose={() => setSettleWith(null)}
          onCreate={(s) => { createSettlement(s); setSettleWith(null); }} />
      )}
    </div>
  );
}

function AddExpenseSheet({ me, roster, onClose, onAdd }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(me);
  const [split, setSplit] = useState(roster);
  const toggle = (n) => setSplit((s) => s.includes(n) ? s.filter((x) => x !== n) : [...s, n]);
  const amt = parseFloat(amount) || 0;
  const per = split.length ? amt / split.length : 0;
  const submit = () => {
    if (!desc.trim() || amt <= 0 || !split.length) return;
    onAdd({ id: uid(), desc: desc.trim(), amount: amt, paidBy, split, date: todayISO(), createdBy: me });
  };
  return (
    <Sheet title="Add an expense" onClose={onClose}>
      <label className="ch-label">For what?</label>
      <input className="ch-input" autoFocus placeholder="Dinner at the seafood place" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <label className="ch-label" style={{ marginTop: 12 }}>Total amount</label>
      <input className="ch-input ch-mono" inputMode="decimal" placeholder="0.00" value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
      <label className="ch-label" style={{ marginTop: 12 }}>Who paid?</label>
      <div className="ch-pickgrid">
        {roster.map((n) => (
          <button key={n} className={"ch-pick" + (paidBy === n ? " on" : "")} onClick={() => setPaidBy(n)}>
            <Avatar name={n} size={20} /> {n}
          </button>
        ))}
      </div>
      <label className="ch-label" style={{ marginTop: 14 }}>Split between</label>
      <div className="ch-pickgrid">
        {roster.map((n) => (
          <button key={n} className={"ch-pick" + (split.includes(n) ? " on" : "")} onClick={() => toggle(n)}>
            {split.includes(n) ? <Check size={14} /> : <Plus size={14} />} {n}
          </button>
        ))}
      </div>
      {amt > 0 && split.length > 0 && (
        <div style={{ textAlign: "center", margin: "14px 0 2px", color: "var(--slate)", fontSize: 13 }}>
          <span className="ch-mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{money(per)}</span> per person
        </div>
      )}
      <button className="ch-btn coral" style={{ width: "100%", marginTop: 12 }} onClick={submit} disabled={!desc.trim() || amt <= 0 || !split.length}>
        Save expense
      </button>
    </Sheet>
  );
}

function SettleSheet({ me, info, onClose, onCreate }) {
  const { other, amount, iOwe } = info;
  const [val, setVal] = useState(amount.toFixed(2));
  const amt = parseFloat(val) || 0;
  const submit = () => {
    if (amt <= 0) return;
    const from = iOwe ? me : other;
    const to = iOwe ? other : me;
    onCreate({ id: uid(), from, to, amount: amt, status: "pending", initiatedBy: me, date: todayISO() });
  };
  return (
    <Sheet title="Settle up" onClose={onClose}>
      <p style={{ color: "var(--slate)", fontSize: 14, margin: "0 0 14px" }}>
        {iOwe
          ? <>Log that <strong>you paid {other}</strong> back. {other} confirms on their side to close it.</>
          : <>Log that <strong>{other} paid you</strong> back. {other} confirms on their side to close it.</>}
      </p>
      <div className="ch-handshake" style={{ margin: "0 0 14px" }}>
        <div className="ch-hs-node"><Avatar name={iOwe ? me : other} size={40} /><span style={{ fontSize: 11, fontWeight: 700 }}>pays</span></div>
        <div className="ch-hs-link" />
        <div className="ch-hs-node"><Avatar name={iOwe ? other : me} size={40} /><span style={{ fontSize: 11, fontWeight: 700 }}>receives</span></div>
      </div>
      <label className="ch-label">Amount</label>
      <input className="ch-input ch-mono" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))} />
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>
        This won&apos;t change anyone&apos;s balance until <strong>both of you approve</strong>.
      </p>
      <button className="ch-btn harbor" style={{ width: "100%", marginTop: 16 }} onClick={submit} disabled={amt <= 0}>
        Send for approval
      </button>
    </Sheet>
  );
}

/* ============================================================
   CHAT  (+ start a poll)
   ============================================================ */
function ChatTab({ me, chat, polls, setChat, setPolls, mutate }) {
  const [text, setText] = useState("");
  const [pollOpen, setPollOpen] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length]);

  const send = () => {
    const t = text.trim(); if (!t) return;
    setText("");
    mutate(K.chat, setChat, (cur) => [...cur, { id: uid(), name: me, text: t, ts: Date.now() }].slice(-200));
  };
  const addPoll = (q, opts) => mutate(K.polls, setPolls, (cur) =>
    [...cur, { id: uid(), q, createdBy: me, options: opts.map((o) => ({ id: uid(), text: o, votes: [] })) }]);

  return (
    <div style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 className="ch-display" style={{ fontSize: 26, margin: 0 }}>Group chat</h2>
        <button className="ch-btn ghost sm" onClick={() => setPollOpen(true)}><BarChart3 size={15} /> New poll</button>
      </div>

      {chat.length === 0 && <div className="ch-card ch-empty" style={{ padding: 30 }}>No messages yet. Say hi 👋</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {chat.map((m, i) => {
          const mine = m.name === me;
          const showName = !mine && (i === 0 || chat[i - 1].name !== m.name);
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
              {showName && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, margin: "0 0 2px 8px" }}>{m.name}</span>}
              <div style={{ display: "flex", gap: 7, alignItems: "flex-end", flexDirection: mine ? "row-reverse" : "row" }}>
                {!mine && <Avatar name={m.name} size={26} />}
                <div className={"ch-msg " + (mine ? "me" : "them")}>{m.text}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)", margin: "2px 8px 0" }}>{relTime(m.ts)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="ch-composer">
        <div className="ch-composer-inner">
          <input className="ch-input" placeholder="Message the crew…" value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="ch-btn harbor" onClick={send} disabled={!text.trim()} style={{ padding: "0 16px" }}><Send size={17} /></button>
        </div>
      </div>

      {pollOpen && <NewPollSheet onClose={() => setPollOpen(false)} onAdd={(q, o) => { addPoll(q, o); setPollOpen(false); }} />}
    </div>
  );
}
function NewPollSheet({ onClose, onAdd }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const setOpt = (i, v) => setOpts((o) => o.map((x, j) => (j === i ? v : x)));
  const clean = opts.map((o) => o.trim()).filter(Boolean);
  return (
    <Sheet title="New poll" onClose={onClose}>
      <label className="ch-label">Question</label>
      <input className="ch-input" autoFocus placeholder="Where are we eating Friday?" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="ch-label" style={{ marginTop: 12 }}>Options</label>
      {opts.map((o, i) => (
        <input key={i} className="ch-input" style={{ marginBottom: 8 }} placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOpt(i, e.target.value)} />
      ))}
      {opts.length < 5 && <button className="ch-btn ghost sm" onClick={() => setOpts([...opts, ""])}><Plus size={14} /> Add option</button>}
      <button className="ch-btn harbor" style={{ width: "100%", marginTop: 16 }} disabled={!q.trim() || clean.length < 2} onClick={() => onAdd(q.trim(), clean)}>
        Post poll
      </button>
    </Sheet>
  );
}
