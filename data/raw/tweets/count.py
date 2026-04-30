import csv
from datetime import datetime

file_path = "tweets_filtered.csv"

min_date = None
max_date = None

with open(file_path, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)

    for row in reader:
        created_at_str = row["Created At"]

        dt = datetime.strptime(created_at_str, "%Y-%m-%d %H:%M:%S%z")

        if min_date is None or dt < min_date:
            min_date = dt
        if max_date is None or dt > max_date:
            max_date = dt

print(f"Earliest date: {min_date}")
print(f"Latest date:   {max_date}")