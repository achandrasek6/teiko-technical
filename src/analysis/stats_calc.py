import sqlite3
import pandas as pd
import numpy as np
from scipy import stats

def calculate_statistics(db_path='teiko.db'):
    """Performs statistical analysis comparing responders vs non-responders."""
    conn = sqlite3.connect(db_path)
    
    # Query for Melanoma, miraclib, PBMC
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
    
    df = pd.read_sql_query(query, conn)
    
    populations = df['population'].unique()
    results = []
    
    for pop in populations:
        pop_data = df[df['population'] == pop]
        responders = pop_data[pop_data['response'] == 'yes']['percentage']
        non_responders = pop_data[pop_data['response'] == 'no']['percentage']
        
        import json
        if len(responders) < 3 or len(non_responders) < 3:
            # Not enough data for robust statistical testing (shapiro requires >= 3)
            results.append({
                'population': pop,
                'test_used': 'None (Insufficient data)',
                'p_value': None,
                'significant': False,
                'diagnostics': json.dumps({'error': 'Insufficient data'})
            })
            continue
            
        # Test for normality (Shapiro-Wilk) on raw data
        _, p_norm_res = stats.shapiro(responders)
        _, p_norm_non = stats.shapiro(non_responders)
        
        is_normal = (p_norm_res > 0.05) and (p_norm_non > 0.05)
        
        diagnostics = {
            'shapiro_raw_res_p': float(p_norm_res),
            'shapiro_raw_non_p': float(p_norm_non),
            'levene_p': None,
            'shapiro_trans_res_p': None,
            'shapiro_trans_non_p': None
        }
        
        if is_normal:
            # Check variance (Levene's test)
            _, p_var = stats.levene(responders, non_responders)
            equal_var = p_var > 0.05
            diagnostics['levene_p'] = float(p_var)
            
            # T-test
            stat, p_val = stats.ttest_ind(responders, non_responders, equal_var=equal_var)
            test_used = "T-Test" if equal_var else "Welch's T-Test"
        else:
            # Attempt Arcsine Square Root Transformation (data is 0-100, so divide by 100 first)
            trans_res = np.arcsin(np.sqrt(responders / 100.0))
            trans_non = np.arcsin(np.sqrt(non_responders / 100.0))
            
            # Test normality on transformed data
            _, p_norm_trans_res = stats.shapiro(trans_res)
            _, p_norm_trans_non = stats.shapiro(trans_non)
            is_trans_normal = (p_norm_trans_res > 0.05) and (p_norm_trans_non > 0.05)
            
            diagnostics['shapiro_trans_res_p'] = float(p_norm_trans_res)
            diagnostics['shapiro_trans_non_p'] = float(p_norm_trans_non)
            
            if is_trans_normal:
                # Check variance on transformed data
                _, p_var = stats.levene(trans_res, trans_non)
                equal_var = p_var > 0.05
                diagnostics['levene_p'] = float(p_var)
                
                # T-test on transformed data
                stat, p_val = stats.ttest_ind(trans_res, trans_non, equal_var=equal_var)
                test_used = "T-Test (Arcsine Transformed)" if equal_var else "Welch's T-Test (Arcsine Transformed)"
            else:
                # Still not normal, fall back to non-parametric on raw data
                stat, p_val = stats.mannwhitneyu(responders, non_responders, alternative='two-sided')
                test_used = "Mann-Whitney U"
            
        results.append({
            'population': pop,
            'test_used': test_used,
            'p_value': float(p_val),
            'significant': bool(p_val < 0.05),
            'diagnostics': json.dumps(diagnostics)
        })
        
    results_df = pd.DataFrame(results)
    results_df.to_sql('statistical_results', conn, if_exists='replace', index=False)
    conn.close()
    
    print("Part 3: Statistical tests completed and saved to 'statistical_results' table.")

if __name__ == "__main__":
    calculate_statistics()
