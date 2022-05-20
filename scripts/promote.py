import requests
import json
import sys
import os

hostname = os.environ.get("IAP_HOSTNAME")
artifact_path = sys.argv[1]

# checking if IAP_PUSH_TO_LOCAL env var is set -> if not, default to True
if not (os.environ.get("IAP_PUSH_TO_LOCAL")):
  push_to_local = True
else:
  push_to_local = True if os.environ.get("IAP_PUSH_TO_LOCAL").lower() == "true" else False

# checking if IAP_TOKEN is set -> if not, use basic auth login
token = os.environ.get("IAP_TOKEN")
basic_auth = False
if not token:
  basic_auth = True
  username = os.environ.get("IAP_USERNAME")
  pw = os.environ.get("IAP_PW")

if not (artifact_path and hostname and (token or (username and pw))):
  print("Missing environmental variables.\nMake sure your environmental variables are set properly.\nExiting...")
  sys.exit(1)

artifact = json.load(open(f"{artifact_path}"))
# Function Definitions
# Handles getting token to authenticate into IAP
def get_token():
  print("Getting auth token")
  url = f"{hostname}/login"
  payload = json.dumps({
    "user": {
      "username": username,
      "password": pw
    }
  })

  response = requests.request(
    "POST", 
    url, 
    headers={'Content-Type': 'application/json'},
    data=payload)
  if not response.status_code // 100 == 2:
    raise Exception("Error: Unexpected response {}: Failed to get auth token".format(response.text))
  else: 
    return response.text

# Checks if prebuilt already exists
def get_prebuilt(name):
  print(f"Retrieving prebuilt: {name}")
  url = f"{hostname}/prebuilts?equals={name}&equalsField=name"
  response = requests.request(
    "GET", 
    url,
    headers={'Cookie': f'token={token}'})
  if not response.status_code // 100 == 2:
    raise Exception("Error: Unexpected response {}: Failed to get prebuilt".format(response.text))
  else: 
    return response.text

def add_prebuilt(payload): 
  print("Prebuilt does not exist yet - adding to IAP")
  url = f"{hostname}/prebuilts/import"
  headers = {
    'Content-Type': 'application/json',
    'Cookie': f'token={token}'
  }
  response = requests.request(
    "POST",
    url,
    headers=headers,
    data=payload)
  if "Invalid repository configuration" in response.text:
    print("Failed to promote to original repository, pushing to local scope.")
    updated_payload = json.loads(payload)
    updated_payload["prebuilt"]["metadata"]["repository"] = {
      "type": "local",
      "hostname": "localhost",
      "path": "/"
    }
    response = requests.request(
      "POST",
      url,
      headers=headers,
      data=json.dumps(updated_payload))
  if not response.status_code // 100 == 2:
    raise Exception("Error: Unexpected response {}: Failed to add prebuilt".format(response.text))
  else: 
    print("Successfully added prebuilt")
    return response.text

def update_prebuilt(id, payload):
  print("Updating existing prebuilt")
  url = f"{hostname}/prebuilts/{id}"
  headers = {
    'Content-Type': 'application/json',
    'Cookie': f'token={token}'
  }
  response = requests.request(
    "PUT",
    url,
    headers=headers,
    data=payload)
  if "Invalid repository configuration" in response.text:
    print("Failed to promote to original repository, pushing to local scope.")
    updated_payload = json.loads(payload)
    updated_payload["prebuilt"]["metadata"]["repository"] = {
      "type": "local",
      "hostname": "localhost",
      "path": "/"
    }
    response = requests.request(
      "PUT",
      url,
      headers=headers,
      data=json.dumps(updated_payload))
  if not response.status_code // 100 == 2:
      raise Exception("Error: Unexpected response {}: Failed to update prebuilt".format(response.text))
  else: 
    print("Successfully updated prebuilt")
    return response.text

def logout():
  print("Logging out of IAP")
  url = f"{hostname}/login?logout=true"
  headers = {
    'Content-Type': 'application/json',
    'Cookie': f'token={token}'
  }
  response = requests.request(
    "GET",
    url,
    headers=headers)
  response = requests.request("GET", url, headers=headers)

# Script starts here
try: 
  if (basic_auth):
    token = get_token()

  # Set name of prebuilt
  name = artifact["metadata"]["name"]

  results = get_prebuilt(name)
  if push_to_local:
    print("Setting artifact.json repository configuration to local")
    artifact["metadata"]["repository"] = {
      "type": "local",
      "hostname": "localhost",
      "path": "/"
    }
    print('Promoting to local scope in IAP')
  payload = json.dumps({
    "prebuilt": artifact,
    "options": {
      "overwrite": True 
    }
  })
  # if prebuilt doesn't exist, add it
  if json.loads(results)["total"] == 0:
    response = add_prebuilt(payload)
  else: # if prebuilt exists, update it
      id = json.loads(results)["results"][0]["_id"]
      update_prebuilt(id, payload)

  # logging out
  logout()
except requests.exceptions.RequestException as e: 
  # A serious problem happened, like an SSLError or InvalidURL
  print("Error: {}".format(e))
  sys.exit(1)  
except: # error handling to catch any errors that throw a non 200 code
  e = sys.exc_info()[1]    
  print(e)
  sys.exit(1)