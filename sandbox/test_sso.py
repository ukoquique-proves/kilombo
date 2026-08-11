import requests

def test_login():
    s = requests.Session()
    
    # Method 1: Form Data
    print("Testing Form Data...")
    r = s.post('https://kilombo.top/yunohost/api/login', data={'credentials': 'kilombo', 'password': 'otario2021'})
    print("Status:", r.status_code)
    print("Response:", r.text)
    
    # Method 2: JSON (username, password)
    print("\nTesting JSON (username, password)...")
    r = s.post('https://kilombo.top/yunohost/api/login', json={'username': 'kilombo', 'password': 'otario2021'})
    print("Status:", r.status_code)
    print("Response:", r.text)

    # Method 3: JSON (credentials, password)
    print("\nTesting JSON (credentials, password)...")
    r = s.post('https://kilombo.top/yunohost/api/login', json={'credentials': 'kilombo', 'password': 'otario2021'})
    print("Status:", r.status_code)
    print("Response:", r.text)

    # Method 4: URL /yunohost/sso/?action=login
    print("\nTesting Form Data to /yunohost/sso/?action=login...")
    r = s.post('https://kilombo.top/yunohost/sso/?action=login', data={'credentials': 'kilombo', 'password': 'otario2021'})
    print("Status:", r.status_code)
    print("Response:", r.text[:200])

if __name__ == '__main__':
    test_login()
