---
title: "Rows are slots, flashes are prices: keying a live order book ladder in React"
description: "A 20-level ladder has two identities. Getting the keys wrong lit the whole book on every insert. Three bugs and the fix."
pubDate: 2026-09-19
---

## Why the ladder isn't a grid

AG Grid was the obvious choice. It's the finance grid, and its `getRowId`, `applyTransactionAsync` and cell-flash pipeline is close to a trading pitch. I've used it on two trading products and I'll use it again in this repo when a trades blotter arrives.

I rejected it for the ladder for one reason that matters and two that don't.

The two that don't: a fixed 20-level window has no scrolling, sorting, filtering, selection or editing, so everything a grid engine charges its bundle for goes unused, and ten renders a second across 40 rows is nothing plain React can't idle through.

The one that does: AG Grid's whole update model is built on row identity, and it assumes the row is the price level. In a ladder the stable thing on screen is the slot: best bid, second best, third. Prices move through slots all day. Building on row ids means fighting the engine to get slot-stable rendering, and a mirrored two-sided layout makes it worse: either two synced grid instances or row data zipped by index, which gives up the row-id model anyway.

That identity question, slot or price, is what the rest of this post is about, because the ladder needs both answers at once.

## Rows are slots

A ladder shows a fixed window: the best 20 bids and the best 20 asks. Slot 1 is best bid, slot 2 is second best, and so on. Prices move through those slots continuously, but the slots themselves never reorder, never disappear, never scroll. That makes the slot the natural row identity: 40 table rows mount once and only their text changes, no matter how the book churns.

The alternative, keying rows by price, means every insertion at the top mounts a new row and unmounts one at the bottom, and every rank shift reorders the DOM. React handles it, but it's work that buys nothing on a fixed window.

Biome disagreed. `noArrayIndexKey` flags `key={index}` inside a map callback, and it's right in general: an index key on a reorderable list is a classic bug. Here the index is the identity by design. The refactor that says what the key is, rather than a lint suppression, was to make the slot list the mapped collection:

```tsx
// src/features/order-book/ui/OrderBookLadder.tsx
const slots = isAsk ? askSlots : bidSlots
const sideFlashes = isAsk ? flashes.askFlashes : flashes.bidFlashes
return slots.map((slot) => {
  const level = levels[slot]
  return level ? (
    <DepthRow
      key={slot}
      side={side}
      level={level}
      display={display}
      flashDirection={sideFlashes.get(level.price) ?? null}
      mid={view.mid}
    />
  ) : null
})
```

Same DOM, but now the key names the thing it is. The asks' visual reversal is a constant flip of the slot list, so the keys never reorder there either.

Slot-keyed rows solve rendering. They create the problem in the next section.

## Flashes are prices

A flash means "this level changed". The level is a price, not a slot. If a new bid arrives at the top, slot 1 shows a new price, and every slot below it shows a price that used to be one slot higher. Nothing about those lower levels changed. A trader watching the ladder must not see 19 rows light up because one order arrived.

So the change detection has to run on a different identity from the rows. Per commit, diff the window by price: a price whose quantity moved gets a direction, green for size up, red for size down; a price new to the window counts as up, since its quantity appeared from nothing. Prices that left the window drop out of the map, so it never outgrows 20 entries a side. Quantities are compared numerically, so `"1.0"` to `"1.00"` is not a change.

Two identities, one row: the row is a slot, the thing that flashes inside it is a price. Everything that went wrong came from letting one leak into the other.

## Bug 1: the flash that replayed

The flash design was simple on paper. A level flashes when its quantity changes or when its price newly enters the window. A rank shift, where an insertion at the top pushes every row below it down one slot, must not flash anything. Nothing moved; the book just got a new entry.

The first implementation keyed each flash overlay by `${price}:${seq}`, where `seq` was a per-price counter bumped on every change. New key, React remounts the overlay, the CSS animation restarts. No timers, no imperative animation code. It passed its tests.

It was wrong, and the way it was wrong is the point of this post. Rows are keyed by slot, because slots never reorder. Overlays were keyed by price, which lives inside the row. So when a price that had already flashed moved from slot 3 to slot 4, the row at slot 4 received a child with a key it had never seen. React did what React does with an unfamiliar key: it mounted a fresh overlay, and the fade played again. A rank shift produced exactly the flash the design forbids. In the browser it showed as a ripple down the ladder on every top-of-book insert, before any test caught it.

The fix separated the two identities properly. `useLevelFlashes` diffs the window per commit and emits a fresh set of changed prices with a direction:

