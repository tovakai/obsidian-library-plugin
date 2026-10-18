<p align="center">
  <img src="banner.png" alt="Library banner" width="100%">
</p>

<h1 align="center">Library</h1>

<p align="center">
  <a href="https://community.obsidian.md/plugins/library"><img src="https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED?style=flat-square&logo=obsidian&logoColor=white" alt="Community Plugin"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/releases"><img src="https://img.shields.io/github/v/release/venvk/obsidian-library-plugin?style=flat-square&label=version&color=blue" alt="Version"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/releases"><img src="https://img.shields.io/github/downloads/venvk/obsidian-library-plugin/total?style=flat-square&color=brightgreen" alt="Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/venvk/obsidian-library-plugin?style=flat-square&color=orange" alt="License"></a>
</p>

<p align="center">
  Movies, series, anime, books, games, comics and music as plain Markdown notes,<br>
  shown as a gallery of covers. Search a title, pick it, and the note writes itself.
  <br><br>
  <a href="https://community.obsidian.md/plugins/library">Install</a> · <a href="https://github.com/venvk/obsidian-library-plugin/wiki">Wiki</a> · <a href="https://github.com/venvk/obsidian-library-plugin/issues/new/choose">Report a bug</a>
</p>

## What it does

- **One note per title** with cover, year, genres, creators, cast, ratings and trailer. Everything sits in frontmatter, so Bases and Dataview read it.
- **Progress you can tick.** Episodes and chapters live in the note header; tick them, score them, and see when the next episode airs.
- **A library view** with a category per kind, filters, sorting by rating, date, progress and more, an Up next shelf and a Coming soon list of new episodes.
- **Statistics** for titles, hours and trophies, with "in the same time you could have…" comparisons.
- **Links between notes.** Genres, creators and actors are links, so each of them collects its titles.
- Works on desktop and mobile, in every Obsidian language.

## Connectors

Sign in once in the plugin settings. Your lists arrive as notes and stay in sync.

| | Service | What comes in | What goes back |
| :-: | --- | --- | --- |
| <img src="assets/connectors/anilist.svg" width="24" alt=""> | **AniList** | Anime and manga lists, progress, scores | Progress and score, with the Push command |
| <img src="assets/connectors/myanimelist.svg" width="24" alt=""> | **MyAnimeList** | Anime and manga lists, progress, scores | Progress and score, on save |
| <img src="assets/connectors/kitsu.svg" width="24" alt=""> | **Kitsu** | Anime list, progress, ratings | Progress and rating, on save |
| <img src="assets/connectors/imdb.svg" width="24" alt=""> | **IMDb** | Ratings, episode ratings, watchlist | Scores and new titles |
| <img src="assets/connectors/netflix.svg" width="24" alt=""> | **Netflix** | Viewing history and thumbs | Scores, as thumbs |
| <img src="assets/connectors/playstation.svg" width="24" alt=""> | **PlayStation** | Played games, playtime, trophies with icons and dates | |
| <img src="assets/connectors/steam.svg" width="24" alt=""> | **Steam** | Library, playtime, achievements with icons and dates | |
| <img src="assets/connectors/nintendo.svg" width="24" alt=""> | **Nintendo Switch** | Played games and playtime | |

Imports run once a day on desktop. They never move progress backwards and never overwrite a score you set in the note. IMDb, Netflix, PlayStation, Steam and Nintendo connect on desktop only.

## Getting started

1. Install **Library** from Community plugins.
2. Open the Library tab from the ribbon and press **+**.
3. Pick a kind, search, choose a result. The first title of each kind creates its category and folder.

Add a year to tell apart films with the same name: `dune 1984`.

## Sources

Every category works without keys. A key only moves its service to the front.

