# Plan Zajęć WAT

A web-based schedule viewer for students of the **Military University of Technology (WAT)** in Warsaw, Poland. Fetch and display your class timetable directly in the browser — no installation required.

## Features

- **Auto-fetch by group name** — enter your group code (e.g. `WEL24EQ3S1`) and the schedule is downloaded automatically
- **Manual file loading** — drag and drop a local `.htm` plan file as a fallback
- **Multi-faculty support** — covers all major WAT faculties:
  - WEL — Wydział Elektroniki
  - WLO — Wydział Bezpieczeństwa, Logistyki i Zarządzania
  - WML — Wydział Mechatroniki, Uzbrojenia i Lotnictwa
  - IOE — Instytut Optoelektroniki
  - WTC — Wydział Nowych Technologii i Chemii
  - WIM — Wydział Inżynierii Mechanicznej
- **Semester switching** — toggle between winter and summer semesters
- **Today highlight & "now" indicator** — current day and ongoing class are visually marked
- **Autocomplete** — group name suggestions while typing
- **Responsive design** — works on desktop and mobile

## Usage

Open [wat-plan.xyz](https://wat-plan.xyz) in your browser (or serve the files locally), then:

1. Enter your group code in the input field (e.g. `WEL24EQ3S1`)
2. Select the semester (winter / summer)
3. Click **Pobierz plan**

If automatic fetching fails due to network restrictions, use the file upload option to load a `.htm` plan file downloaded manually from your faculty's website.

## Files

| File | Description |
|------|-------------|
| `index.html` | Main entry page — group selection and auto-fetch |
| `viewer.html` | Schedule viewer — renders the parsed timetable |
| `gifs/` | Assets used for decorative elements |
| `CNAME` | Custom domain configuration for GitHub Pages |

## Local Development

No build step required. Just open `index.html` in a browser:

```bash
# Using Python's built-in server to avoid CORS issues
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

> **Note:** CORS proxy usage is slightly expanded when running on localhost to aid development.

## How It Works

Schedule files are hosted as `.htm` files on each faculty's web server. The app constructs the URL from the group name, then fetches it through a CORS proxy (`allorigins.win`, `codetabs.com`) since direct browser requests are blocked by cross-origin policy. The raw HTML is then parsed client-side to extract and render the timetable.

## License

This project is not affiliated with or endorsed by WAT. Schedule data is sourced from official faculty websites.
