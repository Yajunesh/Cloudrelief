import requests

r = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'random234@example.com',
    'password': 'password123'
})
print("Login status:", r.status_code)
print("Login response:", r.text)

r2 = requests.post('http://localhost:8000/api/auth/register', json={
    'email': 'random234@example.com',
    'password': 'password123',
    'full_name': 'Random'
})
print("Register status:", r2.status_code)
print("Register response:", r2.text)
