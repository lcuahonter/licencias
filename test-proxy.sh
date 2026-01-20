#!/bin/bash
# Script para probar el proxy API de Azure Static Web Apps

AZURE_URL="https://wonderful-plant-07cf4a40f.4.azurestaticapps.net"
PROXY_URL="${AZURE_URL}/api/proxy"

echo "🔍 Probando el proxy API..."
echo ""

# Test 1: Verificar que el proxy existe
echo "1️⃣ Test: Verificar endpoint del proxy"
curl -s -o /dev/null -w "Status: %{http_code}\n" "${PROXY_URL}?path=/auth/login"
echo ""

# Test 2: Hacer login de prueba
echo "2️⃣ Test: Login (debería devolver 401 o respuesta del backend)"
curl -X POST "${PROXY_URL}?path=/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

echo "✅ Tests completados"
