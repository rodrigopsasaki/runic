#!/usr/bin/env node
// Generate a random hex token
const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map(b => b.toString(16).padStart(2, '0')).join('');
console.log(token);
