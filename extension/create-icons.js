// Run once: node create-icons.js
// Creates icon PNG files using only Node.js built-ins (no npm packages needed)
const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const crcBuf = Buffer.concat([t, data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, t, data, crc])
}

function createPNG(size, hexColor) {
  const r = parseInt(hexColor.slice(1,3), 16)
  const g = parseInt(hexColor.slice(3,5), 16)
  const b = parseInt(hexColor.slice(5,7), 16)

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      // Round corners effect
      const cx = x - size/2 + 0.5, cy = y - size/2 + 0.5
      const dist = Math.sqrt(cx*cx + cy*cy)
      const alpha = dist < size * 0.42 ? 255 : 0
      row[1 + x*4] = r; row[2 + x*4] = g; row[3 + x*4] = b; row[4 + x*4] = alpha
    }
    rows.push(row)
  }

  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

if (!fs.existsSync('icons')) fs.mkdirSync('icons')

for (const size of [16, 48, 128]) {
  const png = createPNG(size, '#6366f1')
  fs.writeFileSync(`icons/icon${size}.png`, png)
  console.log(`✓ icons/icon${size}.png`)
}
console.log('Icons created! Now load the extension in Chrome.')
