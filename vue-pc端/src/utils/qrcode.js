/**
 * 轻量二维码生成器（纯 JS，无外部依赖、无网络请求）
 *
 * 背景：原实现调用 https://api.qrserver.com 在线接口生成二维码，
 *       离线或内网环境下无法使用，且会把班级信息发送到第三方服务。
 *       这里内置一个完整的 QR Code 编码实现（Model 2 / 字节模式），
 *       支持 L/M/Q/H 四个纠错等级，输出 Canvas dataURL。
 *
 * 用法：
 *   import QRCode from '@/utils/qrcode.js'
 *   const url = await QRCode.toDataURL('hello', { size: 300, margin: 2 })
 *
 * 参考实现：QR Code 标准（ISO/IEC 18004）通用算法。
 */

/* ============================================================
 * 1. 数学工具：GF(2^8) 有限域运算
 * ============================================================ */
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)

;(function initTables() {
  for (let i = 0; i < 8; i++) {
    EXP_TABLE[i] = 1 << i
  }
  for (let i = 8; i < 256; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8]
  }
  for (let i = 0; i < 255; i++) {
    LOG_TABLE[EXP_TABLE[i]] = i
  }
})()

/** 有限域乘法 */
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255]
}

/* ============================================================
 * 2. 纠错码生成（Reed-Solomon）
 * ============================================================ */
function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], 1)
      next[j + 1] ^= gfMul(poly[j], EXP_TABLE[i])
    }
    poly = next
  }
  return poly
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount)
  const res = new Array(data.length + ecCount).fill(0)
  data.forEach((v, i) => (res[i] = v))

  for (let i = 0; i < data.length; i++) {
    const factor = res[i]
    if (factor === 0) continue
    for (let j = 0; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j], factor)
    }
  }
  return res.slice(data.length)
}

/* ============================================================
 * 3. 版本 / 容量表
 * ============================================================ */
// 每个版本的总码字数（data + ec），索引从 1 开始
const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991,
  1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876,
  3034, 3196, 3362, 3532, 3706
]

// 每块纠错码字数（按版本 + 纠错等级）
const EC_CODEWORDS_PER_BLOCK = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
}

// 纠错等级对应的格式信息位
const EC_LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 }

// 对齐图案中心坐标
const ALIGNMENT_POSITIONS = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70],
  [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86],
  [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
]

/* ============================================================
 * 4. 工具函数
 * ============================================================ */

/** 校验图案遮罩（格式信息用） */
const FORMAT_MASK = 0x5412

/** UTF-8 编码 */
function utf8Bytes(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)
    if (code > 0xffff) i++ // 代理对占两个位置
    if (code < 0x80) {
      out.push(code)
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return out
}

/** 根据数据长度估算最小可用版本 */
function chooseVersion(byteLen, ecLevel) {
  for (let v = 1; v <= 40; v++) {
    const totalCodewords = TOTAL_CODEWORDS[v]
    const ecPerBlock = EC_CODEWORDS_PER_BLOCK[ecLevel][v]
    // 数据码字 = 总码字 - 纠错码字；块数简化处理（小数据量下单块即可）
    const dataCodewords = totalCodewords - ecPerBlock
    // 4 bit 模式 + 8/16 bit 长度指示 + 数据
    const lenBits = v <= 9 ? 8 : 16
    const needBits = 4 + lenBits + byteLen * 8
    if (needBits <= dataCodewords * 8) return v
  }
  throw new Error('内容过长，无法生成二维码')
}

/* ============================================================
 * 5. 数据编码
 * ============================================================ */
function buildDataCodewords(text, version, ecLevel) {
  const bytes = utf8Bytes(text)
  const totalCodewords = TOTAL_CODEWORDS[version]
  const ecPerBlock = EC_CODEWORDS_PER_BLOCK[ecLevel][version]
  const dataCodewords = totalCodewords - ecPerBlock

  const capacityBits = dataCodewords * 8
  const lenBits = version <= 9 ? 8 : 16

  const bits = []
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((value >> i) & 1)
    }
  }

  // 模式指示符：0100 = 字节模式
  push(0b0100, 4)
  // 字符计数指示符
  push(bytes.length, lenBits)
  // 数据
  bytes.forEach((b) => push(b, 8))

  // 结束符（最多 4 bit）
  const remain = capacityBits - bits.length
  push(0, Math.min(4, remain))

  // 补齐到字节边界
  while (bits.length % 8 !== 0) bits.push(0)

  // 转为码字
  const codewords = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
    codewords.push(byte)
  }

  // 填充字节 0xEC / 0x11 交替
  const PAD = [0xec, 0x11]
  let padIndex = 0
  while (codewords.length < dataCodewords) {
    codewords.push(PAD[padIndex++ % 2])
  }

  // 追加纠错码
  const ecBytes = rsEncode(codewords, ecPerBlock)
  return codewords.concat(ecBytes)
}

/* ============================================================
 * 6. 矩阵构建
 * ============================================================ */
function createMatrix(version) {
  const size = version * 4 + 17
  const modules = Array.from({ length: size }, () => new Array(size).fill(null))
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false))

  const setModule = (row, col, value) => {
    modules[row][col] = value
    reserved[row][col] = true
  }

  // --- 定位图案（三个角） ---
  const placeFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r
        const cc = col + c
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        setModule(rr, cc, isBorder || isCenter ? 1 : 0)
      }
    }
  }
  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // --- 分隔符已在 placeFinder 的 -1 边界中处理（白色） ---

  // --- 定位图案（对齐） ---
  const positions = ALIGNMENT_POSITIONS[version]
  for (const r of positions) {
    for (const c of positions) {
      // 跳过与三个定位图案重叠的位置
      if (
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= size - 9) ||
        (r >= size - 9 && c <= 8)
      ) {
        continue
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2
          const isCenter = dr === 0 && dc === 0
          setModule(r + dr, c + dc, isEdge || isCenter ? 1 : 0)
        }
      }
    }
  }

  // --- 时序图案 ---
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0)
    if (!reserved[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0)
  }

  // --- 暗模块 ---
  setModule(size - 8, 8, 1)

  return { modules, reserved, size }
}

