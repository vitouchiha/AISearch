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