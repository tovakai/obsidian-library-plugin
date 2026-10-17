<p align="center">
  <img src="banner.png" alt="Obsidian Library Banner" width="100%">
</p>

<h1 align="center">Library</h1>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square" alt="TypeScript"></a>
  <a href="https://obsidian.md/"><img src="https://img.shields.io/badge/Obsidian-v1.8.7+-7C3AED?style=flat-square&logo=obsidian&logoColor=white" alt="Obsidian v1.8.7+"></a>
  <a href="https://community.obsidian.md/plugins/library"><img src="https://img.shields.io/badge/Community%20Plugin-Published-7C3AED?style=flat-square&logo=obsidian&logoColor=white" alt="Community Plugin"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/releases"><img src="https://img.shields.io/github/v/release/venvk/obsidian-library-plugin?style=flat-square&label=version&color=blue" alt="Version"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/releases"><img src="https://img.shields.io/github/downloads/venvk/obsidian-library-plugin/total?style=flat-square&color=brightgreen" alt="Downloads"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/stargazers"><img src="https://img.shields.io/github/stars/venvk/obsidian-library-plugin?style=flat-square&logo=github&color=f1c40f" alt="Stars"></a>
  <a href="https://github.com/venvk/obsidian-library-plugin/blob/main/LICENSE"><img src="https://img.shields.io/github/license/venvk/obsidian-library-plugin?style=flat-square&color=orange" alt="License"></a>
</p>

<p align="center">
  Your watchlist, reading list, and game backlog become a gallery of covers in plain Markdown notes. Search a title, pick a result, and Library writes the note.
  <br />
  <a href="https://community.obsidian.md/plugins/library">Community Plugins directory</a> · <a href="https://github.com/venvk/obsidian-library-plugin/wiki">Wiki</a>
</p>

## Features

- Movies, series, anime, games, books, comics, and music as notes with cover, year, genres, country, creators, ratings, cast, and trailers where the source has them.
- Open a note and tick episodes or chapters, scoring each; `Progress` counts the ticks and `My Rating` averages your scores.
- Categories filter by year, genre, or country (games also by platform) and sort their titles; what you have not started gathers in Up next.
- Connect AniList, MyAnimeList, PlayStation, Steam, and Nintendo Switch: lists, playtime, trophies, and achievements import as notes and re-import daily on desktop.
- Genres, creators, and actors are links; each linked note collects its titles. Similar titles appear when the source has them.
- Statistics count titles and hours, compare them with "In the same time" equivalents, and add a column for PlayStation, Nintendo, and MyAnimeList.
- Fields sit in frontmatter for Bases and Dataview, with your own template and skipped fields. Works on desktop and mobile in every Obsidian language.

## Quick start