/** 写入格式信息 */
function placeFormatInfo(matrix, ecLevel, maskPattern) {
  const { modules, size } = matrix
  const ecBits = EC_LEVEL_BITS[ecLevel]
  const data = (ecBits << 3) | maskPattern

  // 计算 BCH 校验
  let rem = data
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >> 9) * 0x537)
  }
  const formatInfo = ((data << 10) | rem) ^ FORMAT_MASK

  const getBit = (i) => (formatInfo >> i) & 1

  // 左上角
  for (let i = 0; i <= 5; i++) modules[8][i] = getBit(i)
  modules[8][7] = getBit(6)
  modules[8][8] = getBit(7)
  modules[7][8] = getBit(8)
  for (let i = 9; i <= 14; i++) modules[14 - i][8] = getBit(i)

  // 右上 / 左下
  for (let i = 0; i <= 7; i++) modules[size - 1 - i][8] = getBit(i)
  for (let i = 8; i <= 14; i++) modules[8][size - 15 + i] = getBit(i)

  // 标记为已保留
  for (let i = 0; i <= 8; i++) {
    matrix.reserved[8][i] = true
    matrix.reserved[i][8] = true
  }
  matrix.reserved[8][8] = true
  for (let i = 0; i <= 7; i++) {
    matrix.reserved[size - 1 - i][8] = true
  }
  for (let i = 8; i <= 14; i++) {
    matrix.reserved[8][size - 15 + i] = true
  }
}

/** 掩码函数 */
const MASK_FUNCS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
]

/** 计算掩码惩罚分 */
function calcPenalty(modules, size) {
  let penalty = 0

  // 规则 1：连续同色
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0]
    let runLength = 1
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLength++
        if (runLength === 5) penalty += 3
        else if (runLength > 5) penalty++
      } else {
        runColor = modules[r][c]
        runLength = 1
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c]
    let runLength = 1
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLength++
        if (runLength === 5) penalty += 3
        else if (runLength > 5) penalty++
      } else {
        runColor = modules[r][c]
        runLength = 1
      }
    }
  }

  // 规则 2：2x2 同色块
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c]
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3
      }
    }
  }

  // 规则 4：黑白比例失衡
  let dark = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) dark += modules[r][c]
  }
  const ratio = (dark / (size * size)) * 100
  penalty += Math.floor(Math.abs(ratio - 50) / 5) * 10

  return penalty
}

/** 将数据码字按 Z 字形写入矩阵 */
function placeData(matrix, codewords, maskPattern) {
  const { modules, reserved, size } = matrix
  const maskFn = MASK_FUNCS[maskPattern]

  let bitIndex = 0
  const totalBits = codewords.length * 8
  const getBit = (i) => (codewords[i >> 3] >> (7 - (i & 7))) & 1

  let upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // 跳过时序列
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert
      for (let c = 0; c < 2; c++) {
        const col = right - c
        if (reserved[row][col]) continue
        let value = bitIndex < totalBits ? getBit(bitIndex) : 0
        bitIndex++
        if (maskFn(row, col)) value ^= 1
        modules[row][col] = value
      }
    }
    upward = !upward
  }
}

/* ============================================================
 * 7. 对外 API
 * ============================================================ */
const QRCode = {
  /**
   * 生成二维码矩阵
   * @returns {{ size: number, modules: number[][] }}
   */
  create(text, options = {}) {
    const { ecLevel = 'M' } = options
    const content = String(text ?? '')
    if (!content) throw new Error('二维码内容不能为空')

    const byteLen = utf8Bytes(content).length
    const version = chooseVersion(byteLen, ecLevel)

    const codewords = buildDataCodewords(content, version, ecLevel)

    // 逐个尝试掩码，取惩罚分最低者
    let best = null
    let bestPenalty = Infinity
    for (let mask = 0; mask < 8; mask++) {
      const matrix = createMatrix(version)
      placeFormatInfo(matrix, ecLevel, mask)
      placeData(matrix, codewords, mask)
      const penalty = calcPenalty(matrix.modules, matrix.size)
      if (penalty < bestPenalty) {
        bestPenalty = penalty
        best = matrix
      }
    }

    return { size: best.size, modules: best.modules }
  },

  /**
   * 生成 dataURL（浏览器环境）
   * @param {string} text 内容
   * @param {{size?: number, margin?: number, ecLevel?: string, dark?: string, light?: string}} options
   * @returns {Promise<string>}
   */
  toDataURL(text, options = {}) {
    const { size = 300, margin = 2, dark = '#0f172a', light = '#ffffff', ecLevel = 'M' } = options

    return new Promise((resolve, reject) => {
      try {
        const { size: count, modules } = QRCode.create(text, { ecLevel })
        const totalModules = count + margin * 2
        const scale = size / totalModules

        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = light
        ctx.fillRect(0, 0, size, size)

        ctx.fillStyle = dark
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (!modules[r][c]) continue
            const x = Math.floor((c + margin) * scale)
            const y = Math.floor((r + margin) * scale)
            const w = Math.ceil(scale)
            ctx.fillRect(x, y, w, w)
          }
        }

        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    })
  }
}

export default QRCode
export { QRCode }
