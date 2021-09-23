<p align="center">
  <a href="http://runnerty.io">
    <img height="257" src="https://runnerty.io/assets/header/logo-stroked.png">
  </a>
  <p align="center">Smart Processes Management</p>
</p>

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Dependency Status][david-badge]][david-badge-url]
<a href="#badge">
<img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg">
</a>

# Shell executor for [Runnerty]

### Installation:

Through NPM

```bash
npm i @runnerty/executor-shell
```

You can also add modules to your project with [runnerty]

```bash
npx runnerty add @runnerty/executor-shell
```

This command installs the module in your project, adds example configuration in your [config.json] and creates an example plan of use.

If you have installed [runnerty] globally you can include the module with this command:

```bash
runnerty add @runnerty/executor-shell
```

### Configuration sample:

Add in [config.json]:

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

##### SSH configuratión

**Executor shell** SSH connection relies on [mscdex/ssh2]:https://github.com/mscdex/ssh2 and these are the exposed options:

| Option            | Type            | Description                                                                                                          |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| host              | string          | Hostname or IP address of the server.                                                                                |
| port              | number          | Port number of the server.                                                                                           |
| forceIPv4         | boolean         | Only connect via resolved IPv4 address for `host`.                                                                   |
| forceIPv6         | boolean         | Only connect via resolved IPv6 address for `host`.                                                                   |
| hostHash          | "md5" or "sha1" | The host's key is hashed using this method and passed to `hostVerifier`.                                             |
| username          | string          | Username for authentication.                                                                                         |
| password          | string          | Password for password-based user authentication.                                                                     |
| agent             | string          | Path to ssh-agent's UNIX socket for ssh-agent-based user authentication (or 'pageant' when using Pagent on Windows). |
| privateKey        | string          | Path to the file that contains a private key for either key-based or hostbased user authentication (OpenSSH format). |
| passphrase        | string          | For an encrypted private key, this is the passphrase used to decrypt it.                                             |
| localHostname     | string          | Along with `localUsername` and `privateKey`, set this to a non-empty string for hostbased user authentication.       |
| localUsername     | string          | Along with `localHostname` and `privateKey`, set this to a non-empty string for hostbased user authentication.       |
| tryKeyboard       | boolean         | Try keyboard-interactive user authentication if primary user authentication method fails.                            |
| keepaliveInterval | number          | How often (in milliseconds) to send SSH-level keepalive packets to the server. Set to 0 to disable.                  |
| keepaliveCountMax | number          | How many consecutive, unanswered SSH-level keepalive packets that can be sent to the server before disconnection.    |
| readyTimeout      | number          | \* How long (in milliseconds) to wait for the SSH handshake to complete.                                             |
| strictVendor      | boolean         | Performs a strict server vendor check before sending vendor-specific requests.                                       |
| agentForward      | boolean         | Set to `true` to use OpenSSH agent forwarding (`auth-agent@openssh.com`) for the life of the connection.             |

### Plan sample:

Add in [plan.json]:

```json
{
  "id": "shell_default",
  "command": "tar cvfz /var/backups/stf.tar /var/stranger_things/"
}
```

```json
{
  "id": "shell_default",
  "command": "python",
  "args": ["myscript.py", "hello"]
}
```

```json
{
  "id": "shell_default",
  "command": "echo",
  "args": ["hello world"]
}
```

### Using the `outputJSON` param, if you have a process which returns a JSON object, the executor will generate automatically a value for each value of the object:

```json
{
  "id": "shell_default",
  "command": "node my-returning-object-process.js"
}
```

This the output of `my-returning-object-process.js`:

```json
{
  "name": "my output name",
  "lastName": "my output lastName"
}
```

Output values with the object's values.
It is possible to access the values by [GETVALUE] function:

```json
@GV(PROCESS_EXEC_JSON_NAME) --> "my output name"
@GV(PROCESS_EXEC_JSON_LASTNAME) --> "my output lastName"
```

[runnerty]: https://www.runnerty.io
[downloads-image]: https://img.shields.io/npm/dm/@runnerty/executor-shell.svg
[npm-url]: https://www.npmjs.com/package/@runnerty/executor-shell
[npm-image]: https://img.shields.io/npm/v/@runnerty/executor-shell.svg
[david-badge]: https://david-dm.org/runnerty/executor-shell.svg
[david-badge-url]: https://david-dm.org/runnerty/executor-shell
[getvalue]: http://docs.runnerty.io/functions/
[config.json]: http://docs.runnerty.io/config/
[plan.json]: http://docs.runnerty.io/plan/
