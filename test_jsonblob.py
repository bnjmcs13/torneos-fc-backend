import urllib.request
import json

# Create a blob
req = urllib.request.Request('https://jsonblob.com/api/jsonBlob', data=b'{}', headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, method='POST')
res = urllib.request.urlopen(req)
blob_url = 'https://jsonblob.com' + res.getheader('Location')
print(f"Created blob: {blob_url}")

# Read the blob
req2 = urllib.request.Request(blob_url, headers={'Accept': 'application/json'}, method='GET')
res2 = urllib.request.urlopen(req2)
print("Read:", res2.read().decode('utf-8'))

# Update the blob
req3 = urllib.request.Request(blob_url, data=b'{"test": "success"}', headers={'Content-Type': 'application/json', 'Accept': 'application/json'}, method='PUT')
res3 = urllib.request.urlopen(req3)
print("Updated:", res3.read().decode('utf-8'))

# Read again
req4 = urllib.request.Request(blob_url, headers={'Accept': 'application/json'}, method='GET')
res4 = urllib.request.urlopen(req4)
print("Read after update:", res4.read().decode('utf-8'))
