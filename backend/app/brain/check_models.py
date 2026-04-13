
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("No GOOGLE_API_KEY found")
else:
    genai.configure(api_key=api_key)
    try:
        models = genai.list_models()
        print("Available models:")
        for m in models:
            print(f"  {m.name}")
    except Exception as e:
        print(f"Failed to list models: {e}")
