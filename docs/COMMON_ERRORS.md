### When running with CACHE_DISABLED

``` shell
Error processing series catalog request for "SEACH QUERY HERE" Failed after 3 attempts. Last error: Resource has been exhausted (e.g. check quota).
```

This happens when the Gemini rate limit is hit. When you return to the 'Home' screen in Stremio your search is made again.
If you go back and forth between media, your search is made multiple times.

When Caching is enabled, this error is not seen as we just return the cached search, and do not send another request to Gemini.

---

### Uncaught error:
``` shell
[uncaught application error]: BadResource - Bad resource ID
```

This error seems to happen when a user moves away from the page before we are done with the request, it can be ignored.

---

### My keys won't update on the configure page

You have most likely hit this endpoint to much in the last hour. You will need to wait before you can change your keys again. Sorry. If it is continueous, it's probably a bug, please report it on github!

---

### Search is not returning many results.

I've noticed in the last day or so we are hitting rate limits on TMDB and OMDB. The default keys are just not cutting it! If you are using the default 
keys please uninstall and reinstall using your own keys.