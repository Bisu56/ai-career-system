QUESTIONS = {
    "Data Analyst": [
        "What is data cleaning and why is it important?",
        "Explain the difference between SQL JOIN types (INNER, LEFT, RIGHT, FULL)",
        "What is the difference between UNION and UNION ALL?",
        "How do you handle missing values in a dataset?",
        "What is pandas and what are its main data structures?",
        "Explain the difference between data profiling and data mining",
        "What is the purpose of pivot tables?",
        "How would you explain complex data findings to non-technical stakeholders?"
    ],
    "Frontend Developer": [
        "What is React Virtual DOM and how does it work?",
        "Explain the difference between let, var, and const",
        "What is the difference between == and ===?",
        "What is responsive design and how do you achieve it?",
        "Explain the concept of closures in JavaScript",
        "What is the purpose of state management in React?",
        "How do you optimize website performance?",
        "Explain CSS Box Model"
    ],
    "Backend Developer": [
        "What is REST API and what are its constraints?",
        "Explain MVC architecture pattern",
        "What is middleware and how is it used?",
        "Difference between SQL and NoSQL databases?",
        "What is authentication vs authorization?",
        "Explain database indexing and its types",
        "What are API status codes?",
        "How do you handle errors in API development?"
    ],
    "DevOps Engineer": [
        "What is CI/CD and why is it important?",
        "What is Docker and how does it differ from virtual machines?",
        "Explain Kubernetes architecture and its components",
        "What is Infrastructure as Code?",
        "How do you monitor application performance?",
        "What is the difference between Docker Swarm and Kubernetes?",
        "Explain the concept of microservices",
        "How do you handle security in DevOps?"
    ],
    "ML Engineer": [
        "What is the difference between supervised and unsupervised learning?",
        "Explain overfitting and how to prevent it",
        "What is gradient descent?",
        "How do you evaluate model performance?",
        "Explain the bias-variance tradeoff",
        "What is feature engineering?",
        "Difference between classification and regression?",
        "What are neural networks and how do they work?"
    ],
    "Full Stack Developer": [
        "Explain the MERN/MEAN stack",
        "How do you handle authentication in web applications?",
        "What is the difference between SQL and NoSQL?",
        "How do you optimize database queries?",
        "Explain REST vs GraphQL",
        "What is WebSocket and when would you use it?",
        "How do you handle state management?",
        "What are the best practices for API security?"
    ]
}


def get_interview_questions(career):
    return QUESTIONS.get(career, [
        "Tell me about yourself",
        "What are your strengths and weaknesses?",
        "Why do you want to work here?",
        "Describe a challenging project you've worked on"
    ])
