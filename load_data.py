import sqlite3
import pandas as pd
import os

def init_db(db_path: str):
    """Initializes the SQLite database with the normalized schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create Subjects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        subject_id TEXT PRIMARY KEY,
        project_id TEXT,
        condition TEXT,
        age INTEGER,
        sex TEXT,
        treatment TEXT,
        response TEXT
    )
    """)

    # Create Samples table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS samples (
        sample_id TEXT PRIMARY KEY,
        subject_id TEXT,
        sample_type TEXT,
        time_from_treatment_start INTEGER,
        FOREIGN KEY (subject_id) REFERENCES subjects (subject_id)
    )
    """)

    # Create CellCounts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cell_counts (
        sample_id TEXT,
        population TEXT,
        count INTEGER,
        FOREIGN KEY (sample_id) REFERENCES samples (sample_id),
        PRIMARY KEY (sample_id, population)
    )
    """)

    conn.commit()
    return conn

def load_data():
    """Loads data from cell-count.csv into the normalized database schema."""
    # Determine the path of the CSV file
    csv_paths = ['cell-count.csv', 'raw-data/cell-count.csv']
    csv_file = next((p for p in csv_paths if os.path.exists(p)), None)
    
    if not csv_file:
        raise FileNotFoundError("Could not find cell-count.csv in the root or raw-data/ directory.")

    print(f"Loading data from {csv_file}...")
    df = pd.read_csv(csv_file)

    db_path = 'teiko.db'
    conn = init_db(db_path)

    try:
        # 1. Populate Subjects
        subjects_df = df[['subject', 'project', 'condition', 'age', 'sex', 'treatment', 'response']].drop_duplicates()
        subjects_df = subjects_df.rename(columns={'subject': 'subject_id', 'project': 'project_id'})
        subjects_df.to_sql('subjects', conn, if_exists='replace', index=False)

        # 2. Populate Samples
        samples_df = df[['sample', 'subject', 'sample_type', 'time_from_treatment_start']].drop_duplicates()
        samples_df = samples_df.rename(columns={'sample': 'sample_id', 'subject': 'subject_id'})
        samples_df.to_sql('samples', conn, if_exists='replace', index=False)

        # 3. Populate CellCounts (melt the dataframe)
        cell_populations = ['b_cell', 'cd8_t_cell', 'cd4_t_cell', 'nk_cell', 'monocyte']
        counts_df = df.melt(id_vars=['sample'], value_vars=cell_populations, 
                            var_name='population', value_name='count')
        counts_df = counts_df.rename(columns={'sample': 'sample_id'})
        counts_df.to_sql('cell_counts', conn, if_exists='replace', index=False)
        
        print(f"Data successfully loaded into {db_path}!")

    except Exception as e:
        print(f"Error loading data: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    load_data()
