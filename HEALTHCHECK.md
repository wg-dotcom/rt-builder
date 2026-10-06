# Builder release checks

Build: 2026-10-06.1

The regression suite runs in jsdom. It does not use a browser, contact external services, read credentials, or publish candidate pages. The publisher is mocked.

Run with an installed jsdom module:

```
JSDOM_MODULE=/absolute/path/to/jsdom/lib/api.js node tests/run-healthcheck.cjs
```

Optional positional arguments are local presentation HTML fixtures. These stay local. Do not commit member or candidate fixtures to this repository.

Covered: new pages; exact batch filters; salary preservation; three card families; batch append and replacement; advisor changes; default batch; ordering and counts; duplicate IDs; edited previews; embedded CVs and videos; comparison tables; unreadable CV hard stops; publish locking; exact live-content comparison.

Release check: 28/28 passed with five local Rubicon presentation fixtures. Publisher `/health` returned OK. No candidate page was republished during the healthcheck.

Limits: DOM checks do not prove that a private Drive resource is accessible to a member, that video playback works in every browser, or that AI extraction is factually correct. Verify resource access and extracted facts before sharing. Existing published pages change only when explicitly updated; a builder release does not silently rewrite them.

Before each release: run the suite, check JavaScript syntax and `git diff --check`, bump `BUILDER_BUILD_STAMP`, push only reviewed files, and verify the served builder matches the commit. Test live publishing only with an approved test destination.
