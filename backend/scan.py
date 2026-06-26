import os
import re
import frontmatter
import json
from datetime import datetime

SKILL_PATTERN = re.compile(r"^[qwe]{3}$", re.IGNORECASE)

def scan_directory(watch_dir):
    data = []
    categories = ["proj", "cert", "item", "achv"]
    
    if not os.path.exists(watch_dir):
        print(f"Warning: Watch directory {watch_dir} does not exist.")
        return data
        
    for category in categories:
        category_dir = os.path.join(watch_dir, category)
        if not os.path.exists(category_dir):
            continue
            
        for entry_name in os.listdir(category_dir):
            entry_path = os.path.join(category_dir, entry_name)
            if not os.path.isdir(entry_path):
                continue
                
            index_path = os.path.join(entry_path, "index.md")
            if not os.path.exists(index_path):
                continue
                
            try:
                post = frontmatter.load(index_path)
                
                title = post.get("title")
                datestart = post.get("datestart")
                
                if not title or not datestart:
                    print(f"Warning: Missing required fields (title, datestart) in {index_path}. Skipping.")
                    continue
                
                if isinstance(datestart, datetime):
                    datestart = datestart.strftime("%Y-%m-%d")
                else:
                    datestart = str(datestart).strip()
                    
                dateend = post.get("dateend")
                if dateend:
                    if isinstance(dateend, datetime):
                        dateend = dateend.strftime("%Y-%m-%d")
                    else:
                        dateend = str(dateend).strip()
                else:
                    dateend = ""
                    
                skill = post.get("skill", "")
                if skill:
                    skill = str(skill).strip().lower()
                    if len(skill) == 1 and skill in ["q", "w", "e"]:
                        skill = skill * 3
                    if not SKILL_PATTERN.match(skill):
                        print(f"Warning: Invalid skill combination '{skill}' in {index_path}. Treating as grey.")
                        skill = ""
                else:
                    skill = ""
                    
                github = post.get("github", "")
                if github:
                    github = str(github).strip()
                else:
                    github = ""
                    
                linkedin = post.get("linkedin", "")
                if linkedin:
                    linkedin = str(linkedin).strip()
                else:
                    linkedin = ""

                done = post.get("done", False)
                if isinstance(done, str):
                    done = done.lower() == "true"
                else:
                    done = bool(done)

                dependencies = post.get("dependencies", [])
                if isinstance(dependencies, str):
                    dependencies = [d.strip() for d in dependencies.split(",") if d.strip()]
                elif isinstance(dependencies, list):
                    dependencies = [str(d).strip() for d in dependencies if d]
                else:
                    dependencies = []
                    
                img_name = ""
                if os.path.exists(entry_path):
                    for filename in os.listdir(entry_path):
                        if filename.lower() in ["img.png", "img.jpg", "img.jpeg", "img.pdf", "thumbnail.png", "thumbnail.jpg", "thumbnail.jpeg", "thumbnail.pdf"] or entry_name.lower() in filename.lower():
                            img_name = filename
                            break
                    if not img_name:
                        for filename in os.listdir(entry_path):
                            if filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf")):
                                img_name = filename
                                break
                            
                img_path = f"/api/media/{category}/{entry_name}/{img_name}" if img_name else ""
                
                folder_path = os.path.abspath(entry_path)
                
                attachments = []
                if os.path.exists(entry_path):
                    for filename in os.listdir(entry_path):
                        if filename != "index.md":
                            attachments.append(filename)
                
                data.append({
                    "id": f"{category}_{entry_name}",
                    "source": category,
                    "title": str(title).strip(),
                    "datestart": datestart,
                    "dateend": dateend,
                    "skill": skill,
                    "github": github,
                    "linkedin": linkedin,
                    "folderPath": folder_path,
                    "imgPath": img_path,
                    "attachments": attachments,
                    "body": post.content,
                    "done": done,
                    "dependencies": dependencies
                })
                
            except Exception as e:
                print(f"Error parsing {index_path}: {e}")
                continue
                
    def get_sort_key(x):
        try:
            return datetime.strptime(x["datestart"], "%Y-%m-%d")
        except:
            return datetime.min
            
    data.sort(key=get_sort_key, reverse=True)
    return data

def save_data(data, output_file="data.json"):
    try:
        # Save adjacent to scan.py, which is under backend/
        # Or write to the root project folder so start.bat and both dev/prod modes can read it
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        target_path = os.path.join(root_dir, output_file)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully saved {len(data)} entries to {target_path}")
    except Exception as e:
        print(f"Error saving data.json: {e}")

if __name__ == "__main__":
    from config import WATCH_DIR
    res = scan_directory(WATCH_DIR)
    save_data(res)