```ts
// src/features/order-book/model/useLevelFlashes.ts
export function diffChangedPrices(
  prev: FlashDiff,
  levels: readonly PricedLevel[],
  silent: boolean
): FlashDiff {
  const qtyByPrice = new Map<string, string>()
  const changed = new Map<string, FlashDirection>()
  for (const { price, qty } of levels) {
    qtyByPrice.set(price, qty)
    if (silent) continue
    const prevQty = prev.qtyByPrice.get(price)
    if (prevQty === undefined) {
      // New to the window: the quantity appeared out of nothing — an increase.
      changed.set(price, "up")
    } else {
      const delta = Number(qty) - Number(prevQty)
      if (delta > 0) changed.set(price, "up")
      else if (delta < 0) changed.set(price, "down")
    }
  }
  return { qtyByPrice, changed }
}
```

Each row then folds membership into a slot-local monotonic key through `useRowFlash`: if my slot's price is in the changed set, bump my counter and latch the direction. The overlay is keyed by that counter. A price moving between slots leaves every counter untouched, so nothing remounts. A quantity change bumps exactly one.

```ts
// src/features/order-book/model/useLevelFlashes.ts
export function useRowFlash(direction: FlashDirection | null): RowFlash {
  const committed = useRef<RowFlash>({ key: 0, tone: null })
  const next: RowFlash = direction
    ? { key: committed.current.key + 1, tone: direction }
    : committed.current
  useEffect(() => {
    committed.current = next
  })
  return next
}
```

Both hooks derive their next state during render from a ref committed in an effect, so StrictMode's double render computes the same answer twice instead of double-bumping the counter.

## Bug 2: the resync that lit every level

The second bug came out of the review pass after the layer had shipped, and it was invisible on a healthy connection.

The sync engine self-heals. When it detects a gap in the diff stream it re-fetches a snapshot and swaps the entire book in a single commit. The flash diff was status-blind: it compared the fresh book against the pre-resync baseline, found that most prices had changed quantity, and lit the whole ladder. Every self-heal looked like the market had just moved everywhere at once, which is a lie about what happened.

The obvious fix is to suppress flashes on the edge into `live`. That's also wrong, and the engine is why. A gap inside the buffered run commits a changed partial book while status is still `syncing`. An edge-based rule would let that commit through and mass-flash it. The rule that holds is that flashes fire only on a continuous `live → live` commit. Every other transition, first sync, every resync, `degraded`, the edge back into `live`, re-baselines silently.

```ts
// Flash only when this commit AND the last are both "live"; anything else re-baselines silently.
const silent = !(status === "live" && previous.current.status === "live")
```

The lesson I took: the flash hook needed to know something the view-model was deliberately kept ignorant of. Status isn't presentation data, but it's the only correct gate for a change-detection diff.

## Bug 3: the side that emptied and refilled

The status gate replaced an older heuristic: treat a `size === 0` previous book as the first book and record a silent baseline. That heuristic had a latent bug of its own. A side that emptied and then refilled looked like a first book, so its refill never flashed. Irrelevant for BTCUSDT, where neither side ever empties, but real for a thin or halted symbol reusing the same hook.

It went away for free when the status gate landed, because the gate doesn't care how many levels the previous book had. The same review pass that found the resync storm found this one; a status-blind diff was the root of both.

## How this was built

This repo is built with Claude Code, and I want to be specific about what that means, because "AI-assisted" covers everything from autocomplete to pasting whatever comes back.

Three rules do the work. Every change starts in plan mode: the tool researches and presents a plan, and nothing is written until I've signed it off. The rules live in [`.claude/rules/`](https://github.com/TimurJ/crypto-order-book/blob/v1.0.1/.claude/rules/working-agreement.md) and are short enough to read in a minute. Each subsystem has a decision log, so the tool builds against a written contract rather than a chat history. And after each layer ships, I run an adversarial review pass over it, which is where two of the three bugs in this post came from. The replay bug was caught before the layer shipped.

The replay bug is the honest example. The tool proposed keying the flash overlay by `${price}:${seq}`. It reads correctly and passed its tests. It replays the animation whenever a flashed price changes slot, which is exactly what the design forbids. Catching that was my job, not the tool's.

## Three questions for any ladder

If I were reviewing someone else's order book UI, these are the questions I'd ask before reading a line of rendering code.

What is your row entity? If the answer is the price level, ask what happens to the DOM on a top-of-book insert.

What is your change entity? If it's the same as the row entity, ask how a rank shift avoids flashing.

What happens on resync? If the change detector doesn't know the connection status, it will one day tell the trader the whole market moved when the socket hiccupped.

The code is at [TimurJ/crypto-order-book, v1.0.1](https://github.com/TimurJ/crypto-order-book/tree/v1.0.1), live at [crypto-order-book-prod.timurjalilov1.workers.dev](https://crypto-order-book-prod.timurjalilov1.workers.dev). The sync engine that produces those resyncs is a post of its own.
