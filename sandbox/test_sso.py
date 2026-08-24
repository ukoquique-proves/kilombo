import requests
import os
import sys

def test_login():
    # Load credentials from .env
    password = os.environ.get('KILOMBOTOP_PASSWORD')
    if not password:
        print("❌ Error: KILOMBOTOP_PASSWORD not set in .env or environment")
        sys.exit(1)
    
    username = 'kilombo'
    s = requests.Session()
    
    # Method 1: Form Data
    print("Testing Form Data...")
    r = s.post('https://kilombo.top/yunohost/api/login', data={'credentials': username, 'password': password})
    print("Status:", r.status_code)
    print("Response:", r.text)
    
    # Method 2: JSON (username, password)
    print("\nTesting JSON (username, password)...")
    r = s.post('https://kilombo.top/yunohost/api/login', json={'username': username, 'password': password})
    print("Status:", r.status_code)
    print("Response:", r.text)

    # Method 3: JSON (credentials, password)
    print("\nTesting JSON (credentials, password)...")
    r = s.post('https://kilombo.top/yunohost/api/login', json={'credentials': username, 'password': password})
    print("Status:", r.status_code)
    print("Response:", r.text)

    # Method 4: URL /yunohost/sso/?action=login
    print("\nTesting Form Data to /yunohost/sso/?action=login...")
    r = s.post('https://kilombo.top/yunohost/sso/?action=login', data={'credentials': username, 'password': password})
    print("Status:", r.status_code)
    print("Response:", r.text[:200])

if __name__ == '__main__':
    test_login()

