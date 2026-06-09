import sqlite3
import pandas as pd

def calculate_subsets(db_path='teiko.db'):
    """Executes subset analysis queries and stores results."""
    conn = sqlite3.connect(db_path)
    
    # 1. Samples from each project
    query1 = """
    SELECT s.project_id, COUNT(sm.sample_id) as num_samples
    FROM samples sm
    JOIN subjects s ON sm.subject_id = s.subject_id
    WHERE s.condition = 'melanoma' 
      AND s.treatment = 'miraclib'
      AND sm.sample_type = 'PBMC'
      AND sm.time_from_treatment_start = 0
    GROUP BY s.project_id
    """
    df1 = pd.read_sql_query(query1, conn)
    df1.to_sql('subset_project_samples', conn, if_exists='replace', index=False)
    
    # 2. Subjects responders/non-responders
    query2 = """
    SELECT s.response, COUNT(DISTINCT s.subject_id) as num_subjects
    FROM samples sm
    JOIN subjects s ON sm.subject_id = s.subject_id
    WHERE s.condition = 'melanoma' 
      AND s.treatment = 'miraclib'
      AND sm.sample_type = 'PBMC'
      AND sm.time_from_treatment_start = 0
    GROUP BY s.response
    """
    df2 = pd.read_sql_query(query2, conn)
    df2.to_sql('subset_responders', conn, if_exists='replace', index=False)
    
    # 3. Subjects males/females
    query3 = """
    SELECT s.sex, COUNT(DISTINCT s.subject_id) as num_subjects
    FROM samples sm
    JOIN subjects s ON sm.subject_id = s.subject_id
    WHERE s.condition = 'melanoma' 
      AND s.treatment = 'miraclib'
      AND sm.sample_type = 'PBMC'
      AND sm.time_from_treatment_start = 0
    GROUP BY s.sex
    """
    df3 = pd.read_sql_query(query3, conn)
    df3.to_sql('subset_gender', conn, if_exists='replace', index=False)
    
    # 4. Average B cells for responders at time=0 for Melanoma males
    # "Considering Melanoma males, what is the average number of B cells for responders at time=0? Use two decimals (XXX.XX)."
    query4 = """
    SELECT AVG(c.count) as avg_b_cells
    FROM cell_counts c
    JOIN samples sm ON c.sample_id = sm.sample_id
    JOIN subjects s ON sm.subject_id = s.subject_id
    WHERE s.condition = 'melanoma'
      AND s.sex = 'M'
      AND s.response = 'yes'
      AND sm.time_from_treatment_start = 0
      AND c.population = 'b_cell'
    """
    df4 = pd.read_sql_query(query4, conn)
    
    val = df4['avg_b_cells'].iloc[0]
    formatted_val = f"{val:.2f}" if pd.notnull(val) else "0.00"
    
    df_res4 = pd.DataFrame([{'metric': 'Average B cells (Melanoma, Male, Responder, time=0)', 'value': formatted_val}])
    df_res4.to_sql('subset_avg_b_cells', conn, if_exists='replace', index=False)
    
    conn.close()
    print("Part 4: Subset queries completed and saved to DB.")

if __name__ == "__main__":
    calculate_subsets()
