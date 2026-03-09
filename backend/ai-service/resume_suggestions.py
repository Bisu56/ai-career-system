def generate_resume_suggestions(missing_skills, resume_score):
    suggestions = []
    
    if resume_score < 50:
        suggestions.append("Your resume needs significant improvement.")
    elif resume_score < 75:
        suggestions.append("Your resume is good but can be improved.")
    else:
        suggestions.append("Your resume looks great! Keep it up.")
    
    if missing_skills:
        suggestions.append(
            "Add these important skills: " + ", ".join(missing_skills)
        )
    
    suggestions.append("Add measurable achievements (numbers, results, percentages)")
    suggestions.append("Include projects related to your target career")
    suggestions.append("Keep your resume within 1-2 pages")
    suggestions.append("Use action verbs to describe your responsibilities")
    suggestions.append("Quantify your achievements where possible")
    
    return suggestions
