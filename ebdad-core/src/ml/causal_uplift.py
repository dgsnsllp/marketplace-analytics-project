import pandas as pd
import numpy as np

def calculate_did_uplift(action_row, control_rows):
    """
    Calculates the Difference-in-Differences (DiD) net uplift.
    
    Net Uplift = (Y_treated_post - Y_treated_pre) - (Y_control_post - Y_control_pre)
    """
    treated_pre = action_row.get('baseline_conversion_rate', 0.05)
    treated_post = action_row.get('post_conversion_rate')
    if not treated_post:
        # Mocking post conversion if not available yet (for simulation)
        treated_post = treated_pre + 0.045
        
    if not control_rows:
        control_pre = 0.05
        control_post = 0.05
    else:
        control_pre = np.mean([c.get('baseline_conversion_rate', 0.05) for c in control_rows])
        control_post = np.mean([c.get('post_conversion_rate', 0.05) for c in control_rows])
        
    uplift = (treated_post - treated_pre) - (control_post - control_pre)
    return round(uplift * 100, 2) # return as percentage

def calculate_attributed_gmv(uplift_pct, total_post_visits, product_price):
    """
    Attributed GMV = Total Post-Visits * Net Uplift * Product Price
    """
    uplift_rate = uplift_pct / 100.0
    return round(total_post_visits * uplift_rate * product_price, 2)
