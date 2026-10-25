# General-purpose catalog: People, Places and Misc

Library is not restricted to movies, games or books. The fork adds four categories to the **Library → +** picker and category settings.

| Category | Creation | What it is for |
| --- | --- | --- |
| **People (Private)** | Manual only | People you know, contacts, relationships, private reference notes |
| **People (Public)** | Wikidata or manual | Artists, writers, historical figures, researchers and publicly documented people |
| **Places** | Wikidata or manual | Cities, landmarks, parks, buildings and places to visit |
| **Miscellaneous** | Manual only | Household items, memorabilia, gear and everything else |

All entries are ordinary Markdown files with Obsidian properties. The first entry creates a matching folder under the configured Library root. Category folders and note templates remain customizable.

## Add an entry

Use **Library: Add content** or the Library plus button. Public People and Places show Wikidata search. Select a result to fill the note's metadata. Private People and Misc ask for a name and create a local note, without contacting an external search provider.

Use the new command **Library: Add catalog entry manually** to create a note **without an online search**, including a public person or place not found by Wikidata. It works with the same category picker and any custom category template.

## Example properties

### People (Private)

~~~yaml
---
Type: Person (Private)
Name: Alex
aliases: []
Relationship: ""
Phone Number: ""
Email: ""
Birthday: ""
Photo: ""
---
~~~

Use Obsidian's built-in `aliases` list to record nicknames, previous names or alternate spellings. `Phone Number` and `Email` are separate text properties. `Photo` accepts an image URL or a vault image path/wikilink (for example, `"[[People/Photos/Alex.jpg]]"`), which appears as the gallery portrait and note-header image. The photo stays in your vault when it refers to a local file. New entries leave these properties empty, and custom templates can provide their own values.

Private People have no external metadata provider. The Library plugin does not look them up online and disables its built-in social-share control and Share Current Note command for this category. Obsidian Sync, other plugins, and user-chosen cloud backups may still copy the vault elsewhere.

### People (Public)

~~~yaml
---
Type: Person (Public)
Name: "Ada Lovelace"
aliases: []
Description: ""
Occupation: []
Citizenship: []
Born: ""
Died: ""
Source: wikidata
Source ID: Q7259
---
~~~

Wikidata searches return documented human items and fill descriptions, occupations, citizenship, birth/death dates, native Obsidian aliases (from available Wikidata alternate names in your language/English), and Wikipedia portraits where available. Manually created notes do not require a source ID.

### Places

~~~yaml
---
Type: Place
Name: "Gothenburg"
Visited: false
Address: ""
Latitude: 57.7
Longitude: 11.97
---
~~~

Place searches use Wikidata entries containing geographic coordinates (P625) to keep results relevant. They can include region, country, place type, location coordinates and photographs. If an entry isn't covered by Wikidata, use manual creation. The Visited checkbox stays user-controlled.

### Miscellaneous

~~~yaml
---
Type: Misc
Name: "Portable cassette recorder"
Owned: false
Owned Format: ""
Storage: ""
Description: ""
---
~~~

Miscellaneous entries use the same ownership and storage properties as your media collections. Add your own properties or category-specific templates.

## Display, privacy and refresh

People use portrait gallery covers, places use landscape covers, and missing covers show category-specific symbols. These four categories do **not** have movie-style completed, watched, progress or rating controls.

Public People and Places use existing Wikidata APIs and can refresh their external metadata. Private People and Misc never perform automatic web lookup. None of these categories requires an API key.

We deliberately don't add the ownership checkbox to people or places. Owning a book is different from knowing a person or visiting a city. You can still add any property manually where needed.

The Library plugin can avoid external lookups, but it cannot promise your vault is physically local. Other Obsidian plugins, cloud sync providers or manual sharing may transmit data. Store sensitive details only in a vault with appropriate access controls.
