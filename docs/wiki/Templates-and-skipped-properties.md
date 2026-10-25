## Category templates

A template is an ordinary note that new notes of a category start from. Use it for things the sources don't fill: a shelf of your own, tags, or sections you always write.

Templates belong to custom categories. A built-in category, the first one of each kind, takes no template; to use one, add a category of the same kind with Settings → Library → Categories → Add category and give it the template. See [[Getting started|Getting-started#categories-and-folders]].

1. Create the template, for example `Templates/Movie`:

   ```markdown
   ---
   Shelf: watchlist
   tags: [movie]
   ---
   ## Notes

   ## Quotes
   ```

2. In Settings → Library → Categories, open the custom category with its chevron and enter the template's path in Template, for example `Templates/Movie`. The `.md` ending is optional. Existing notes don't change.

From then on, every note added to the category starts as a copy of the template, properties and text, whether it comes from search, from a Manual category, or from an import. Imports add notes to the first category of their kind in the list, so drag the custom category above the built-in one if imported notes should use the template too. Library then adds its own fields:

- The seven properties Library manages, listed in [[Note properties|Frontmatter-reference]], are always set by Library. The template doesn't need them.
- Fields from the sources, such as `Name`, `Year`, `Genre`, the cover, or the ratings, are written only where the template leaves them empty. Leave them out of the template, or its value ends up in every new note.
- Everything else in the template is copied as it is, including the text under the properties. Template variables such as `{{title}}` and Templater code are copied without being run.
- Pick names Library doesn't use, such as `Shelf` rather than `Platforms` or `Playtime`, so the template never blocks a field Library fills.

Keep templates in a folder named `Templates`, or in a folder or file whose name starts with `_`. Library ignores notes there, so a template never shows up as a card. A template kept anywhere else must not have the category's `Type`.

If the template is moved or deleted, Library shows "Template not found" and creates the note without it.

## Build a custom manual category in Settings

You can now define a new type of thing without editing Markdown templates or changing code.

1. Open **Settings → Library → Categories → Create custom category**.
2. Enter a category name such as **Electronics**, **Plants**, **Pets**, or **Vinyl** and click **Create**.
3. The new category expands. Click **Add property**, rename **New Property**, select a type, and optionally set a default.
4. Repeat for all fields. A trash icon removes a field from the category definition.
5. Use **Library → +** (or the manual-entry command) and choose your new category.

The property builder supports **Text** (e.g. Location = Living Room), **Number** (Warranty Years = 3), **Checkbox** (Owned = true/false), **Date** (Purchase Date = 2026-10-25), and **List** (Tags = Vinyl, Soundtrack). List defaults are comma-separated.

Definitions are stored in Library settings and applied when a new note is created. A generated note gets its own Type, Name and Date, plus the properties you specify. Custom categories do not inherit movie ratings, completion or progress controls, or unrelated ownership defaults unless you define them.

Existing notes are **not** modified when you change a schema. Removing a field from the builder does not remove that property from older notes.

### Combine with Markdown templates

Custom categories can still use the category's **Template** path to copy note body content, headings and advanced YAML. If a field already exists in the Markdown template, that value wins over a default from the Settings builder.

When a Date field has no initial value, you may need to select the Date property type in Obsidian's Properties UI after creating a note.

## Skipped properties

Settings → Library → Skip properties takes the fields that notes should not get from the sources, separated by commas, for example `Cast, Gallery, Trailer`. New notes leave them out, and a refresh doesn't add them. Values already in your notes stay; delete them by hand if you want them gone.

- Capitals don't matter.
- The cover can be listed under either name: with Cover property set to `image`, both `Cover` and `image` skip it.
- Only fields from the sources can be skipped. The seven properties Library manages, and the fields connected accounts write, such as `Platforms`, `Playtime`, `Last Played`, or the trophy counts, are always written.
- Some fields feed features. Without `Runtime` the time chart can't count a title, without `Seasons` or `Chapters` there is nothing to tick in the note header, and without `Genre` or `Country` the filters have less to offer.

Other property names can't be changed, because refresh, statistics, filters, and sync read them by name. The cover is the one exception; see [[Note properties|Frontmatter-reference]].
