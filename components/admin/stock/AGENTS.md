# Stock Editor Components

The three cards behind `/admin/products/[id]/stock`. Product *creation* uses a
different pair — `components/admin/ProductStockPasteField.tsx` and
`ProductStockDraftList.tsx` — which model stock as user/pass pairs with a
per-line delimiter guess. These model it as one blob split by one configured
separator over arbitrary text. Do not merge the two without deciding which
model wins.

## Files

- `StockEditorCard.tsx`
  Top card. Textarea on the left, live preview chips on the right, save button
  carrying the item count, `.txt` import. Import appends rather than replaces.
- `StockListCard.tsx`
  Bottom card. Stored stock with search, sort, pagination and a per-row kebab.
  No edit action on purpose: the textarea above is the editor, and a second one
  over the same data is how the two disagree.
- `StockSeparatorPicker.tsx`
  Popover + Command combobox over `SEPARATOR_OPTIONS`. Same shape as
  `components/admin/chat/QuickReplyPicker.tsx`.

## The thing to be careful about

**The separator is not a display setting.** `getDelimiter` in `lib/stock.ts` is
the same function `takeFirstStock` calls at purchase time, so the option chosen
here decides what a buyer receives. The page therefore:

- re-splits the *stored* blob with the draft separator so the bottom card shows
  the prospective result, with a banner saying it is not saved yet;
- confirms before saving when the item count moves;
- sends `secretData` and `stockSeparator` in one PUT, never separately.

**Rows carry `{ index, text }`, never bare strings.** Every kebab action names a
position in the stored blob, so a searched or re-sorted list would otherwise
delete the wrong item. The `จะถูกส่งก่อน` badge hides whenever the list is not
in stored order, because "first" is then not what is on top.

## Read alongside

- `lib/stock.ts` — the separator list, splitting and joining
- `app/api/products/[id]/stock/route.ts` — the only endpoint these cards write to
- `lib/features/products/mutations.ts` — `updateProductStock` writes both columns
