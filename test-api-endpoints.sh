#!/bin/bash

# API Endpoints Test Script
# Tests all available API endpoints

set -e

API_BASE="https://api.luckyjingwen.top"

echo "🧪 Testing API endpoints at $API_BASE"
echo "================================================"

# Test health endpoint
echo "1. Testing health endpoint..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/health")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Health endpoint: OK"
    echo "   Response: $body"
else
    echo "❌ Health endpoint: FAILED (HTTP $http_code)"
    echo "   Response: $body"
fi

echo ""

# Test API test endpoint
echo "2. Testing API test endpoint..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/test")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo "✅ API test endpoint: OK"
    echo "   Response: $body"
else
    echo "❌ API test endpoint: FAILED (HTTP $http_code)"
    echo "   Response: $body"
fi

echo ""

# Test pages endpoint
echo "3. Testing pages endpoint..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/pages")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Pages endpoint: OK"
    echo "   Response: $body"
elif [ "$http_code" -eq 401 ]; then
    echo "⚠️  Pages endpoint: Authentication required (expected)"
    echo "   Response: $body"
else
    echo "❌ Pages endpoint: FAILED (HTTP $http_code)"
    echo "   Response: $body"
fi

echo ""

# Test domains endpoint
echo "4. Testing domains endpoint..."
response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE/api/domains")
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Domains endpoint: OK"
    echo "   Response: $body"
elif [ "$http_code" -eq 401 ]; then
    echo "⚠️  Domains endpoint: Authentication required (expected)"
    echo "   Response: $body"
else
    echo "❌ Domains endpoint: FAILED (HTTP $http_code)"
    echo "   Response: $body"
fi

echo ""

# Test CORS
echo "5. Testing CORS headers..."
response=$(curl -s -I -H "Origin: https://luckyjingwen.top" "$API_BASE/health")
if echo "$response" | grep -i "access-control-allow-origin" > /dev/null; then
    echo "✅ CORS headers: Present"
    echo "   $(echo "$response" | grep -i "access-control-allow-origin")"
else
    echo "❌ CORS headers: Missing"
fi

echo ""
echo "================================================"
echo "🏁 API endpoint testing complete!"