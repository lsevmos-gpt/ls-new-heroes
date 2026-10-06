# ls-new-heroes

Production source for the **«Линия спорта»** club site at **ул. Героев Сталинграда, 6 д, Симферополь**.

## Production

- Public site: `https://ls-promo.ru/`
- Source directory: `site/`
- Hosting: REG.RU Host-Lite
- FTPS host: `server169.hosting.reg.ru`
- FTPS port: `21`
- FTPS user: `u3652448_lspromo`
- Remote root: `/` (FTP user is restricted to the site root)
- Required GitHub Actions secret: `REG_PASSWORD`

Passwords and other credentials are **not stored in the repository**.

## Current site state

The site is now the permanent page of the opened club, not a pre-opening landing page.

Current key information:

- Address: **ул. Героев Сталинграда, 6 д**
- Hours: **Пн–Сб 07:00–23:00; Вс 09:00–19:00**
- The club uses **Graphite cards**
- Exception: active **Green cards** purchased at **ул. Героев Сталинграда, 10** may be used at the new club until their existing expiration date
- «Графитовый старт» is extended through **7 October 2026**
- Promo prices currently shown: **6 months — 19 900 ₽; 12 months — 31 900 ₽**

## Repository structure

- `site/` — exact production website files
- `.github/workflows/deploy-reg.yml` — production deployment to REG.RU over FTPS
- `.github/workflows/import-live-site.yml` — emergency/recovery import of the current live site into `site/`
- `.github/trigger-import-live.txt` — import trigger marker

## Deployment

Normal changes under `site/**` deploy automatically from `main`.

A manual run of **Deploy ls-new-heroes to REG.RU** performs a full synchronization without deleting server-only files.

The workflow verifies the live `index.html`, core JavaScript files and intro soundtrack after upload.

## Intro

The cinematic intro remains part of the production site. Its media, JavaScript and soundtrack are stored in the repository.

The soundtrack is reproducible from:

- `site/assets/audio/formation-final-00.txt`
- ...
- `site/assets/audio/formation-final-08.txt`

and is verified against the production SHA-256 before deployment.

## Migration

Migrated to `lsevmos-gpt/ls-new-heroes` on **6 October 2026** from the previous project setup associated with `EVMOS35/ls-promo`.

The production site itself was imported directly from the live `ls-promo.ru` deployment so the new repository contains the current working version, including binary assets.
