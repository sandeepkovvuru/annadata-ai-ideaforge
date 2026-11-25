# AgriPredict AI — Bootstrap + Flexbox Edition

A local-development frontend for the AgriPredict AI project using:

- HTML5
- Bootstrap 5.3 for responsive navigation, form controls, alerts and tables
- Custom CSS with Flexbox for the page layout and dashboard cards
- Vanilla JavaScript for location lookup, weather data, risk screening and model output
- A dependency-free Node.js 20+ server for static hosting and a same-origin proxy to the deployed prediction API

Live application: https://agripredict-ai.hatchable.site

## Project structure

```text
agripredict-ai-bootstrap/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js 20 or newer
- npm (included with Node.js)
- Internet connection (Bootstrap CDN, Google Fonts, Open-Meteo and the deployed prediction API are used)

No npm dependencies are required.

## Run locally — Windows

1. Extract this ZIP file.
2. Open the extracted `agripredict-ai-bootstrap` folder in VS Code.
3. Open Terminal → New Terminal.
4. Check Node.js:

```powershell
node --version
npm --version
```

5. Start the app:

```powershell
npm start
```

6. Open this address in Chrome:

```text
http://localhost:3000
```

To stop the server, return to the terminal and press `Ctrl + C`.

You can also run it without npm:

```powershell
node server.js
```

## How the local app works

- Open-Meteo Geocoding API resolves the entered location.
- Open-Meteo Forecast API returns current conditions and a seven-day forecast.
- The browser calculates a transparent 0–100 weather-stress screening indicator from heat, excess rainfall, low rainfall and rain probability.
- The frontend posts the selected state, district, crop and season to `/api/hybrid-predict`.
- `server.js` proxies that request to the already-deployed AgriPredict AI endpoint:
  `https://agripredict-ai.hatchable.site/api/hybrid-predict`
- The response contains the historical yield benchmark, Random Forest and XGBoost-style component outputs, evaluation metrics and district climate/soil context.

The local Node server is only a development proxy. The trained model and its artifact remain hosted by the deployed Hatchable backend. The Hatchable-specific backend source and model artifact are not bundled as a standalone local backend in this ZIP.

## Change the upstream API

By default, `server.js` proxies to:

```text
https://agripredict-ai.hatchable.site
```

To use another compatible deployment, set `AGRIPREDICT_API_BASE` before starting the server.

PowerShell:

```powershell
$env:AGRIPREDICT_API_BASE = "https://your-deployment.example"
npm start
```

The upstream must expose `POST /api/hybrid-predict` with the AgriPredict AI request and response contract.

## Important model limitation

The machine-learning output is a **retrospective 2013 reference scenario**. The model was trained using historical yield records through 2011, validated on 2012 and evaluated on a 2013–2014 temporal holdout. It is not a current-season or 2026 yield forecast.

The live seven-day weather dashboard is separate from the historical yield model and its current forecast values are not inputs to the yield estimate.

Reported holdout metrics:

| Model | MAE (t/ha) | RMSE (t/ha) | R² |
|---|---:|---:|---:|
| Crop-season baseline | 2.359 | 7.849 | 0.639 |
| Random Forest | 1.773 | 6.809 | 0.728 |
| XGBoost-style GBDT | 1.892 | 7.292 | 0.688 |
| Weighted hybrid | 1.822 | 7.040 | 0.710 |

Random Forest performed better than the hybrid blend on the reported test metrics. The app shows both results rather than claiming the hybrid was the best-performing model.

The 0–100 climate risk index is an explainable weather-stress screening heuristic, not a validated probability of crop loss. Crop advice is indicative and should be checked with local agricultural experts.

## Add this project to your existing GitHub repository

Your repository already exists and contains an earlier prototype. Preserve those files and add this project as a new `agripredict-ai/` folder.

### 1. Clone your existing repository

Open PowerShell in the folder where you want the repository:

```powershell
git clone https://github.com/sandeepkovvuru/annadata-ai-ideaforge.git
cd annadata-ai-ideaforge
```

### 2. Copy this project into `agripredict-ai/`

Extract the ZIP. Then copy the **contents** of the extracted `agripredict-ai-bootstrap` folder into a new `agripredict-ai` folder inside the cloned repository.

Example PowerShell command (adjust the Downloads path if needed):

```powershell
New-Item -ItemType Directory -Force agripredict-ai
Copy-Item "C:\Users\YOUR_USER\Downloads\agripredict-ai-bootstrap\*" ".\agripredict-ai\" -Recurse -Force
```

Make sure hidden files such as `.gitignore` are also copied if you want them.

### 3. Update the repository root README

Keep the existing prototype files. Update the root `README.md` so AgriPredict AI is introduced as the current IDEA//FORGE submission, and link to:

```text
agripredict-ai/README.md
```

A suggested root README introduction is provided in `ROOT_README_SNIPPET.md`.

### 4. Review, commit and push

```powershell
git status
git add README.md agripredict-ai
git diff --cached --stat
git commit -m "Add AgriPredict AI Bootstrap and Flexbox project"
git push origin main
```

If Git reports that your local branch is behind `origin/main`, run `git pull --rebase origin main`, resolve any conflicts, then push again. Do not use `git push --force`.

If Git prompts for authentication, complete the browser sign-in flow or use Git Credential Manager. Do not paste your password or token into source files.

## After pushing

Open:

https://github.com/sandeepkovvuru/annadata-ai-ideaforge

Check that the uploaded files are visible on the `main` branch. The ZIP is a local-development edition; it does not automatically deploy to Hatchable or update the already-live website.
