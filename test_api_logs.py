
import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def test_endpoint(path):
    url = f"{BASE_URL}{path}"
    print(f"Testing {url}...")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success!")
            try:
                data = response.json()
                print(f"Data count: {len(data)}")
                if len(data) > 0:
                    print(f"First item: {data[0]}")
            except:
                print("Response is not JSON")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

if __name__ == "__main__":
    test_endpoint("/logs/api")
    test_endpoint("/api") # Check if it's here instead
