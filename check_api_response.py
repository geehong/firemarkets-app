
import requests
import json

def check_api():
    # Try to fetch a recent raw_news post
    try:
        # 1. Get list of posts to find a slug
        print("Fetching posts list...")
        response = requests.get("http://localhost:8001/api/v1/posts/?post_type=raw_news&page_size=1")
        if response.status_code != 200:
            print(f"Failed to fetch posts: {response.status_code} {response.text}")
            return
            
        data = response.json()
        posts = data.get("posts", [])
        if not posts:
            print("No raw_news posts found.")
            return
            
        slug = posts[0].get("slug")
        print(f"Found slug: {slug}")
        
        # 2. Fetch details
        print(f"Fetching details for {slug}...")
        detail_response = requests.get(f"http://localhost:8001/api/v1/posts/slug/{slug}")
        if detail_response.status_code != 200:
            print(f"Failed to fetch detail: {detail_response.status_code}")
            return
            
        detail = detail_response.json()
        print("\n--- Post Info Check ---")
        if "post_info" in detail:
            print("SUCCESS: 'post_info' field exists in response.")
            print(f"Value type: {type(detail['post_info'])}")
            print(json.dumps(detail['post_info'], indent=2))
        else:
            print("FAILURE: 'post_info' field is MISSING in response.")
            print("Available keys:", list(detail.keys()))
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_api()
