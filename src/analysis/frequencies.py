import sqlite3
import pandas as pd

def calculate_frequencies(db_path='teiko.db'):
    """Calculates relative frequencies for each cell population per sample."""
    conn = sqlite3.connect(db_path)
    
    query = """
    WITH sample_totals AS (
        SELECT sample_id, SUM(count) as total_count
        FROM cell_counts
        GROUP BY sample_id
    )
    SELECT 
        c.sample_id as sample,
        t.total_count,
        c.population,
        c.count,
        (CAST(c.count AS FLOAT) / t.total_count) * 100 as percentage
    FROM cell_counts c
    JOIN sample_totals t ON c.sample_id = t.sample_id
    """
    
    df = pd.read_sql_query(query, conn)
    
    # Store this as a table in the database for easy access by the API
    df.to_sql('relative_frequencies', conn, if_exists='replace', index=False)
    conn.close()
    
    print("Part 2: Frequencies calculated and saved to 'relative_frequencies' table.")

if __name__ == "__main__":
    calculate_frequencies()
