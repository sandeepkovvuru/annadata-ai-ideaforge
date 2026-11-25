# Source and deployment notes

This edition is a Bootstrap/Flexbox local-development frontend based on the deployed AgriPredict AI feature set and API contract.

The actual deployed Hatchable project contains:
- `public/index.html`
- `public/styles.css`
- `public/model.css`
- `public/app.js`
- `api/hybrid-predict.js`
- `public/training/train_climate_soil_hybrid.js`
- `public/MODEL_CARD.md`
- `public/DEMO_SCRIPT.md`
- `public/source/README.md`

This local-development ZIP restructures the frontend and styling to demonstrate Bootstrap 5 and Flexbox. It calls the deployed public prediction API through `server.js`, rather than reimplementing the model locally.

The actual model API depends on Hatchable's `storage` runtime and the separately stored model at:
`models/agripredict-climate-soil-hybrid-v2.json`

The model training script is a separate Node.js reproducibility script and can be obtained from the deployed Hatchable project source. It is not needed to run this frontend against the live prediction API.

Model claims and limitations are documented in `README.md`. Do not label the historical yield output as a live 2026 prediction.
