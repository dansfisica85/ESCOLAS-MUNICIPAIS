#!/bin/bash

echo "🔗 Testando conexão direta com Turso..."

URL="https://turso-db-create-escolas-municipais-dansfisica85.aws-us-east-2.turso.io"
TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTkxNjk1MjUsImlkIjoiMGU2YjVmOTctMGMyNC00Yjk0LWI5YmYtZGZhY2Y3ZWU1OGUxIiwicmlkIjoiZWJkMzVjNTUtNDMxNy00NDFjLTlhZmYtMDFkNWRkYWNmMDU5In0.pQZ4oN5kORcmtHF4hfXqB0I8t6XWGcBGvuAzbGarM_Fbm7pl5bAkDTD_81Aq4BszVUA32xwmARscaZQUGN77Ag"

curl -X POST "$URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "statements": [
      {"q": "SELECT 1 as test"}
    ]
  }' \
  -v