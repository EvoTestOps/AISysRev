# Shared dev-login auth helper

import http.client, json, re, sys

conn = http.client.HTTPConnection("localhost", 8090, timeout=10)


def req(method, path, cookie=None, body=None):
    headers = {}
    if cookie:
        headers["Cookie"] = f"session_id={cookie}"
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    conn.request(method, path, body=data, headers=headers)
    resp = conn.getresponse()
    resp.read()
    return resp


resp = req("GET", "/api/v1/auth/dev-login")
m = re.search(r"session_id=([0-9a-fA-F-]+)", resp.getheader("Set-Cookie", ""))
if not m:
    sys.exit("no session cookie returned")
session_id = m.group(1)

if req("GET", "/api/v1/auth/me", cookie=session_id).status != 200:
    req("POST", "/api/v1/auth/consent", cookie=session_id,
        body={"terms": True, "privacy_policy": True, "research": None})

print("{'app1': {}}")
print(f"Cookie: session_id={session_id}")


# Schemathesis and EvoMaster both get a cookie from this script and use it to authenticate requests.
# Restler instead invokes auth.py itself, repeatedly, throughout the run to get a fresh cookie every 300 seconds. 
# This is to avoid cookies expiring or being invalidated during long runs.


