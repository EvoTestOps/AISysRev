import pandas as pd

df = pd.read_csv("primary_study_data_time_pressure.csv")
df = df[["title", "abstract", "doi"]]
df = df.dropna()

df.to_csv("mock_data_2.csv",index=False)