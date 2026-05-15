# pi-saguaro-adapter

Thin Pi extension for Saguaro (`sag`). It runs reviews at turn end and avoids redundant reviews by tracking the last reviewed git `HEAD` and diff.

## Features

- Session startup detection
- One review per new git revision
- Pre-compact and shutdown review safety checks
- `/sag-review` command for manual review

## Install

```bash
npm install
npm run build
```

## Load in Pi

```bash
pi --extension /absolute/path/to/pi-saguaro-adapter/dist/index.js
```

## Notes

- Saguaro must be installed as `sag`
- Reviews are advisory by default
- Use this adapter when you want low-noise, turn-end enforcement
