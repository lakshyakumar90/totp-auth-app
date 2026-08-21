import { selectVisibleAccounts } from "../lib/accounts-select.ts";
const A = (id, issuer, label, secret, localOnly) => ({ id, issuer, label, secret, localOnly });
let fail = 0;
const check = (name, cond) => { if (!cond) fail++; console.log((cond ? "PASS " : "FAIL ") + name); };

// scenario 1: wizard run twice (2 unpaired orphans) + one paired sibling
const s1 = [
  A("s1", "Mobile Link", "My phone", undefined),
  A("s2", "Mobile Link", "My phone", undefined),
  A("l1", "Mobile Link", "My phone", "SECRETABC", false),
];
const v1 = selectVisibleAccounts(s1);
check("scenario1: exactly 1 card", v1.length === 1);
check("scenario1: it is the PAIRED one", v1[0].secret === "SECRETABC");

// scenario 2: only unpaired orphans, nothing paired yet
const v2 = selectVisibleAccounts([
  A("a", "Mobile Link", "My phone"),
  A("b", "Mobile Link", "My phone"),
  A("c", "Mobile Link", "My phone"),
]);
check("scenario2: collapsed to 1 activate-card", v2.length === 1 && !v2[0].secret);

// scenario 3: rescan twins with identical secret
const v3 = selectVisibleAccounts([
  A("x", "GH", "me@x.com", "S1"),
  A("y", "GH", "me@x.com", "S1", true),
]);
check("scenario3: same-secret twins -> 1", v3.length === 1);

// scenario 4: distinct real accounts survive
const v4 = selectVisibleAccounts([
  A("1", "GitHub", "me@x.com", "S1"),
  A("2", "GitLab", "work@x.com", "S2"),
  A("3", "Mobile Link", "My phone"),
]);
check("scenario4: distinct accounts kept (3)", v4.length === 3);

console.log(fail === 0 ? "\nALL SELECTOR TESTS PASSED" : `\n${fail} FAILED`);
process.exit(fail ? 1 : 0);
