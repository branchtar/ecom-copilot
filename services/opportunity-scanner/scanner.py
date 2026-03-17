import pandas as pd
import random
import json

df = pd.read_csv("data/supplier_catalog.csv")

results = []

for _, row in df.iterrows():
    cost = float(row["Cost"])
    price = round(cost * random.uniform(2.2, 3.5), 2)

    amazon_fee = price * 0.15
    fulfillment = 3.50

    profit = round(price - amazon_fee - fulfillment - cost, 2)
    score = round((profit * 10) + random.uniform(10, 40), 2)
    decision = "LIST" if profit > 3 else "SKIP"

    results.append({
        "UPC": str(row["UPC"]),
        "Title": str(row["Title"]),
        "Cost": cost,
        "Price": price,
        "Profit": profit,
        "Score": score,
        "Decision": decision
    })

print(json.dumps(results, indent=2))