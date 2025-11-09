#!/usr/bin/env node

import { createHash } from 'crypto'
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('╔════════════════════════════════════════════════╗')
console.log('║     Portainer Updater - PIN Hash Generator    ║')
console.log('╚════════════════════════════════════════════════╝')
console.log()
console.log('This script generates a SHA-256 hash of your PIN.')
console.log('You will use this hash in your config.json file.')
console.log()

rl.question('Enter your PIN: ', (pin) => {
  if (!pin) {
    console.log('\n❌ Error: PIN cannot be empty')
    rl.close()
    process.exit(1)
  }

  // Generate SHA-256 hash
  const hash = createHash('sha256').update(pin).digest('hex')

  console.log()
  console.log('✅ PIN hash generated successfully!')
  console.log()
  console.log('═══════════════════════════════════════════════')
  console.log('Your PIN hash:')
  console.log(hash)
  console.log('═══════════════════════════════════════════════')
  console.log()
  console.log('📝 Add this to your config.json:')
  console.log(`{`)
  console.log(`  "pin": "${hash}",`)
  console.log(`  "webhooks": [...]`)
  console.log(`}`)
  console.log()
  console.log('⚠️  Security reminder:')
  console.log('- Keep your config.json secure and never commit it to git')
  console.log('- Store it only on your NAS in a protected directory')
  console.log('- Use a strong PIN (at least 6 characters recommended)')
  console.log()

  rl.close()
})

rl.on('close', () => {
  process.exit(0)
})
