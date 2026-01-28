#!/bin/bash
# Script para probar el proxy con autenticación

AZURE_URL="https://wonderful-plant-07cf4a40f.4.azurestaticapps.net"
PROXY_URL="${AZURE_URL}/api/proxy"

echo "🔐 Probando proxy con autenticación..."
echo ""

# Test 1: Login para obtener token
echo "1️⃣ Haciendo login para obtener token..."
LOGIN_RESPONSE=$(curl -X POST "${PROXY_URL}?path=/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"luz@gmail.com","password":"admin"}' \
  -s)

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Extraer el token (asumiendo que viene en el campo "token" o "access_token")
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener el token. Intentando extraer de otra forma..."
  # Intentar con jq si está disponible
  TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('token') or data.get('access_token') or data.get('data', {}).get('token') or '')" 2>/dev/null)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener el token."
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:30}..."
echo ""

# Test 2: Usar el token en otra petición
echo "2️⃣ Probando petición autenticada con el token..."
AUTH_RESPONSE=$(curl -X POST "${PROXY_URL}?path=/api/usuarios/getUsuarioById" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id":27}' \
  -s)

echo "Response: $AUTH_RESPONSE"
echo ""
echo "✅ Test completado"
