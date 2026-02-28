# Change: Fix parent/child ID swap in bracket line grouping

## Why

The bracket distribution line appears below children instead of between parent and child nodes. The root cause is **not** the midY centering formula — it's that `parentId` and `childId` are swapped when parsing FATHER/MOTHER/SON/DAUGHTER edges in the bracket drawing code.

The database convention (documented at `cloudfunctions/relationship/index.js:220`) is:

> 边的 relation_type 含义是 "from_id 是 to_id 的 X"

This means for a FATHER edge: `from_id` is the father, `to_id` is the child. In the ForceGraph output: `edge.source = father`, `edge.target = child`.

But the bracket code (`miniprogram/components/family-graph/index.js:227-232`) does the **opposite**:
```js
if (edge.type === 'FATHER' || edge.type === 'MOTHER') {
    parentId = edge.target    // ← This is the CHILD!
    childId = edge.source     // ← This is the PARENT!
}
```

And for SON/DAUGHTER edges (`from_id` is the son, `to_id` is the parent):
```js
else if (edge.type === 'SON' || edge.type === 'DAUGHTER') {
    parentId = edge.source    // ← This is the CHILD!
    childId = edge.target     // ← This is the PARENT!
}
```

Both branches are inverted. This causes `group.originY` to be the **child's** Y (lower on screen) and `gChildren[].y` to be the **parent's** Y (higher on screen). The bracket is then drawn downward from the child, placing the horizontal line below the children.

All previous attempts to fix the bracket position (`fix-bracket-line-proportions`, `fix-bracket-midline-centering`) were adjusting the midY formula when the real problem is the ID assignment.

## What Changes

- Swap `parentId`/`childId` assignment in lines 227-232 so that FATHER/MOTHER edges correctly identify `edge.source` as the parent, and SON/DAUGHTER edges correctly identify `edge.target` as the parent.
- Revert the unnecessary `parentBottomY` variable introduced by `fix-bracket-midline-centering` since the original `(startY + minChildTopY) / 2` centering approach was correct — it just appeared wrong because the IDs were swapped.

## Impact

- Affected code: `miniprogram/components/family-graph/index.js` lines 227-232
- No backend changes
- No breaking changes — purely fixes visual rendering