| Category | Open sources | With a key |
| --- | --- | --- |
| Movies, series | Cinemeta, Wikidata | [OMDb](https://www.omdbapi.com/apikey.aspx), [TMDB](https://www.themoviedb.org/settings/api) for season ratings and stills |
| Books | Open Library | [Google Books](https://console.cloud.google.com/apis/library/books.googleapis.com) |
| Games | Steam, Wikidata | [RAWG](https://rawg.io/apidocs), [Twitch](https://dev.twitch.tv/console/apps) for IGDB trailers |
| Anime, manga | AniList, MyAnimeList, Kitsu | |
| Comics | Wikidata, AniList | [Comic Vine](https://comicvine.gamespot.com/api/) |
| Music | Deezer | |

Anything else goes in a custom category where you fill the fields yourself. More in the wiki: [sources and keys](https://github.com/venvk/obsidian-library-plugin/wiki/Sources-and-API-keys), [frontmatter](https://github.com/venvk/obsidian-library-plugin/wiki/Frontmatter-reference), [anime sync](https://github.com/venvk/obsidian-library-plugin/wiki/Anime-sync).

<details>
<summary><b>Example note</b></summary>

```yaml
---
Type: Series
Name: Stranger Things
Year: 2016
Genre: ["[[Drama]]", "[[Horror]]"]
Creator: ["[[The Duffer Brothers]]"]
Cast: ["[[Winona Ryder]]"]
Rating IMDB: 8.7
My Rating: 9
Cover: https://m.media-amazon.com/images/...
Progress: 8/42
Date: 01.03.2026
Source: omdb
Source ID: tt4574334
---
```

A refresh fills empty fields and updates source ratings. It never touches your own.
</details>

<details>
<summary><b>Commands</b></summary>

- Open Library · Add content · Search your library
- Refresh metadata for current note · Refresh metadata of all notes
- Rebuild graph links · Find & remove duplicates · Share current note
- Import from AniList, MyAnimeList or Kitsu · Push and pull progress for each
- Import Steam library · Import PlayStation games and trophies · Import Nintendo games
</details>

## Privacy

Your library is plain notes and opens offline. The plugin goes online only to search, refresh, sync or share, at most once every 5 minutes per note. No telemetry, no self-update, and each key goes only to its own service. Sign-ins happen on the service's own page; the plugin keeps only the token.

Nintendo accepts requests only from its own app, so they pass through a third-party signing service ([nxapi-znca-api](https://github.com/samuelthomas2774/nxapi-znca-api)). The plugin asks before you sign in.

<details>
<summary><b>Every host the plugin contacts</b></summary>

| Hosts | Use | Data sent |
| --- | --- | --- |
| `www.omdbapi.com`, `m.media-amazon.com` | Movie search with a key, posters | Title or IMDb id, key |
| `v3-cinemeta.strem.io`, `images.metahub.space`, `episodes.metahub.space` | Movies, series, stills, air dates | Title or IMDb id, genre |
| `api.themoviedb.org`, `image.tmdb.org` | Movie and series details, with a key | IMDb id, key |
| `www.wikidata.org`, `en.wikipedia.org`, `upload.wikimedia.org` | Search, Rotten Tomatoes, trailers, covers | Search text, ids |
| `openlibrary.org`, `covers.openlibrary.org` | Books, chapters, covers | Title, author, ISBN, genres |
| `www.googleapis.com`, `books.google.com` | Book search with a key, covers | Title, key |
| `api.rawg.io`, `media.rawg.io` | Games, with a key | Title or id, genre, key |
| `store.steampowered.com`, `steamcommunity.com`, `api.steampowered.com`, `cdn.cloudflare.steamstatic.com`, `video.akamai.steamstatic.com`, `shared.akamai.steamstatic.com`, `shared.fastly.steamstatic.com` | Games, trailers, Steam import, achievements | Title or app id; sign-in, library and achievements on import |
| `www.imdb.com`, `api.graphql.imdb.com` | IMDb connector | Sign-in; ratings and watchlist are read, scores and new titles are sent |
| `www.netflix.com` | Netflix connector | Sign-in; viewing activity and thumbs are read, scores are sent as thumbs |
| `id.twitch.tv`, `api.igdb.com` | Game trailers, with Twitch keys | Twitch id and secret, game |
| `api.deezer.com`, `cdn-images.dzcdn.net` | Music search, covers | Album or artist |
| `graphql.anilist.co`, `anilist.co`, `s4.anilist.co`, streaming services' image hosts | Anime, manga, air dates, sync | Title or ids; token, progress, status, score |
| `myanimelist.net`, `api.myanimelist.net`, `api-cdn.myanimelist.net` | Anime and manga search, sign-in, import, sync | Search text; token, progress, status, score |
| `kitsu.io`, `kitsu.app` | Anime search, sign-in, import, sync | Search text; token, progress, status, score |
| `ca.account.sony.com`, `my.account.sony.com`, `m.np.playstation.com`, `web.np.playstation.com`, `image.api.playstation.com`, `psnobj.prod.dl.playstation.net` | PlayStation sign-in, games, trophies, covers | Token |
| `accounts.nintendo.com`, `api.accounts.nintendo.com`, `api-lp1.znc.srv.nintendo.net`, `atum-img-lp1.cdn.nintendo.net` | Nintendo sign-in, play activity, covers | Session token |
| `nxapi-auth.fancy.org.uk`, `nxapi-znca-api.fancy.org.uk` | Signing service for Nintendo requests | Nintendo Account id token, account id, the app's requests and answers |
| `comicvine.gamespot.com` | Comic search, with a key | Title, key |
| `www.youtube.com`, `www.youtube-nocookie.com`, `i.ytimg.com`, `player.vimeo.com`, `www.dailymotion.com` | Trailers | Video id |
| `twitter.com`, `t.me`, `wa.me`, `www.reddit.com`, `www.facebook.com`, `www.linkedin.com`, `vk.com`, `bsky.app`, `www.pinterest.com` | Share buttons | Caption with title, score and link; the image stays local |

`specs.openid.net` only names the OpenID fields in the Steam sign-in request; nothing is sent to it.
</details>

## Support

Questions go to [Discussions](https://github.com/venvk/obsidian-library-plugin/discussions), bugs and ideas to [Issues](https://github.com/venvk/obsidian-library-plugin/issues/new/choose). Released under the [MIT License](LICENSE).

<a href="https://buymeacoffee.com/venvk"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=venvk&button_colour=BD5FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a coffee" height="44"></a>

<details>
<summary>Crypto</summary>

| Network | Address |
| --- | --- |
| EVM | `0xf9B4807E107f6f8Db79D86aCef6072A31d570201` |
| Sui | `0x1d6989810ee7e55d43f65398253b02462b921e9ce8ad626b542929f02c3d3e9a` |
| Sol | `2jmrmQrLVeUDFgHzSkHvHKBrmRJXes5X8h3GHXxrLaX6` |
| BTC | `bc1q4pdlj35uev8r0rgncpmn999n3jvj472pppds6r` |
| TON | `UQCphscY14j0AiRY1lGPciQjd9_XcRbUDyPLDxG4O1unEpgM` |
| Tron | `TYhmDLfx7aGHL1ikmNN3t72oGB3DjBjydR` |

</details>
