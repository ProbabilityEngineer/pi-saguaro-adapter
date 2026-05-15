# pi-saguaro-adapter

[![GitHub](https://img.shields.io/badge/GitHub-ProbabilityEngineer%2Fpi--saguaro--adapter-blue)](https://github.com/ProbabilityEngineer/pi-saguaro-adapter)

Thin Pi extension for Saguaro (`sag`). It runs reviews at turn end and avoids redundant reviews by tracking the last reviewed git `HEAD` and diff.

## Features

- Session startup detection
- One review per new git revision
- Pre-compact and shutdown review safety checks
- `/sag-init`, `/sag-model`, `/sag-rules`, `/sag-index`, `/sag-stats`, `/sag-review`

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
- Command wrappers pass through to the matching `sag` subcommand