1. Install Library from Community plugins in Settings, or from [GitHub Releases](https://github.com/venvk/obsidian-library-plugin/releases).
2. Open the Library tab from the ribbon, press +, pick what you are adding, and search. The first title of each kind creates its category and folder.
3. For movies and series, add a year after the title to pick between films that share a name: `dune 1984`.

Categories in the Library settings tab reorder by dragging; editing a category's folder renames or moves it, taking the notes inside.

## Sources

| Category | Sources | Preferred source, when set up |
| --- | --- | --- |
| Movies, series | Cinemeta | [OMDb](https://www.omdbapi.com/apikey.aspx) |
| Books | Open Library | [Google Books](https://console.cloud.google.com/apis/library/books.googleapis.com) |
| Games | Steam, Wikidata | [RAWG](https://rawg.io/apidocs) |
| Music | Deezer | |
| Anime | AniList, MyAnimeList (search without an account) | AniList or MyAnimeList sign-in for list import and sync |
| Comics | Wikidata, AniList for manga | [Comic Vine](https://comicvine.gamespot.com/api/) |
| Anything else | Manual: you fill the fields | |

Keys go in the Library settings tab, under API keys: a [TMDB key](https://www.themoviedb.org/settings/api) adds season ratings and stills, a [Twitch application](https://dev.twitch.tv/console/apps) game trailers from IGDB. Steam, PlayStation, and Nintendo Switch connect there too, on desktop; each opens the service's own sign-in page, and Nintendo first asks for consent to use a third-party signing service, as listed below. The Update button in the library header refreshes them all. Details: [API keys](https://github.com/venvk/obsidian-library-plugin/wiki/Sources-and-API-keys), [Steam import](https://github.com/venvk/obsidian-library-plugin/wiki/Steam-library-import).

## Progress and statistics

Books get chapters from Open Library or `Add chapters` in the note header, and anime is one season. A series, anime, or book is done at full progress; a movie needs `Complete` set by hand.

Statistics show the top lists you pick, your hours on movies, series, anime, and games, and a column per platform you add: PlayStation trophies, Nintendo playtime, MyAnimeList counts.

## Anime sync

Connect AniList or MyAnimeList: your started titles arrive as notes with progress and ratings and re-import daily on desktop. Changes push back: progress and score go to MyAnimeList on save and to AniList with the Push command. An import never moves progress backwards and only fills an empty `My Rating`. [Wiki: anime sync](https://github.com/venvk/obsidian-library-plugin/wiki/Anime-sync).

## Frontmatter

```yaml
---
Type: Series
Name: Stranger Things
Year: 2016
Genre: ["[[Drama]]", "[[Horror]]"]
Country: ["United States"]
Creator: ["[[The Duffer Brothers]]"]
Cast: ["[[Winona Ryder]]"]
Rating IMDB: 8.7
Runtime: 42
My Rating: 9
Cover: https://m.media-amazon.com/images/...
URL: https://www.imdb.com/title/tt4574334/
Progress: 8/42
Date: 01.03.2026
Source: omdb
Source ID: tt4574334
---
```

A refresh fills empty fields and updates the source ratings but never your own. The [wiki](https://github.com/venvk/obsidian-library-plugin/wiki/Frontmatter-reference) lists every property.

## Privacy and network use

Your library is plain notes that open offline; covers load from the web. The plugin goes online to search, refresh, sync, or share, at most once every 5 minutes per note, plus one refresh pass after an update or a key change. No telemetry, no self-update; each key goes only to its own service.

| Hosts | Use | Data sent |
| --- | --- | --- |
| `www.omdbapi.com`, `m.media-amazon.com` | Movie search with a key, its posters | Title or IMDb id, key |
| `v3-cinemeta.strem.io`, `images.metahub.space`, `episodes.metahub.space` | Movies, series, stills | Title or IMDb id, genre |
| `api.themoviedb.org`, `image.tmdb.org` | Movie and series details, with a key | IMDb id, key |
| `www.wikidata.org`, `en.wikipedia.org`, `upload.wikimedia.org` | Search, Rotten Tomatoes, trailers, covers, game countries | Search text, ids, game titles |
| `openlibrary.org`, `covers.openlibrary.org` | Books, chapters, covers | Title, author, ISBN, genres |
| `www.googleapis.com`, `books.google.com` | Book search with a key, its covers | Title, key |
| `api.rawg.io`, `media.rawg.io` | Games, with a key | Title or id, genre, key |
| `store.steampowered.com`, `steamcommunity.com`, `cdn.cloudflare.steamstatic.com`, `video.akamai.steamstatic.com`, `shared.akamai.steamstatic.com`, `shared.fastly.steamstatic.com`, `api.steampowered.com` | Games, trailers, Steam import | Title or app id; sign-in and your library on import |
| `www.imdb.com`, `api.graphql.imdb.com` | IMDb connector | Sign-in; your ratings and watchlist are read, and scores and new titles from your notes are sent back |
| `www.netflix.com` | Netflix connector | Sign-in; your viewing activity and thumbs are read, and scores from your notes are sent back as thumbs |
| `id.twitch.tv`, `api.igdb.com` | Game trailers, with Twitch keys | Twitch ID and secret, game |
| `api.deezer.com`, `cdn-images.dzcdn.net` | Music search, covers | Album or artist |
| `graphql.anilist.co`, `anilist.co`, `s4.anilist.co`, streaming services' image hosts | Anime, manga, sync | Title or ids; your token, progress, status, score |
| `myanimelist.net`, `api.myanimelist.net`, `api-cdn.myanimelist.net` | Anime and manga search, covers, sign-in, list import, sync | Search text, your sign-in on MyAnimeList's page (the plugin keeps only the token); your token, progress, status, score |
| `ca.account.sony.com`, `my.account.sony.com`, `m.np.playstation.com`, `web.np.playstation.com`, `image.api.playstation.com`, `psnobj.prod.dl.playstation.net` | PlayStation sign-in, played games, trophies, covers | Your sign-in on Sony's page (the plugin keeps only the token); the token |
| `accounts.nintendo.com`, `api.accounts.nintendo.com`, `api-lp1.znc.srv.nintendo.net`, `atum-img-lp1.cdn.nintendo.net` | Nintendo sign-in, play activity, covers | Your sign-in on Nintendo's page (the plugin keeps only the session token); the tokens |
| `nxapi-auth.fancy.org.uk`, `nxapi-znca-api.fancy.org.uk` | A third-party signing service: signs and encrypts the Nintendo Switch app requests, which Nintendo accepts only from its app; asked before you sign in | Your Nintendo Account id token, account id, and the Nintendo Switch app requests and answers |
| `comicvine.gamespot.com` | Comic search, with a key | Title, key |
| `www.youtube.com`, `www.youtube-nocookie.com`, `i.ytimg.com`, `player.vimeo.com`, `www.dailymotion.com` | Trailers | Video id |
| `twitter.com`, `t.me`, `wa.me`, `www.reddit.com`, `www.facebook.com`, `www.linkedin.com`, `vk.com`, `bsky.app`, `www.pinterest.com` | Share buttons | Caption with title, score, and link; the image stays local |

`specs.openid.net` is the name of the OpenID fields inside the Steam sign-in request; nothing is ever sent to it.

## Commands

- `Open Library`
- `Add content`
- `Search your library`
- `Refresh metadata for current note`, `Refresh metadata of all notes`
- `Rebuild graph links`
- `Find & remove duplicates`
- `Share current note`
- `Push current note to AniList`, `Pull progress from AniList`
- `Push current note to MyAnimeList`, `Pull progress from MyAnimeList`
- `Import from AniList`, `Import from MyAnimeList`
- `Import Steam library`
- `Import PlayStation games and trophies`
- `Import Nintendo games`

## Support

Report bugs and suggest ideas in [Issues](https://github.com/venvk/obsidian-library-plugin/issues/new/choose); ask questions in [Discussions](https://github.com/venvk/obsidian-library-plugin/discussions). The plugin is under the [MIT License](LICENSE).

<a href="https://buymeacoffee.com/venvk"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=venvk&button_colour=BD5FFF&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a coffee" height="50"></a>

<details>
<summary>If the plugin is useful to you, you can support it</summary>

| | Network | Address |
| --- | --- | --- |
| <img src="https://img.shields.io/badge/Ethereum-3C3C3D?style=flat&logo=ethereum&logoColor=white" alt="EVM"> | **EVM** | `0xf9B4807E107f6f8Db79D86aCef6072A31d570201` |
| <img src="https://img.shields.io/badge/Sui-4DA2FF?style=flat&logo=sui&logoColor=white" alt="Sui"> | **Sui** | `0x1d6989810ee7e55d43f65398253b02462b921e9ce8ad626b542929f02c3d3e9a` |
| <img src="https://img.shields.io/badge/Solana-9945FF?style=flat&logo=solana&logoColor=white" alt="Sol"> | **Sol** | `2jmrmQrLVeUDFgHzSkHvHKBrmRJXes5X8h3GHXxrLaX6` |
| <img src="https://img.shields.io/badge/Bitcoin-F7931A?style=flat&logo=bitcoin&logoColor=white" alt="BTC"> | **BTC** | `bc1q4pdlj35uev8r0rgncpmn999n3jvj472pppds6r` |
| <img src="https://img.shields.io/badge/TON-0098EA?style=flat&logo=ton&logoColor=white" alt="TON"> | **TON** | `UQCphscY14j0AiRY1lGPciQjd9_XcRbUDyPLDxG4O1unEpgM` |
| <img src="https://img.shields.io/badge/Tron-EB0029?style=flat&logo=tron&logoColor=white" alt="Tron"> | **Tron** | `TYhmDLfx7aGHL1ikmNN3t72oGB3DjBjydR` |

</details>
