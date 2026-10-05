# JezArch data loader (self-contained)

Everything needed to import the inventory dataset into a running JezArch instance:

- `units.json` — the full inventory dataset (units + child documents)
- `load-data.ts` — the loader script (no dependencies beyond Bun)

## Requirements

- [Bun](https://bun.sh) installed
- A running JezArch instance, with the admin password known
  (bootstrap password: env `JEZARCH_INITIAL_ADMIN_PASSWORD`, or the one set at first start)

## Load the data — one liner

```sh
bun load-data.ts                          # defaults: http://localhost:8080, password "admin"
bun load-data.ts <baseUrl> [password]     # e.g. bun load-data.ts http://localhost:9000 s3cret
```

The password can also be provided via the `SEED_ADMIN_PASSWORD` env variable.

The loader is **idempotent**: units already present in the app are skipped, and progress is
tracked in `.load-state.json` (created next to this file), so an interrupted run can be resumed
safely by running the same command again.

---

# Ładowarka danych JezArch (samodzielna)

Wszystko, co potrzeba, aby zaimportować dane inwentaryzacyjne do działającej instancji JezArch:

- `units.json` — pełny zbiór danych (jednostki + podległe dokumenty)
- `load-data.ts` — skrypt ładowania (bez zależności poza Bunem)

## Wymagania

- zainstalowany [Bun](https://bun.sh)
- działająca instancja JezArch i znane hasło administratora

## Zaimportuj dane — jedna komenda

```sh
bun load-data.ts                          # domyślnie: http://localhost:8080, hasło "admin"
bun load-data.ts <baseUrl> [hasło]        # np. bun load-data.ts http://localhost:9000 s3cret
```

Hasło można też podać przez zmienną środowiskową `SEED_ADMIN_PASSWORD`.

Skrypt jest **wielokrotnie wykonywalny (idempotentny)**: jednostki już obecne w aplikacji są
pomijane, a postęp zapisywany jest w `.load-state.json`, więc przerwany import można wznowić
tą samą komendą.
