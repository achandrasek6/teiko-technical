import os
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def export_all(db_path='teiko.db', output_dir='outputs'):
    """Exports tables to CSV and generates boxplot PNGs."""
    print(f"Exporting static files to {output_dir}/...")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    conn = sqlite3.connect(db_path)
    
    # 1. Export tables to CSV
    tables = [
        'relative_frequencies',
        'statistical_results',
        'subset_project_samples',
        'subset_responders',
        'subset_gender',
        'subset_avg_b_cells'
    ]
    
    for table in tables:
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
            df.to_csv(os.path.join(output_dir, f"{table}.csv"), index=False)
        except Exception as e:
            print(f"Skipping {table}: {e}")

    # 2. Generate Boxplots
    query = """
    SELECT 
        r.population,
        s.response,
        r.percentage
    FROM relative_frequencies r
    JOIN samples sm ON r.sample = sm.sample_id
    JOIN subjects s ON sm.subject_id = s.subject_id
    WHERE s.condition = 'melanoma' 
      AND s.treatment = 'miraclib'
      AND sm.sample_type = 'PBMC'
    """
    try:
        df = pd.read_sql_query(query, conn)
        
        # Set up seaborn style
        sns.set_theme(style="whitegrid")
        
        populations = df['population'].unique()
        for pop in populations:
            pop_data = df[df['population'] == pop]
            
            plt.figure(figsize=(8, 6))
            ax = sns.boxplot(x='response', y='percentage', data=pop_data, 
                             palette={'yes': '#3b82f6', 'no': '#ef4444'},
                             showfliers=False, order=['yes', 'no'])
            sns.stripplot(x='response', y='percentage', data=pop_data, 
                          color=".3", linewidth=0, alpha=0.5, jitter=True, order=['yes', 'no'])
            
            plt.title(f"{pop} Frequencies: Responders vs Non-Responders")
            plt.xlabel("Response")
            plt.ylabel("Relative Frequency (%)")
            
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, f"boxplot_{pop}.png"), dpi=300)
            plt.close()
    except Exception as e:
        print(f"Error generating plots: {e}")

    conn.close()
    print("Static export complete!")

if __name__ == "__main__":
    export_all()
