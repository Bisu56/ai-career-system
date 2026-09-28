import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
import joblib


kaggle = pd.read_csv("dataset/careers.csv")
curated = pd.read_csv("dataset/careers_curated.csv")
djinni = pd.read_csv("dataset/careers_djinni.csv")


def build():
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
        max_features=40000,
        stop_words="english",
    )
    model = LogisticRegression(max_iter=2000, C=10, class_weight="balanced")
    return vectorizer, model


train_cvs, test_cvs = train_test_split(djinni, test_size=0.2, random_state=7, stratify=djinni["career"])
train = pd.concat([kaggle, curated, train_cvs], ignore_index=True)

vectorizer, model = build()
model.fit(vectorizer.fit_transform(train["text"]), train["career"])
predicted = model.predict(vectorizer.transform(test_cvs["text"]))
print(f"Held-out real CVs: {len(test_cvs)} | accuracy {accuracy_score(test_cvs['career'], predicted):.3f} "
      f"| macro F1 {f1_score(test_cvs['career'], predicted, average='macro'):.3f}")

data = pd.concat([kaggle, curated, djinni], ignore_index=True)
vectorizer, model = build()
model.fit(vectorizer.fit_transform(data["text"]), data["career"])

joblib.dump(model, "model.pkl")
joblib.dump(vectorizer, "vectorizer.pkl")

print(f"Model trained successfully on {len(data)} rows across {data['career'].nunique()} careers")
