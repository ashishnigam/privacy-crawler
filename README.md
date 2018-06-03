# Privacy Crawler

Is an extension for Google Chrome that crawls a website for cookies and fingerprinting behaviour.

# What this does

The extension loads the page specified as the _root_ element, follows links recursively up to the specificed _depth_, and produces a report showing

  - what cookies first appeared at what page, together with their domains, expiry times and values;
  - what Javascript is accessed that could be used to fingerprint the browser.

# Warnings and recommendations

When starting to crawl, this extension will delete all cookies in the current environment. It is recommended to run crawls in incognito mode to avoid logging you out from sites from non-incognito mode.

This extension also patches the Javascript environment to

  - determine which functions and objects are accessed;
  - make time faster, since some trackers are set to load pixels and Javascript after a delay, and crawling takes too long if we waited in real time.

Therefore it's recommended to only have this extension enabled when you are crawling.

# Attributions

The "paws" logos are adapted from "Track by Vladimir Belochkin from the Noun Project"
