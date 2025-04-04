# Changelog

All notable changes to this project will be documented in this file.\
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.4.2]

### Added
- Added back in CORS restrictions for the configuration API routes. 
- Complete redesign of the configuration page
- API keys now tested before being saved.. this mitigates issues with poorly copied keys
- Finally switched to React.
- Frontend is now much more mangaeable.
- Configuration endpoints now properly setup
- Created /config.json endpoint for runtime variables so we only need to manage 1 ENV file
- Added JWT token to a cookie for better management. Much easier to maintain now.
- Added TMDB language setting to configuration -- when you set this your catalogs will automatically be set to that language.
- Added OMDB key to API Keys

### Changed
- Now users can select if they want trakt catalogs or not on the config page.
- Manifest file now detects if the user has Trakt favorites, if they do, the catalog is included
- Changed the wording for catalog activation... opting out confuses people. Now there are proper toggle switches. ON/OFF.
- JWT_SECRET must be disabled in local deployment, hates 'localhost' domain. Will fix later.
- Watched shows are now removed from responses when Trakt is enabled.

---

## [1.4.1]

Addon will create special lists within your trakt account so you can use these recommendations in other places! Updates every 3 hours~ish

### Added
- Added Featherless.ai integration. **THIS IS SUPER UNTESTED** so if you find errors, please open an issue.
- Added Google ReCaptcha to the configure page.
- If you want to use ReCaptcha, add these environment variables: CAPTCHA_SITE_KEY CAPTCHA_SECRET_KEY
- I will work to be able to disable this next as I know the self-host community doesn't give a fuck about this. And adding this adds an uneeded complexity.
- The addon now creates 4 custom lists in your trakt account, -watched, and -favorites which holds the recommendations. This allows you to use our recommendations in other apps easily.
- List creation is optional and by default is false. So we won't create any lists if you dont want to.

### Changed
- App no longer manages deleting lists
- Qstash is no longer a requirement for the Trakt lists -- although I highly recommend it.
- Removed the requirement of JWT_SECRET; It's good for production but really a pain in the ass when self hosting or debugging.
- Changed the names of the Trakt Lists we create, they are now human readable
- Combined both movie and series lists into one as Trakt allows it and it cleans up your lists.

### Fixed
- Fixed issues with Trakt creating multiple lists, sorry for that mess!
- Fixed issue with timeout with Trakt.
- Fixed wild naming issues.. kind of.. Upgrading to Stremio V5 helps a little bit. Removed redundant 'movie' 'series' from the manifest file.
- Removed a CORS restriction I believe to be causing the 'keys store' issue.

---

## [1.4.0]

This version doesn't have any breaking changes but introduces the ability to add new AI models.

### Added
- Added Error display for bad API Keys. Return API errors direct to users now.
- Updated local docker-compose file.
- Reduced more required ENV's. No external databasing is now required. You are now able to fully local host this biiiittch.
- Stremio 5 allows me to get the users language from the headers, now trending movies will be based on language. Cool!
- Added Ngrok to the Devcontainer directly.
- Ngrok will start when the dev container is started
- NGROK_TOKEN is needed in dev mode.
- Added QStash for faster cache updating, away from the application. Greatly improving cache refresh. Hopefully this fixes the issues people were reporting about missing metadata.
- Added Anthropic Claude integration. Model is set to 3.5 (no api access to 3.7 yet! + cost and all that.)
- Added more metadata. I'll keep adding as I find more and more and more.
- Added 'lang' to the ai's response. This provides the ISO 639-1 standard 2 letter code. This has greatly improved the multiligual support. The cache as it sits, is 98% english, so response times will be slightly slower for awhile.
- Added caching to all static pages, best practices and all that. (This is actually a pain in the ass when testing)
- Added security to the api endpoint.
- OpenAI is now integrated. Be careful as this is the most expensive provider. I do my best to cache as much as possible to save us all money!
- DeepSeek is now integrated. BE AWARE: I have disabled this provider due to stability issues. **This provider is pretty untested as the API kept dropping when I was testing**
- The ability to add new AI providers within aiProviders.ts
- ai.ts now only handles Prompt management.
- Environment variable AI_MODEL is now removed.
- New Environment variables: GOOGLE_MODEL and OPENAI_MODEL.
- Added OMDB fallback for Movies. Doesn't do so good with TV and don't want to waste a request. -- I'll add the ability for users to use their own key later, we are going to hit limits I'm sure !

