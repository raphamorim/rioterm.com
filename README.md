# rioterm.com

Source for [rioterm.com](https://rioterm.com), the Rio Terminal documentation
site. Built with [Docusaurus](https://docusaurus.io/).

The site previously lived at `docs/` inside [raphamorim/rio](https://github.com/raphamorim/rio)
and was moved here per [rio#1525](https://github.com/raphamorim/rio/issues/1525)
to keep the main repo lean.

## Local development

Requires Node.js 20+.

```sh
npm ci
npm start
```

Opens a dev server with hot reload at <http://localhost:3000>.

## Build

```sh
npm run build
```

Outputs the static site to `build/`.

## Deployment

Pushes to `main` are deployed automatically by
[`.github/workflows/docs.yml`](./.github/workflows/docs.yml): the workflow
builds the site and publishes `build/` to the `gh-pages` branch via
`peaceiris/actions-gh-pages`. GitHub Pages serves `gh-pages` at
[rioterm.com](https://rioterm.com) (custom domain wired via `static/CNAME`).

## Translations

Locale sources live under `i18n/`. Supported locales: `en`, `ko`, `pt-br`,
`es`, `pl`, `ja`, `zh-hans`, `zh-hant`.

To preview a non-default locale locally:

```sh
npm start -- --locale pt-br
```
