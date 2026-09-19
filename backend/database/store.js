const fs = require('node:fs/promises');
const path = require('node:path');
const { createSeedData } = require('./seed');

function createStore(databaseFile) {
  let writeQueue = Promise.resolve();

  async function ensureDatabase() {
    await fs.mkdir(path.dirname(databaseFile), { recursive: true });
    try {
      await fs.access(databaseFile);
    } catch {
      await fs.writeFile(databaseFile, `${JSON.stringify(createSeedData(), null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    }
  }

  async function read() {
    await ensureDatabase();
    try {
      return JSON.parse(await fs.readFile(databaseFile, 'utf8'));
    } catch (error) {
      throw new Error(`Database could not be read: ${error.message}`);
    }
  }

  async function write(data) {
    const persist = async () => {
      await fs.mkdir(path.dirname(databaseFile), { recursive: true });
      const temporaryFile = `${databaseFile}.${process.pid}.tmp`;
      await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temporaryFile, databaseFile);
    };
    writeQueue = writeQueue.then(persist, persist);
    return writeQueue;
  }

  async function update(mutator) {
    // Requests are serialized through the same queue as writes so updates cannot overwrite one another.
    let result;
    const operation = async () => {
      const data = await read();
      result = await mutator(data);
      const temporaryFile = `${databaseFile}.${process.pid}.tmp`;
      await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temporaryFile, databaseFile);
    };
    writeQueue = writeQueue.then(operation, operation);
    await writeQueue;
    return result;
  }

  return { read, write, update };
}

module.exports = { createStore };