## Changed
- Removed the requirement of Upstash. Now can be locally hosted without the need for outside services. SEE README.
- More effecient key retreval. Do a single request for all keys and a single set for all keys. This will fix the issue of 2MILLION requests within 5 days! Ooops that's an expensive mistake!
- Added a check of the tmdbKey supplied by the user, if it fails, set to default.
- Changed some language settings based on TMDB documentation.
- Reduced repeating code in the tmdb module.
- Moved the cache refresh away from the main application logic.
- Changed cache structure to hold on to more metadata.
- Simplified the state object being passed to the Catalog handler.
- Split the Javascript out of the configure html file -- it's just the right thing to do.
- Moved some helper functions around
- Changed the way the AI requests are made by creating a helper function to cut down on repeating code.

## Fixed
- Fixed issues with the docker container. Should now run properly for everyone.
- Fixed error with metadata handling. Responses are much better now. Removed useless checks.
- Fixed the broken pipe. Shoved a favicon in. Now we won't flood.
- Fixed issue with caching new responses from tmdb.
- Repaired Cinemeta fallback. We should now get lots of new movies!
- Probably actually broke some shit rather then fixing. Let me know what you find.

---

## [1.3.0]

This version has some major breaking changes, if you are self hosting, be prepared.

### Added
- Trakt is now integrated. Using Oauth.
- Added recommendations based on recently watched movies and series

### Changed
- User keys are now stored using AES256. This is required as we are using Oauth with trakt.
- Install URL has changed, each user is now assigned a unique userid 
- Users can now change their keys without needing to reinstall.
- Redis is now a requirement. This is where the encrypted keys are stored.
- On the configuration page, keys are stored client-side in session storage. This is cleared when the browser is closed. This is needed to keep keys from disappearing when the user connects to trakt.

---

## [1.2.4] - 2025-02-19

### Added
- RPDB_FREE_API_KEY is now a required ENV. We use it to make sure the rateposter API is online.
- Added /health endpoint. This will simply return plain text OK if all systems are good to go. If checks fail, it returns 500 error and json data on which service is down.
- Use Deno cron to clear Vector cache every 30 days. This will force a refetch to get the latest recommendations from AI.
- Deno Cron is in beta, so we will run it for awhile and test. We shall see.
- Cron timing can be adjusted by using the RESET_VECTOR_CRON environment variable. (defaults to 30 days)
- A better option would be to use TTL but at this moment, Upstash does not support TTL on their vectors.
- SEMANTIC_PROXIMITY=0.95 # Defaults to 0.95 max value of 1.00

### Changed
- Made redis request parallel too.

## [1.2.3] - 2025-02-18

### Added
- Added DISABLE_CACHE env. Setting DISABLE_CACHE=true will disable all caching and removes the need for Upstash. Great for self hosting. Speed seems decent, but be aware that every request will hit your APIs.
- Added ROOT_URL env.
- We now send small HEAD requests to make sure the posters are actually there before returning to the user. If there is a reduction in speed we will add a timeout.

### Fixed
- Fixed an issue with TMDB returning an empty response. Return early to fix
- Fixed mobile formatting on the configure page

### Changed
- Changed all console.log's to log or logError for better more robust handling.
- Changed the AI prompt for better answers.
- Moved to a structured response from Gemini, this has brought the parsing errors to 0!
- Moved some repeating code to helper functions.

---

## [1.2.2] - 2025-02-16

### Changed
- Added SEARCH_COUNT ENV variable to make it easier to adjust returned amounts.
  20 is default.

---

## [1.2.1] - 2025-02-15

### Fixed
- Now run all Rating Poster requests in parallel. This has greatly improved
  performance. The things you forget when moving fast.
- Moved RPDB logic to the handler level to be more SOLID.
- Fixed version numbering so we aren't jumping major versions so quickly!

---

## [1.2.0] - 2025-02-15

This is a breaking change. Users need to reinstall.

### Added
- Rating Poster API now used.

### Changed
- User keys are now URL encoded using base64. NOT ENCRYPTED.

---

## [1.1.1] - 2025-02-14

### Added
- Trending now on homepage
- Cinemeta is now used as a backup source
- Added ai.filmwhisper.dev
- Added CHANGELOG

### Changed
- Removed west2 location
- Added euro2 and aus1 locations

---

## [1.1.0] - 2025-02-13

This is a breaking change users will have to reinstall.

### Added
- Added TV series

### Changed
- Changed vector structure

---

## [1.0.1] - 2025-02-11

### Added
- Added AI Recommended section to homepage

### Fixed
- Fixed issue with 404 on homepage

---

## [1.0.0] - 2025-02-10

### Added
- Initial release of the project.
- Core functionality currently only does movies.
