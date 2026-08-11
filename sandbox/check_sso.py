import requests

s = requests.Session()

# The SSO login URL for YunoHost is usually a POST to /yunohost/sso/
# Or let's just get the main page first to see the form
res = s.get("https://kilombo.top/yunohost/sso/")
print("SSO Login Page Status:", res.status_code)

# Try to find the form action and inputs
# But we can just use Playwright if we had it, but requests is safer for no CDP issue.
# Wait, YunoHost SSO login API is POST /yunohost/sso/
# Let's try to post credentials
data = {
    "username": "kilombo",
    "password": "otario2021"
}
res = s.post("https://kilombo.top/yunohost/sso/", data=data, allow_redirects=True)
print("Login Status:", res.status_code)

# Now try to access the main site
res = s.get("https://kilombo.top/")
print("Main Site Status after login:", res.status_code)
if "x-sso-wat" in res.headers:
    print("Still SSOed")
else:
    print("Content Length:", len(res.content))
    with open("kilombo_top_fetched.html", "wb") as f:
        f.write(res.content)
    print("Saved to kilombo_top_fetched.html")
