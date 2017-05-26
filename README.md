# Shell executor for [Runnerty]:

### Configuration sample:
#### Local
```json
{
  "id": "shell_default",
  "type": "@runnerty/executor-shell"
}
```

#### Remote (SSH)
```json
{
  "id": "shell_ssh",
  "type": "@runnerty/executor-shell",
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

[Runnerty]: http://www.runnerty.io
