import os
import sys

# Ensure src module is in the python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.analysis.frequencies import calculate_frequencies
from src.analysis.stats_calc import calculate_statistics
from src.analysis.subsets import calculate_subsets
from src.analysis.generate_exports import export_all

def run_all():
    print("Starting data analysis pipeline...")
    db_path = 'teiko.db'
    
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found. Please run load_data.py first.")
        sys.exit(1)
        
    calculate_frequencies(db_path)
    calculate_statistics(db_path)
    calculate_subsets(db_path)
    export_all(db_path)
    
    print("Analysis pipeline complete!")

if __name__ == "__main__":
    run_all()
