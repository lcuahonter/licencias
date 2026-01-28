#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imx1ekBnbWFpbC5jb20iLCJyb2wiOjIsImFEYXRhIjoyNywiaWF0IjoxNzY4OTMxNzQ2LCJleHAiOjE3Njg5Mzc3NDZ9.7DAsoNeDX7ADOdOApbWWrClH5ql_lDCZ7TURinpLKPQ"

echo "Test con token en body:"
curl -X POST "https://wonderful-plant-07cf4a40f.4.azurestaticapps.net/api/proxy?path=%2Fapi%2Fusuarios%2FgetUsuarioById" \
  -H "Content-Type: application/json" \
  -d "{\"id\":27,\"token\":\"$TOKEN\"}" \
  -s

echo -e "\n\nTest con token en query params:"
curl -X POST "https://wonderful-plant-07cf4a40f.4.azurestaticapps.net/api/proxy?path=%2Fapi%2Fusuarios%2FgetUsuarioById&token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":27}' \
  -s
