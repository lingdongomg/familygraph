/**
 * AES-256-CBC 加解密工具（云函数端使用）
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16
const HARDCODED_KEY = '22f9c2560129fd419d98d32acb6fc3180189f57b322f16d311755302d51bea6d'

function getKey() {
  return crypto.createHash('sha256').update(HARDCODED_KEY).digest()
}

/**
 * 加密字符串
 * @param {string} text 明文
 * @returns {string} 加密后的 base64 字符串 (iv:encrypted)
 */
function encrypt(text) {
  if (!text) return text
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(String(text), 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return iv.toString('base64') + ':' + encrypted
}

/**
 * 解密字符串
 * @param {string} encryptedText 加密的 base64 字符串 (iv:encrypted)
 * @returns {string} 明文
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText
  const key = getKey()
  const parts = encryptedText.split(':')
  if (parts.length !== 2) {
    throw new Error('无效的加密数据格式')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(parts[1], 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

module.exports = { encrypt, decrypt }
