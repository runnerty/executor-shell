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

# Shell executor for [Runnerty]:

### Installation:

Through NPM

```bash
npm i @runnerty/executor-shell
```

You can also add modules to your project with [runnerty-cli]

```bash
npx runnerty-cli add @runnerty/executor-shell
```

This command installs the module in your project, adds example configuration in your `config.json` and creates an example plan of use.

If you have installed [runnerty-cli] globally you can include the module with this command:

```bash
rty add @runnerty/executor-shell
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

```
@GV(PROCESS_EXEC_JSON_NAME) --> "my output name"
@GV(PROCESS_EXEC_JSON_LASTNAME) --> "my output lastName"
```

[runnerty]: http://www.runnerty.io
[downloads-image]: https://img.shields.io/npm/dm/@runnerty/executor-shell.svg
[npm-url]: https://www.npmjs.com/package/@runnerty/executor-shell
[npm-image]: https://img.shields.io/npm/v/@runnerty/executor-shell.svg
[david-badge]: https://david-dm.org/runnerty/executor-shell.svg
[david-badge-url]: https://david-dm.org/runnerty/executor-shell
[getvalue]: http://docs.runnerty.io/functions/
[config.json]: http://docs.runnerty.io/config/
[plan.json]: http://docs.runnerty.io/plan/
[runnerty-cli]: https://www.npmjs.com/package/runnerty-cli
