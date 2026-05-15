# pi-saguaro-adapter

[![GitHub](https://img.shields.io/badge/GitHub-ProbabilityEngineer%2Fpi--saguaro--adapter-blue)](https://github.com/ProbabilityEngineer/pi-saguaro-adapter)

Thin Pi extension for Saguaro (`sag`). It runs reviews at turn end and avoids redundant reviews by tracking the last reviewed diff.

## Features

- Session startup detection
- One review per new working diff
- Pre-compact and shutdown review safety checks
- `/sag-model` (terminal-only), `/sag-rules`, `/sag-index`, `/sag-stats`, `/sag-status`, `/sag-hook`, `/sag-review`

## Install

```bash
npm install
npm run build
```

## Load in Pi

Install it with Pi:

```bash
pi install https://github.com/ProbabilityEngineer/pi-saguaro-adapter
```

Then enable it in `pi config` if needed.

## Notes

- Saguaro must be installed as `sag`
- Reviews are advisory by default
- Use this adapter when you want low-noise, turn-end enforcement
- Command wrappers pass through to the matching `sag` subcommand, except interactive ones are blocked or omitted
- `/sag-status` reports whether the adapter sees a repo, `sag`, and last reviewed diff
