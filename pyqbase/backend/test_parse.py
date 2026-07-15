import json
import re

def parse_taxonomy(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]

    taxonomy = {}
    current_subject = None
    current_topic = None

    for line in lines:
        if line.startswith("Comprehensive ") and "Taxonomy" in line:
            # e.g., "Comprehensive Art & Culture Taxonomy"
            subject_name = line.replace("Comprehensive ", "").replace(" Taxonomy", "").strip()
            current_subject = subject_name
            taxonomy[current_subject] = {}
            current_topic = None
            continue
            
        # Ignore these lines if they happen to appear
        if line in ["Physical Geography", "Indian Geography", "Human Geography", "World Geography", "Map-Based Geography", "Ancient Indian History", "Medieval Indian History", "Transition to Modern India", "British Administration & National Awakening", "Indian National Movement", "Physics", "Chemistry", "Biology", "Advanced Technologies"]:
            continue

        # Subtopics start with bullet points
        if line.startswith("•") or line.startswith("○") or line.startswith("■"):
            subtopic_name = line.lstrip("•○■ ").strip()
            if current_subject and current_topic:
                if subtopic_name not in taxonomy[current_subject][current_topic]:
                    taxonomy[current_subject][current_topic].append(subtopic_name)
            continue
            
        # If it's not a subject and not a bullet, it's a topic
        # Remove leading numbers like "1. ", "2. "
        topic_name = re.sub(r'^\d+\.\s*', '', line).strip()
        if current_subject:
            current_topic = topic_name
            if current_topic not in taxonomy[current_subject]:
                taxonomy[current_subject][current_topic] = []

    return taxonomy

if __name__ == "__main__":
    t = parse_taxonomy("raw_taxonomy.txt")
    for subject, topics in t.items():
        print(f"Subject: {subject}")
        for topic, subtopics in topics.items():
            print(f"  Topic: {topic} ({len(subtopics)} subtopics)")
            if not subtopics:
                print("    **WARNING: No subtopics**")
    
    with open("parsed_taxonomy.json", "w") as f:
        json.dump(t, f, indent=2)
