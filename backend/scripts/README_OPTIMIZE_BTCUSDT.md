# BTCUSDT Backtest Optimization Script Guide

This directory contains a specialized script for automatically finding the optimal trading parameters for BTCUSDT using historical data from the Firemarkets database.

## 1. Overview
The `optimize_btcusdt.py` script performs a high-speed grid search across multiple parameters (Day of week, Hour of day, RSI thresholds) to identify the conditions that would have yielded the highest Return on Investment (ROI) over various historical periods.

### Key Features:
- **Multi-Period Analysis**: Automatically calculates best parameters for 1 Month, 3 Months, 6 Months, and 1 Year.
- **Seasonal Strategy**: Compares results against the traditional "Sell in May" (November to May) strategy.
- **Intelligent Caching**: Skips previously simulated conditions using the `btcusdt_optimization_results.json` file to save time.

## 2. Setting Up & Running

To run the script, use the following command inside your project directory (where `docker-compose.yml` is located):

```bash
docker-compose exec backend python3 scripts/optimize_btcusdt.py
```

### Script Location:
- **Host**: `backend/scripts/optimize_btcusdt.py`
- **Container Path**: `/app/scripts/optimize_btcusdt.py`

## 3. Parameter Search Space
The script currently iterates through the following combinations:
- **Entry Day**: `Any`, `Mon`, `Wed`, `Fri`, `Sun`
- **Entry Hour**: `None` (any hour), `0`, `4`, `8`, `12`, `16`, `20` (UTC)
- **RSI Threshold**: `30`, `40`, `50`, `60` (Lower bound for buy signals)
- **Exit Logic**: Fixed RSI > 70 or seasonal month changes.

## 4. Understanding Output Files

### `btcusdt_optimization_results.json`
This file is automatically updated every time the script runs. It contains:
1. **`best_results`**: The top-performing parameters for each look-back period.
2. **`cache`**: A full history of all simulated combinations. 
    - Key format: `{start_date}_{end_date}_{hour}_{day}_{rsi}`
    - This allows the script to avoid repeating expensive simulations if the data range hasn't changed.

## 5. Interpreting Results
- **ROI**: The percentage return on the initial capital ($1,000) for the specified period.
- **Params (Hour, Day, RSI)**: 
    - `Hour`: The specific UTC hour when the trade is executed.
    - `Day`: The specific day of the week to check for entry.
    - `RSI`: The RSI value below which the script triggers a "Buy" signal.

## 6. Customization
To add more hours or custom RSI values, you can modify the following lists in the `optimize()` function within `optimize_btcusdt.py`:

```python
hours = [None, 0, 4, 8, 12, 16, 20]
days = ['Any', 'Mon', 'Wed', 'Fri', 'Sun']
rsi_values = [30, 40, 50, 60]
```

---
*Created for Firemarkets Quantitative Dashboard Analysis.*
