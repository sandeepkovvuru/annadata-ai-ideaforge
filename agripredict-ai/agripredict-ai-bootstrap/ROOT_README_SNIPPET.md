# AgriPredict AI

**Current IDEA//FORGE 2026 submission · Track 2: Climate, Resource Infrastructure & Global Supply Resilience**

AgriPredict AI is an agricultural intelligence platform that combines live weather insights, an explainable climate-risk screening indicator, district-level climate and soil context, and a historical crop-yield benchmark.

- **Live application:** https://agripredict-ai.hatchable.site
- **Project source and local run instructions:** [agripredict-ai/README.md](agripredict-ai/README.md)
- **Frontend:** HTML5, Bootstrap 5, CSS Flexbox and vanilla JavaScript
- **Local development:** Node.js 20+; run `npm start` inside `agripredict-ai/`

## Model evaluation and limitations

On the 2013–2014 temporal holdout, the hybrid blend achieved MAE 1.822 t/ha, RMSE 7.040 t/ha and R² 0.710. Random Forest achieved a lower MAE of 1.773 t/ha and lower RMSE of 6.809 t/ha, so the hybrid is not described as the best-performing model.

**Important:** The displayed yield estimate is a retrospective 2013 benchmark scenario, not a live 2026 or current-season yield forecast. The live seven-day weather dashboard is separate from the historical yield model.

## Previous prototype

Earlier repository prototype files are retained for reference. The current hackathon submission and its run instructions are maintained under [`agripredict-ai/`](agripredict-ai/).
