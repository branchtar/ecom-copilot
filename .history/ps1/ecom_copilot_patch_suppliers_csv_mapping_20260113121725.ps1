Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows

PS C:\Users\Kylem> $ROOT="C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
PS C:\Users\Kylem>
PS C:\Users\Kylem> "--- netstat 5000 ---"
--- netstat 5000 ---
PS C:\Users\Kylem> netstat -ano | findstr ":5000"
  TCP    127.0.0.1:5000         0.0.0.0:0              LISTENING       24584
PS C:\Users\Kylem>
PS C:\Users\Kylem> "--- curl health ---"
--- curl health ---
PS C:\Users\Kylem> try {
>>   curl "http://127.0.0.1:5000/health" -UseBasicParsing
>> } catch {
>>   "Health check failed: $($_.Exception.Message)"
>> }


StatusCode        : 200
StatusDescription : OK
Content           : {"ok":true}
RawContent        : HTTP/1.1 200 OK
                    Access-Control-Allow-Origin: http://localhost:3000
                    Vary: Origin
                    Connection: keep-alive
                    Keep-Alive: timeout=5
                    Content-Length: 11
                    Content-Type: application/json; charset=utf-8
                    Dat...
Forms             :
Headers           : {[Access-Control-Allow-Origin, http://localhost:3000], [Vary, Origin], [Connection, keep-alive],
                    [Keep-Alive, timeout=5]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        :
RawContentLength  : 11



PS C:\Users\Kylem> curl "http://127.0.0.1:5000/api/suppliers" -UseBasicParsing


StatusCode        : 200
StatusDescription : OK
Content           : [{"id":"KMC","key":"KMC","name":"KMC
                    Music","location":"USA"},{"id":"ENSOUL","key":"ENSOUL","name":"Ensoul Music","location":"USA"}]
RawContent        : HTTP/1.1 200 OK
                    Access-Control-Allow-Origin: http://localhost:3000
                    Vary: Origin
                    Connection: keep-alive
                    Keep-Alive: timeout=5
                    Content-Length: 132
                    Content-Type: application/json; charset=utf-8
                    Da...
Forms             :
Headers           : {[Access-Control-Allow-Origin, http://localhost:3000], [Vary, Origin], [Connection, keep-alive],
                    [Keep-Alive, timeout=5]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        :
RawContentLength  : 132



PS C:\Users\Kylem>