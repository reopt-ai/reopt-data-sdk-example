# Replay font fixture

`JetBrainsMono-Regular.woff2` is the unmodified JetBrains Mono font distributed
with the PostHog reference checkout. Its SIL Open Font License and copyright
notice are included in `OFL.txt`. It is served only as a public static font for
the replay diagnostic lab; it does not change the storefront font.

Run `node scripts/build-replay-assets.mjs` from the example root after changing
the reviewed public image/font files. The generated manifest is imported only
by the diagnostic provider. Never add visitor uploads or personalized assets.
