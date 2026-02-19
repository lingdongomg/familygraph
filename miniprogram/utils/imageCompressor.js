/**
 * 图片压缩工具
 * 提供图片压缩和缩略图生成功能，用于照片上传前的预处理
 */

const { IMAGE } = require('./constants')

/**
 * 计算等比缩放后的目标尺寸
 * 保持宽高比，使最长边不超过 maxSize
 * @param {number} width - 原始宽度
 * @param {number} height - 原始高度
 * @param {number} maxSize - 最长边上限
 * @returns {{ width: number, height: number }}
 */
function _calcScaledDimensions(width, height, maxSize) {
  let targetWidth = width
  let targetHeight = height

  if (targetWidth > maxSize || targetHeight > maxSize) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round(targetHeight * maxSize / targetWidth)
      targetWidth = maxSize
    } else {
      targetWidth = Math.round(targetWidth * maxSize / targetHeight)
      targetHeight = maxSize
    }
  }

  return { width: targetWidth, height: targetHeight }
}

/**
 * 使用 Canvas 进行图片压缩/缩放
 * 当 wx.compressImage 不可用或需要精确控制尺寸时使用
 * @param {string} filePath - 图片临时文件路径
 * @param {number} targetWidth - 目标宽度
 * @param {number} targetHeight - 目标高度
 * @param {number} quality - JPEG 质量 (0-1)
 * @returns {Promise<{ tempFilePath: string, width: number, height: number }>}
 */
function _canvasCompress(filePath, targetWidth, targetHeight, quality) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: targetWidth,
        height: targetHeight
      })
      const ctx = canvas.getContext('2d')
      const img = canvas.createImage()

      img.onload = function () {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        wx.canvasToTempFilePath({
          canvas: canvas,
          x: 0,
          y: 0,
          width: targetWidth,
          height: targetHeight,
          destWidth: targetWidth,
          destHeight: targetHeight,
          fileType: 'jpg',
          quality: quality,
          success(res) {
            resolve({
              tempFilePath: res.tempFilePath,
              width: targetWidth,
              height: targetHeight
            })
          },
          fail(err) {
            reject(new Error('Canvas 导出失败: ' + (err.errMsg || '未知错误')))
          }
        })
      }

      img.onerror = function () {
        reject(new Error('Canvas 加载图片失败'))
      }

      img.src = filePath
    } catch (err) {
      reject(new Error('创建 OffscreenCanvas 失败: ' + (err.message || '未知错误')))
    }
  })
}

/**
 * 压缩图片
 * 将图片最长边缩放至不超过 1080px，JPEG 质量 80%
 * @param {string} filePath - 图片临时文件路径（如 wx.chooseMedia 返回的路径）
 * @returns {Promise<{ tempFilePath: string, width: number, height: number, size: number }>}
 */
function compressImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success(info) {
        const maxSize = IMAGE.MAX_WIDTH // 1080
        const quality = IMAGE.QUALITY   // 0.8
        const { width: targetWidth, height: targetHeight } = _calcScaledDimensions(
          info.width, info.height, maxSize
        )

        // 如果图片已经足够小，无需压缩
        const needsResize = info.width > maxSize || info.height > maxSize

        // 优先使用 wx.compressImage（仅控制质量，不控制尺寸）
        // 如果需要缩放尺寸，则使用 Canvas 方式
        if (needsResize) {
          _canvasCompress(filePath, targetWidth, targetHeight, quality)
            .then(function (result) {
              // 获取压缩后文件大小
              wx.getFileInfo({
                filePath: result.tempFilePath,
                success(fileInfo) {
                  resolve({
                    tempFilePath: result.tempFilePath,
                    width: result.width,
                    height: result.height,
                    size: fileInfo.size
                  })
                },
                fail() {
                  // 无法获取大小时仍返回结果
                  resolve({
                    tempFilePath: result.tempFilePath,
                    width: result.width,
                    height: result.height,
                    size: 0
                  })
                }
              })
            })
            .catch(function () {
              // Canvas 失败，回退到 wx.compressImage（仅压缩质量）
              _compressQualityOnly(filePath, quality, targetWidth, targetHeight, resolve, reject)
            })
        } else {
          // 无需缩放尺寸，仅压缩质量
          _compressQualityOnly(filePath, quality, targetWidth, targetHeight, resolve, reject)
        }
      },
      fail(err) {
        reject(new Error('获取图片信息失败: ' + (err.errMsg || '未知错误')))
      }
    })
  })
}

/**
 * 仅压缩质量（不缩放尺寸）
 * @param {string} filePath - 图片路径
 * @param {number} quality - 质量 (0-1)
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 * @param {Function} resolve - Promise resolve
 * @param {Function} reject - Promise reject
 */
function _compressQualityOnly(filePath, quality, width, height, resolve, _reject) {
  wx.compressImage({
    src: filePath,
    quality: Math.round(quality * 100), // wx.compressImage 接受 0-100 整数
    success(res) {
      wx.getFileInfo({
        filePath: res.tempFilePath,
        success(fileInfo) {
          resolve({
            tempFilePath: res.tempFilePath,
            width: width,
            height: height,
            size: fileInfo.size
          })
        },
        fail() {
          resolve({
            tempFilePath: res.tempFilePath,
            width: width,
            height: height,
            size: 0
          })
        }
      })
    },
    fail() {
      // wx.compressImage 也失败，返回原图
      wx.getFileInfo({
        filePath: filePath,
        success(fileInfo) {
          resolve({
            tempFilePath: filePath,
            width: width,
            height: height,
            size: fileInfo.size
          })
        },
        fail() {
          resolve({
            tempFilePath: filePath,
            width: width,
            height: height,
            size: 0
          })
        }
      })
    }
  })
}

/**
 * 生成缩略图
 * 将图片最长边缩放至不超过 300px，JPEG 质量 60%
 * @param {string} filePath - 图片临时文件路径
 * @returns {Promise<{ tempFilePath: string, width: number, height: number }>}
 */
function generateThumbnail(filePath) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: filePath,
      success(info) {
        const thumbSize = IMAGE.THUMB_SIZE       // 300
        const thumbQuality = IMAGE.THUMB_QUALITY // 0.6
        const { width: targetWidth, height: targetHeight } = _calcScaledDimensions(
          info.width, info.height, thumbSize
        )

        // 缩略图始终使用 Canvas 方式以确保尺寸精确
        _canvasCompress(filePath, targetWidth, targetHeight, thumbQuality)
          .then(function (result) {
            resolve({
              tempFilePath: result.tempFilePath,
              width: result.width,
              height: result.height
            })
          })
          .catch(function () {
            // Canvas 失败，回退到 wx.compressImage
            wx.compressImage({
              src: filePath,
              quality: Math.round(thumbQuality * 100),
              success(res) {
                resolve({
                  tempFilePath: res.tempFilePath,
                  width: targetWidth,
                  height: targetHeight
                })
              },
              fail() {
                // 全部失败，返回原图路径和计算后的目标尺寸
                resolve({
                  tempFilePath: filePath,
                  width: targetWidth,
                  height: targetHeight
                })
              }
            })
          })
      },
      fail(err) {
        reject(new Error('获取图片信息失败: ' + (err.errMsg || '未知错误')))
      }
    })
  })
}

module.exports = {
  compressImage,
  generateThumbnail
}
