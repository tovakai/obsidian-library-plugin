# Magic: The Gathering and Scryfall

The fork supports **MTG** as a Library content category. Cards are ordinary Markdown notes, backed by [Scryfall](https://scryfall.com/docs/api), with one note **per physical printing** (not one note per Oracle name). No API key, account, or additional plugin is required.

## Add a card

1. Open **Library** and click **+**, or use **Library: Add content**.
2. Select **Magic: The Gathering**. The first saved card creates the MTG category and folder.
3. Search for a card, and pick the set/collector-number printing you want. Results are newest-first and show set, number, and rarity.
4. To narrow a popular name, use native [Scryfall search syntax](https://scryfall.com/docs/syntax): for example, **!"Sol Ring" set:who**, **name:Camellia set:blb**, **t:token**, or **!"Gilded Goose" cn:160**.
5. Open its new note and use the **+ / − buttons** below the metadata to track **normal**, **foil**, and **etched** copies (or edit the corresponding frontmatter fields directly). The note header also has a **Wishlist** toggle. The quantity buttons automatically update the **Owned** checkbox.

An ordinary name search targets paper printings. Queries with Scryfall operators run as written, so advanced searches can also request digital cards. Results show the first page (up to 75 printings); add a set or collector-number filter to reach older printings.

Cards can belong to your **reference library even if you own zero copies**. New MTG notes include an **Owned** checkbox (default false) and a **Storage** text property (default empty). **Owned Format** is omitted because normal, foil, and etched copies already have separate quantities. The **Owned** inventory view includes cards with the checkbox checked or a positive quantity. The quantity buttons keep the checkbox consistent with the count; if you edit quantities manually in frontmatter, update the checkbox yourself. **Wishlist** is independent from ownership. The media Complete and Progress fields do not apply to cards.

## Metadata

Scryfall supplies: the exact printing UUID (**Source ID**), **Oracle ID** to connect equivalent gameplay cards, set name and code, collector number, rarity, release date, artist, type line, mana cost, mana value, colors and color identity, Oracle text, Commander legality, other legal formats, artwork, and available EUR/USD price estimates.

For double-faced cards the main **Cover** is the front face and **Back Cover** points to the reverse face. Turn on **Keep covers in the vault** for offline browsing of the front artwork.

Library creates filenames such as **Camellia, the Seedmiser (BLB 207).md**, while the note's Name remains the actual card name. Another printing gets another file. Existing duplicate printings are recognized by their Scryfall URL.

The gallery uses card-art proportions and shows printing identifiers, copy counts, and a nonfoil EUR estimate where available. The note header shows set, card type, mana cost, rarity, copies, and price.

## Prices and collection values

The price fields (Price EUR, Price EUR Foil, Price USD, etc.) are **estimates**, not sale offers, and may be absent. Library can refresh them from Scryfall when refreshing metadata; personal quantity, wishlist, and other hand-edited properties are never replaced by Scryfall. Refresh one note with **Refresh metadata for current note**.

For an Obsidian Base inventory, copy [the included MTG Collection.base template](../../examples/MTG%20Collection.base) into your vault's **Inventory** folder. It provides **Owned**, **Wishlist**, and **Reference** views with total-copy and estimated EUR-value formulas. Its EUR total covers normal and foil copies; etched copies have no Scryfall EUR price field and are intentionally excluded from that estimate. The views also expose **Owned** and **Storage**.

Or create your own view filtered to **Type = MTG** and quantities greater than zero. For value calculations, use the numeric EUR prices and multiply by each corresponding quantity. Keep collection value as a derived calculation, not as manually maintained duplicate metadata. A file with quantity zero is still useful as a reference entry.

## API usage and limitations

- The provider spaces API requests by **at least 400 ms** and caches successful responses for **five minutes**. It **does not retry HTTP 429**. Large card-database imports should use [Scryfall bulk data](https://scryfall.com/docs/api/bulk-data), not interactive search loops.
- Search shows up to 75 results from the first API page. Batch import and a dedicated deck-list editor are not implemented yet.
- Price metadata updates via Library's normal refresh behavior and may be stale between refreshes. Images and prices belong to their respective rights holders.
- This fork is not affiliated with or endorsed by Scryfall or Wizards of the Coast.

## Development

Build the fork with npm ci && npm run build. The plugin ID remains **library**. For a local development installation, place main.js, manifest.json, and styles.css in your vault's .obsidian/plugins/library/ directory (back up the existing plugin first), then reload Obsidian and enable the plugin. Use a backup/test vault when evaluating fork changes.
