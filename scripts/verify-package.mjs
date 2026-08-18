import fs from 'node:fs'

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const client = fs.readFileSync(new URL('../client/client.js', import.meta.url), 'utf8')
const registration = client.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*["']([^"']+)["']/)

if (registration === null) {
  throw new Error('Could not find the top-level ModuleLoader registration ID')
}

if (registration[1] !== packageJson.name) {
  throw new Error(`Client registration ID ${registration[1]} does not match package name ${packageJson.name}`)
}

console.log(`client registration ok: ${registration[1]}`)
