"""Generate native strings from the reviewed bilingual source; no external packages."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
values = json.loads((root / "localization.json").read_text(encoding="utf-8"))
def quote(value):
    return json.dumps(value, ensure_ascii=False)
for index, locale in enumerate(["en", "ja"]):
    directory = root / "PhotoSweep/Resources" / f"{locale}.lproj"
    directory.mkdir(parents=True, exist_ok=True)
    for name, is_info in [("Localizable", False), ("InfoPlist", True)]:
        lines = [f'{quote(key)} = {quote(text[index])};' for key, text in values.items() if key.startswith("NSPhotoLibrary") == is_info]
        (directory / f"{name}.strings").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Generated {len(values)} keys in English and Japanese.")
