from datetime import date


def age_from_date_of_birth(birth_date, today=None):
    if not birth_date:
        return None
    today = today or date.today()
    if birth_date > today:
        return None
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age if 0 <= age <= 120 else None


def age_guidance(birth_date):
    age = age_from_date_of_birth(birth_date)
    if age is None:
        return ""
    tone = (
        "Use gentle, concrete language and familiar school, play, nature, and everyday examples; explain new words."
        if age < 13 else
        "Use a respectful teen-appropriate tone and examples from school, hobbies, technology, and everyday life; avoid talking down."
        if age < 18 else
        "Use an approachable adult tone and practical examples relevant to their interests and goals; avoid patronizing language."
    )
    return (
        f"Learner age from saved profile: {age} years. {tone} "
        "Age guides tone and relatability, not ability: preserve academic depth for their study level and demonstrated understanding. "
        "Do not mention or request their birth date."
    )
