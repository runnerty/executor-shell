# Shell executor for [Runnerty]:

### Configuration sample:
#### Local
```json
{
  "id": "shell_default",
  "type": "@runnerty-executor-shell"
}
```

#### Remote (SSH)
```json
{
  "id": "shell_ssh",
  "type": "@runnerty-executor-shell",
  "host": "remote.server.com",
  "username": "runnerty",
  "privateKey": "./ssh/privateKeyFile.pem"
}
```

### Plan sample:
```json
{
  "id":"shell_default",
  "command":"tar cvfz /var/backups/stf.tar /var/stranger_things/"
}
```

```json
{
  "id":"shell_default",
  "command":"python",
  "args":["myscript.py","hello"]
}
```

```json
{
  "id":"shell_default",
  "command":"echo",
  "args":["hello world"]
}
```

### Using the `outputJSON` param, if you have a process which returns a JSON object, the executor will generate automatically a value for each value of the object:

```json
{
  "id":"shell_default",
  "command":"node my-returning-object-process.js",
}
```

This the output of `my-returning-object-process.js`:

```json
{
  "name": "my output name",
  "lastName": "my output lastName"
}
```

Output values with the object's values:

```
@GV(PROCESS_EXEC_JSON_NAME) --> "my output name"
@GV(PROCESS_EXEC_JSON_LASTNAME) --> "my output lastName"
```

[Runnerty]: http://www.runnerty.io
