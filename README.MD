A node.js api-gateway that forwards calls to a backend set of tools.
Mind that the tools are called via a http call as well and not via a path on the server. 
This makes the whole grid more scalable
Why the api-gateway? things can be done like inspection of the request and abstraction of the logic etc.
a json webtoken is needed to execute the request. 
for this test/demo to work: generate a jwt just call 'gentoken userid role' so: gentoken agent agent for a jw token for use agent in the role agent, or gentoken user-1 for a token for user-1 in the role agent (and ommitting both results in a token. for user limited-agent in the role agent)
Currently no checking is performed when an API is called on our side / site against the webtoken
Of course in real life the token is generated via authentication and the appropriate role(s) is / are then connected to the jwt (APIs checking the token against their logic)

the server runs on port 8443 with an self-signed certificate

start using: node server.js &
get the proces: ps aux | grep node
kill process: kill <pid>

to start the api that gives access to the tools: (python project)

uvicorn app:app --host 0.0.0.0 --port 8080 &


to test the python backend, run from a shell

curl -X POST http://localhost:8080/mcp/tools/invoke   -H "Content-Type: application/json"   -d '{
    "tool": "get_weather",
    "args": {
      "location": "Amsterdam"
    }
  }'


if that works then the python backend works fine

store a temporary token by calling from the shell:

gentoken (gentoken is registered as an alias to alias: gentoken="node ~/gateway/generate-token.js")

this will generate a token for the user limited-agent in the role agent

to run the tools via the api-gateway, call the following from a shell:

  curl -k -X POST https://localhost:8443/tool/weather   -H "Authorization: Bearer $JWT_TOKEN"   -H "Content-Type: application/json"   -d '{"city": "Amsterdam"}'


the tool-call is then rerouted to the correct address and then executed


TL;DR

<!--start api-gateway and backend: -->
node server.js &
uvicorn app:app --host 0.0.0.0 --port 8080 &


<!--generate a token -->
gentoken


<!-- test both backend and frontend -->
curl -X POST http://localhost:8080/mcp/tools/invoke   -H "Content-Type: application/json"   -d '{
    "tool": "get_weather",
    "args": {
      "location": "Amsterdam"
    }
  }'



curl -v -k -X POST https://macboobies.local:8443/tool/weather   -H "Authorization: Bearer $JWT_TOKEN"   -H "Content-Type: application/json"   -d '{"location": "Amsterdam"}'

 curl -X POST https://localhost:8443/tool/weather   -H "Authorization: Bearer $JWT_TOKEN"   -H "Content-Type: application/json"   -d '{"location": "Amsterdam"}'


curl -X POST http://localhost:8080/   -H "Authorization: Bearer $JWT_TOKEN"   -H "Content-Type: application/json"   -d '{"location": "Berlin"}'



