from datetime import date


def korean_age(birth: date) -> int:
    return date.today().year - birth.year + 1
