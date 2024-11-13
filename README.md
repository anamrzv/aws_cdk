# Build & deploy

```
docker run --rm -dit -p 4566:4566 -p 4571:4571 -e LOCALSTACK_HOST=localhost -v /var/run/docker.sock:/var/run/docker.sock localstack/localstack

npm run compile

cdklocal bootstrap

cdklocal synth

cdklocal deploy
```

# Test

```
curl -k -X POST https://bkuupxtk3l.execute-api.localhost:4566/prod/users/createUser \
       -d '{"username": "John", "email": "test", "age": "18"}' -H "Content-Type: application/json"

curl -k -X GET https://bkuupxtk3l.execute-api.localhost:4566/prod/users/getUser \
       -d '{"username": "John" }' -H "Content-Type: application/json"

curl -k -X DELETE https://bkuupxtk3l.execute-api.localhost:4566/prod/users/deleteUser \
       -d '{"username": "John" }' -H "Content-Type: application/json" 
```