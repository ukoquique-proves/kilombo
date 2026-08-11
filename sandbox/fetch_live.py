import requests
from bs4 import BeautifulSoup

def main():
    session = requests.Session()
    
    # Get the login page to grab any CSRF tokens if necessary, and see the exact action URL
    response = session.get('https://kilombo.top/yunohost/sso/')
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # YunoHost SSO login POST data
    login_data = {
        'credentials': 'kilombo',
        'password': 'otario2021',
        'action': 'login' # sometimes required by YunoHost SSO
    }
    
    # Usually YunoHost SSO login is POST to /yunohost/sso/
    login_response = session.post('https://kilombo.top/yunohost/sso/', data=login_data, allow_redirects=True)
    print("Login response status:", login_response.status_code)
    
    # Fetch the main site
    site_response = session.get('https://kilombo.top/')
    print("Site response status after login:", site_response.status_code)
    
    if "x-sso-wat" in site_response.headers and "You've just been SSOed" in site_response.headers["x-sso-wat"]:
        print("Still blocked by SSO or SSOed header is always present.")
    
    # Save the output to see what we got
    with open('fetched_live.html', 'w', encoding='utf-8') as f:
        f.write(site_response.text)

if __name__ == '__main__':
    main()
