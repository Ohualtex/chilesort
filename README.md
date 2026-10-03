# ChileSort <img src="./dist/chile-flag.svg" alt="Chile flag" width="30" height="20">

The world's narrowest sorting algorithm.

Bogosort shuffles. Stalin Sort removes. ChileSort goes south.

**No two elements shall be east or west of each other.**

```js
import { chileSort } from './dist/chilesort.js';

chileSort(['🍕', '{}', '🦆', '☕']);
// [
//   ['🍕'],
//   ['{}'],
//   ['🦆'],
//   ['☕']
// ]
// Sorted. Geographically.
```

Input order and object identity are preserved. The input is never mutated.
Every output row has exactly one element. Comparisons: zero.
Actual time and space complexity: O(n). Actual numerical sorting: absolutely none.

## Run the playground

Requires Node.js 18 or later. No packages to install.

```sh
npm start
```

Open http://127.0.0.1:5173. Enter comma-separated items (up to 12 characters each),
then press ChileSort. Cards initially appear in rows of four.
New items extend the grid downward; the fixed output viewport scrolls to reveal them.
Cards are 34 pixels tall and expand to fit their contents, with a minimum width
of 60 pixels and a fixed 42-pixel vertical pitch after sorting.
Four fixed columns fit inside the canvas with equal spacing at the edges.
Incomplete rows keep their empty slots. Cards have a gentle tilt before sorting
and straighten when they move into the final column.
There is no count or height slider. The themed scrollbars navigate overflowing content.
The input and output scroll internally when their content exceeds the default height.
Shuffle exchanges the same cards between existing grid slots without changing input order.
Sort moves those same cards directly into a column; shuffle or reset to play again.
The canvas smoothly follows the column south during sorting. Once the final card
settles, the view reaches the bottom and the CERTIFIED LONG & NARROW stamp appears.
Reset cancels the follow animation. Reduced-motion preferences skip animated scrolling.
Reset restores the four-column grid. Shuffle preserves its rows, columns, and slot positions.
Reduced-motion preferences are respected. Interface content is rendered as text.
Clearing the entire input removes all cards and displays **Chile exists :(**
in the center of the canvas. Adding an element brings the cards back.

```sh
npm test
npm run check
```

`dist/` is also a self-contained static site for any static web host.
The illustration is a playful Chile-inspired outline, not a geographical boundary dataset.
