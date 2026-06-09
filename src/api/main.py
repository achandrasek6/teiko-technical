from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import pandas as pd
import json

app = FastAPI(title="Teiko Technical Assessment API")

# Allow CORS for local frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = 'teiko.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/summary")
def get_summary():
    """Returns the relative frequencies summary table (Part 2)."""
    try:
        conn = get_db_connection()
        df = pd.read_sql_query("SELECT * FROM relative_frequencies", conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/statistics")
def get_statistics():
    """Returns statistical significance tests and boxplot data (Part 3)."""
    try:
        conn = get_db_connection()
        
        # 1. Get test results
        stats_df = pd.read_sql_query("SELECT * FROM statistical_results", conn)
        test_results = stats_df.fillna("").to_dict(orient='records')
        
        # 2. Get raw data for boxplots
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
        raw_data_df = pd.read_sql_query(query, conn).fillna(0)
        
        # Format raw data for Recharts (or Plotly) Boxplot
        # Grouping by population and response to make it easy for frontend to parse
        boxplot_data = {}
        for pop in raw_data_df['population'].unique():
            pop_df = raw_data_df[raw_data_df['population'] == pop]
            responders = pop_df[pop_df['response'] == 'yes']['percentage'].tolist()
            non_responders = pop_df[pop_df['response'] == 'no']['percentage'].tolist()
            boxplot_data[pop] = {
                'responders': responders,
                'non_responders': non_responders
            }

        conn.close()
        
        return {
            "results": test_results,
            "boxplot_data": boxplot_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subset-analysis")
def get_subset_analysis():
    """Returns the results of the specific subset queries (Part 4)."""
    try:
        conn = get_db_connection()
        
        project_samples = pd.read_sql_query("SELECT * FROM subset_project_samples", conn).to_dict(orient='records')
        responders = pd.read_sql_query("SELECT * FROM subset_responders", conn).to_dict(orient='records')
        gender = pd.read_sql_query("SELECT * FROM subset_gender", conn).to_dict(orient='records')
        avg_b_cells = pd.read_sql_query("SELECT * FROM subset_avg_b_cells", conn).to_dict(orient='records')
        
        conn.close()
        
        return {
            "project_samples": project_samples,
            "responders": responders,
            "gender": gender,
            "avg_b_cells": avg_b_cells[0]['value'] if avg_b_cells else "N/A"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
