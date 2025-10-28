// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no final XOR
export function crc16ccittFalseHex(input: Uint8Array): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input[i] << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

