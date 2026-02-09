import csv

seen_ids = set()
unique_rows = []
no_id_rows = []

with open('tweets.csv', 'r') as file:
    reader = csv.reader(file)
    header = next(reader)
    
    for row in reader:
        if len(row) > 6 and row[6]:  # has Tweet_ID
            if row[6] not in seen_ids:
                seen_ids.add(row[6])
                unique_rows.append(row)
        else:  # old rows without Tweet_ID
            no_id_rows.append(row)

print(f'Rows with unique Tweet_ID: {len(unique_rows)}')
print(f'Rows without Tweet_ID (from early runs): {len(no_id_rows)}')
print(f'Total unique: {len(unique_rows) + len(no_id_rows)}')

# Write cleaned file
with open('tweets_clean.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(header)
    # Renumber tweet_count
    for i, row in enumerate(no_id_rows + unique_rows, 1):
        row[0] = i
        writer.writerow(row)

print(f'Saved to tweets_clean.csv')