import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib


data = pd.read_csv("dataset/careers.csv")

X = data["text"]
y = data["career"]


vectorizer = TfidfVectorizer()

X_vectors = vectorizer.fit_transform(X)


model = LogisticRegression(max_iter=1000)

model.fit(X_vectors, y)


joblib.dump(model, "model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print("Model trained successfully")
