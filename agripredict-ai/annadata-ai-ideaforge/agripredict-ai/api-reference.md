# Prediction API contract

The local server proxies POST requests to the live API at `https://agripredict-ai.hatchable.site/api/hybrid-predict`.

Expected JSON body:

```json
{
  "state": "Karnataka",
  "district": "Bengaluru Urban",
  "crop": "Rice",
  "season": "Kharif"
}
```

The response includes `prediction_t_ha`, `models`, `inputContext`, `coverage` and `evaluation`. The model runtime and artifact stay hosted on Hatchable.
