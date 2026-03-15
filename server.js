import express from 'express'
import fs from 'fs'
import path from 'path'
import { readdirSync, statSync, writeFileSync, unlinkSync, existsSync, renameSync, mkdirSync, readFileSync, copyFileSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import multer from 'multer'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imageDir = join(__dirname, 'image')
    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true })
    }
    cb(null, imageDir)
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 10)
    cb(null, `${timestamp}_${randomStr}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase()
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的图片格式'))
    }
  }
})

app.use(express.json())

app.use(express.static(path.join(__dirname, 'dist')))

const captchaStore = new Map()

const extractImagesFromContent = (content) => {
  const imageRegex = /!\[.*?\]\(\/image\/([^)]+)\)/g
  const images = []
  let match
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

const deleteNoteImageRefs = (content) => {
  if (!content) {
    return
  }
  
  const images = extractImagesFromContent(content)
  
  if (images.length === 0) {
    return
  }
  
  const imageDir = join(__dirname, 'image')
  
  images.forEach(imageFilename => {
    const imagePath = join(imageDir, imageFilename)
    if (existsSync(imagePath)) {
      unlinkSync(imagePath)
    }
  })
}

const generateCaptchaId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const generateShareId = () => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 8)
  return `${timestamp}${random}`
}

const getSharesData = () => {
  const logDir = join(__dirname, 'log')
  const sharesPath = join(logDir, 'shares.json')

  // Ensure log directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }

  if (!existsSync(sharesPath)) {
    writeFileSync(sharesPath, '{}', 'utf-8')
    return {}
  }
  const content = readFileSync(sharesPath, 'utf-8')
  try {
    return JSON.parse(content)
  } catch {
    return {}
  }
}

const saveSharesData = (data) => {
  const logDir = join(__dirname, 'log')
  const sharesPath = join(logDir, 'shares.json')

  // Ensure log directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }

  writeFileSync(sharesPath, JSON.stringify(data, null, 2), 'utf-8')
}

const cleanExpiredShares = () => {
  const sharesData = getSharesData()
  const now = Date.now()
  let cleaned = false
  
  for (const shareId in sharesData) {
    const share = sharesData[shareId]
    if (share.expiresAt && now > share.expiresAt) {
      delete sharesData[shareId]
      cleaned = true
    }
  }
  
  if (cleaned) {
    saveSharesData(sharesData)
  }
}

const generateCaptchaCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateCaptchaSVG = (code) => {
  const width = 120
  const height = 40
  const fontSize = 24
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
  svg += `<rect width="${width}" height="${height}" fill="#f0f0f0"/>`
  
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width
    const y1 = Math.random() * height
    const x2 = Math.random() * width
    const y2 = Math.random() * height
    const color = `rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`
  }
  
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const color = `rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`
    svg += `<circle cx="${x}" cy="${y}" r="1" fill="${color}"/>`
  }
  
  const charWidth = width / (code.length + 1)
  for (let i = 0; i < code.length; i++) {
    const x = charWidth * (i + 1)
    const y = height / 2 + fontSize / 3
    const rotation = (Math.random() - 0.5) * 30
    const color = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial" font-weight="bold" fill="${color}" transform="rotate(${rotation}, ${x}, ${y})">${code[i]}</text>`
  }
  
  svg += '</svg>'
  return svg
}

const loadFileList = () => {
  const fileDir = join(__dirname, 'file')
  const files = readdirSync(fileDir)
    .filter(file => file.endsWith('.md'))
    .map(filename => {
      const filePath = join(fileDir, filename)
      const stats = statSync(filePath)
      const birthtime = stats.birthtime && stats.birthtime.getTime ? stats.birthtime.getTime() : stats.mtime.getTime()
      return {
        filename,
        title: filename.replace(/\.md$/, ''),
        path: `/file/${filename}`,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        createdAt: birthtime,
        updatedAt: stats.mtime.getTime()
      }
    })
    .sort((a, b) => b.lastModified - a.lastModified)
  return files
}

app.get('/api/captcha', (req, res) => {
  try {
    const captchaId = generateCaptchaId()
    const code = generateCaptchaCode()
    const svg = generateCaptchaSVG(code)
    
    captchaStore.set(captchaId, {
      code,
      expires: Date.now() + 5 * 60 * 1000
    })
    
    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('X-Captcha-Id', captchaId)
    res.status(200).send(svg)
  } catch (error) {
    res.status(500).json({ error: '生成验证码失败' })
  }
})

app.post('/api/login', (req, res) => {
  try {
    const { username, password, captchaId, captchaCode } = req.body

    if (!username || !password || !captchaId || !captchaCode) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    const captchaData = captchaStore.get(captchaId)
    if (!captchaData || captchaData.expires < Date.now()) {
      return res.status(400).json({ success: false, message: '验证码已过期' })
    }

    if (captchaData.code.toLowerCase() !== captchaCode.toLowerCase()) {
      captchaStore.delete(captchaId)
      return res.status(400).json({ success: false, message: '验证码错误' })
    }

    captchaStore.delete(captchaId)

    const logDir = join(__dirname, 'log')
    const loginFilePath = join(logDir, 'login')

    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    // Create login file with default credentials if it doesn't exist
    if (!existsSync(loginFilePath)) {
      writeFileSync(loginFilePath, '[admin]:[admin123]', 'utf-8')
    }

    const loginContent = readFileSync(loginFilePath, 'utf-8')
    const match = loginContent.match(/\[([^\]]+)\]:\[([^\]]+)\]/)

    if (!match) {
      return res.status(500).json({ success: false, message: '登录配置格式错误' })
    }

    const validUsername = match[1]
    const validPassword = match[2]

    if (username === validUsername && password === validPassword) {
      res.json({ success: true, message: '登录成功' })
    } else {
      res.status(401).json({ success: false, message: '账号或密码错误' })
    }
  } catch (error) {
    console.error('login error:', error)
    res.status(500).json({ success: false, message: '登录验证失败' })
  }
})

app.post('/api/update-login', (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body
    if (!currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    const logDir = join(__dirname, 'log')
    const loginFilePath = join(logDir, 'login')

    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    // Create login file with default credentials if it doesn't exist
    if (!existsSync(loginFilePath)) {
      writeFileSync(loginFilePath, '[admin]:[admin123]', 'utf-8')
    }

    const loginContent = readFileSync(loginFilePath, 'utf-8')
    const match = loginContent.match(/\[([^\]]+)\]:\[([^\]]+)\]/)
    if (!match) {
      return res.status(500).json({ success: false, message: '登录配置格式错误' })
    }

    const validPassword = match[2]
    if (currentPassword !== validPassword) {
      return res.status(401).json({ success: false, message: '当前密码错误' })
    }

    const newContent = `[${newUsername}]:[${newPassword}]`
    writeFileSync(loginFilePath, newContent, 'utf-8')
    res.json({ success: true, message: '修改成功，请使用新账号重新登录' })
  } catch (error) {
    console.error('update-login error:', error)
    res.status(500).json({ success: false, message: '修改失败' })
  }
})

app.get('/api/files', (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10)
    const pageSize = parseInt(req.query.pageSize || '20', 10)
    
    const fileList = loadFileList()
    const total = fileList.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedFiles = fileList.slice(startIndex, endIndex)
    
    const responseData = {
      data: paginatedFiles,
      total,
      page,
      pageSize,
      hasMore: endIndex < total
    }
    
    res.json(responseData)
  } catch (error) {
    res.status(500).json({ error: '获取文件列表失败' })
  }
})

app.get('/api/file/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const filePath = join(__dirname, 'file', filename)
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    const content = fs.readFileSync(filePath, 'utf-8')
    res.json({ content })
  } catch (error) {
    res.status(500).json({ error: '获取文件内容失败' })
  }
})

app.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const filePath = join(__dirname, 'file', filename)
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    const content = fs.readFileSync(filePath, 'utf-8')
    res.send(content)
  } catch (error) {
    res.status(500).json({ error: '获取文件内容失败' })
  }
})

app.get('/log/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const logDir = join(__dirname, 'log')
    const filePath = join(logDir, filename)
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    const content = readFileSync(filePath, 'utf-8')
    res.send(content)
  } catch (error) {
    res.status(500).json({ error: '读取文件失败' })
  }
})

app.get('/image/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const imageDir = join(__dirname, 'image')
    const imagePath = join(imageDir, filename)
    
    if (!existsSync(imagePath)) {
      return res.status(404).json({ error: '图片不存在' })
    }
    
    const ext = extname(filename).toLowerCase()
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }
    
    const contentType = contentTypes[ext] || 'image/jpeg'
    const content = readFileSync(imagePath)
    
    res.setHeader('Content-Type', contentType)
    res.status(200).send(content)
  } catch (error) {
    res.status(500).json({ error: '读取图片失败' })
  }
})

app.post('/api/save', (req, res) => {
  try {
    const { path: filePath, content } = req.body
    if (!filePath || !content) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const filename = filePath.replace('/file/', '')
    const fullPath = join(__dirname, 'file', filename)
    
    let oldContent = ''
    if (existsSync(fullPath)) {
      oldContent = readFileSync(fullPath, 'utf-8')
    }
    
    writeFileSync(fullPath, content, 'utf-8')
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: '保存失败' })
  }
})

app.post('/api/delete', (req, res) => {
  try {
    const { path: filePath } = req.body
    if (!filePath) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const filename = filePath.replace('/file/', '')
    const fullPath = join(__dirname, 'file', filename)
    
    let content = ''
    if (existsSync(fullPath)) {
      content = readFileSync(fullPath, 'utf-8')
    }
    
    deleteNoteImageRefs(content)
    
    unlinkSync(fullPath)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: '删除失败' })
  }
})

app.post('/api/create', (req, res) => {
  try {
    const { title } = req.body
    if (!title) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const fileDir = join(__dirname, 'file')
    const timestamp = Date.now()
    let filename = `${title}.md`
    let filePath = join(fileDir, filename)
    
    if (existsSync(filePath)) {
      filename = `${title}${timestamp}.md`
      filePath = join(fileDir, filename)
    }
    
    writeFileSync(filePath, '', 'utf-8')
    
    const stats = statSync(filePath)
    const note = {
      id: `${timestamp}`,
      filename,
      title: title,
      path: `/file/${filename}`,
      lastModified: stats.mtime.getTime(),
      createdAt: (stats.birthtime && stats.birthtime.getTime ? stats.birthtime.getTime() : stats.mtime.getTime()),
      updatedAt: stats.mtime.getTime()
    }
    
    res.json({ success: true, note })
  } catch (error) {
    res.status(500).json({ error: '创建失败' })
  }
})

app.post('/api/rename', (req, res) => {
  try {
    const { path: filePath, newTitle } = req.body
    if (!filePath || !newTitle) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const filename = filePath.replace('/file/', '')
    const oldFilePath = join(__dirname, 'file', filename)
    let newFilename = `${newTitle}.md`
    const newFilePath = join(__dirname, 'file', newFilename)
    
    if (!existsSync(oldFilePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    if (existsSync(newFilePath)) {
      const timestamp = Date.now()
      newFilename = `${newTitle}${timestamp}.md`
    }
    
    renameSync(oldFilePath, join(__dirname, 'file', newFilename))
    
    const stats = statSync(newFilePath)
    const note = {
      id: `${stats.mtime.getTime()}`,
      filename: newFilename,
      title: newTitle,
      path: `/file/${newFilename}`,
      lastModified: stats.mtime.getTime()
    }
    
    res.json({ success: true, note })
  } catch (error) {
    res.status(500).json({ error: '重命名失败' })
  }
})

app.post('/api/upload', (req, res) => {
  try {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString()
        const boundary = body.match(/--(.+?)\r\n/)?.[1]
        
        if (!boundary) {
          return res.status(400).json({ error: '无效的请求' })
        }
        
        const parts = body.split(`--${boundary}`)
        let filename = ''
        let fileContent = ''
        
        for (const part of parts) {
          const filenameMatch = part.match(/filename="(.+?)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
            const contentStart = part.indexOf('\r\n\r\n')
            fileContent = part.substring(contentStart + 4).replace(/\r\n$/, '')
            break
          }
        }
        
        if (!filename || !fileContent) {
          return res.status(400).json({ error: '无效的文件' })
        }
        
        if (!filename.endsWith('.md')) {
          return res.status(400).json({ error: '只支持 .md 文件' })
        }
        
        const fileDir = join(__dirname, 'file')
        const filePath = join(fileDir, filename)
        
        if (existsSync(filePath)) {
          return res.status(400).json({ error: '文件已存在' })
        }
        
        writeFileSync(filePath, fileContent, 'utf-8')
        
        const stats = statSync(filePath)
        const note = {
          id: `${stats.mtime.getTime()}`,
          filename,
          title: filename.replace(/\.md$/, ''),
          path: `/file/${filename}`,
          lastModified: stats.mtime.getTime()
        }
        
        res.json({ success: true, note })
      } catch (error) {
        res.status(500).json({ error: '上传失败' })
      }
    })
  } catch (error) {
    res.status(500).json({ error: '上传失败' })
  }
})

app.post('/api/upload-image', upload.single('file'), (req, res) => {
  try {
    const file = req.file
    const notePath = req.body.notePath

    if (!file) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const imageUrl = `/image/${file.filename}`

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ success: true, imageUrl })
  } catch (error) {
    res.status(500).json({ error: '上传图片失败' })
  }
})

app.post('/api/share', (req, res) => {
  try {
    cleanExpiredShares()
    
    const { path: filePath, expireDays } = req.body
    
    if (!filePath) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const filename = filePath.replace('/file/', '')
    const fileDir = join(__dirname, 'file')
    const pathToFile = join(fileDir, filename)
    
    if (!existsSync(pathToFile)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    const shareId = generateShareId()
    const sharesData = getSharesData()
    const expiresAt = expireDays ? Date.now() + expireDays * 24 * 60 * 60 * 1000 : null
    sharesData[shareId] = {
      filename,
      createdAt: Date.now(),
      expiresAt
    }
    saveSharesData(sharesData)
    
    const host = req.headers.host || `localhost:${PORT}`
    const shareUrl = `http://${host}/share/${shareId}`
    
    res.json({ success: true, shareId, shareUrl })
  } catch (error) {
    res.status(500).json({ error: '生成分享链接失败' })
  }
})

app.get('/api/share/:shareId', (req, res) => {
  try {
    const { shareId } = req.params
    const sharesData = getSharesData()
    const shareData = sharesData[shareId]
    
    if (!shareData) {
      return res.status(404).json({ error: '分享链接不存在或已过期' })
    }
    
    if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
      delete sharesData[shareId]
      saveSharesData(sharesData)
      return res.status(404).json({ error: '分享链接已过期' })
    }
    
    const fileDir = join(__dirname, 'file')
    const filePath = join(fileDir, shareData.filename)
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    const content = readFileSync(filePath, 'utf-8')
    res.json({ content, filename: shareData.filename })
  } catch (error) {
    res.status(500).json({ error: '获取分享内容失败' })
  }
})

const fileDirForBackup = join(__dirname, 'file')
const logDirForBackup = join(__dirname, 'log')

app.get('/api/backup', (req, res) => {
  try {
    const type = req.query.type || 'all'
    if (!['notes', 'data', 'all'].includes(type)) {
      return res.status(400).json({ error: '无效的备份类型' })
    }

    const zip = archiver('zip', { zlib: { level: 9 } })
    
    // 监听 archiver 错误
    zip.on('error', (err) => {
      console.error('Archiver error:', err)
      res.status(500).json({ error: '备份失败：' + err.message })
    })
    
    res.attachment(`backup-${type}-${Date.now()}.zip`)
    res.setHeader('Content-Type', 'application/zip')
    zip.pipe(res)

    if (type === 'notes' || type === 'all') {
      if (existsSync(fileDirForBackup)) {
        zip.directory(fileDirForBackup, type === 'all' ? 'file' : false)
      }
    }
    if (type === 'data' || type === 'all') {
      if (existsSync(logDirForBackup)) {
        zip.directory(logDirForBackup, type === 'all' ? 'log' : false)
      }
    }

    zip.finalize()
  } catch (error) {
    console.error('Backup error:', error)
    res.status(500).json({ error: '备份失败：' + error.message })
  }
})

const tempUploadDir = join(__dirname, 'temp-upload')
if (!existsSync(tempUploadDir)) {
  mkdirSync(tempUploadDir, { recursive: true })
}
const restoreUpload = multer({ dest: tempUploadDir })

app.post('/api/restore', restoreUpload.single('file'), async (req, res) => {
  let tempExtractDir = ''
  try {
    const file = req.file
    if (!file || !file.path) {
      return res.status(400).json({ success: false, message: '请上传备份文件' })
    }

    tempExtractDir = join(__dirname, `temp-extract-${Date.now()}`)
    mkdirSync(tempExtractDir, { recursive: true })

    try {
      const { default: extract } = await import('extract-zip')
      await extract(file.path, { dir: tempExtractDir })
    } catch (e) {
      if (existsSync(file.path)) unlinkSync(file.path)
      return res.status(400).json({ success: false, message: '无效的备份文件或解压失败' })
    }

    let dataRestored = false
    const extractedFileDir = join(tempExtractDir, 'file')
    const extractedLogDir = join(tempExtractDir, 'log')

    if (existsSync(extractedFileDir)) {
      mkdirSync(fileDirForBackup, { recursive: true })
      const files = readdirSync(extractedFileDir)
      for (const name of files) {
        const src = join(extractedFileDir, name)
        if (statSync(src).isFile()) {
          copyFileSync(src, join(fileDirForBackup, name))
        }
      }
    } else {
      const rootFiles = readdirSync(tempExtractDir)
      const mdFiles = rootFiles.filter(f => statSync(join(tempExtractDir, f)).isFile() && f.endsWith('.md'))
      if (mdFiles.length > 0) {
        mkdirSync(fileDirForBackup, { recursive: true })
        for (const name of mdFiles) {
          copyFileSync(join(tempExtractDir, name), join(fileDirForBackup, name))
        }
      }
    }

    if (existsSync(extractedLogDir)) {
      dataRestored = true
      mkdirSync(logDirForBackup, { recursive: true })
      const logFiles = readdirSync(extractedLogDir)
      for (const name of logFiles) {
        const src = join(extractedLogDir, name)
        if (statSync(src).isFile()) {
          copyFileSync(src, join(logDirForBackup, name))
        }
      }
    } else {
      const rootItems = readdirSync(tempExtractDir)
      if (rootItems.some(f => f === 'login' || f === 'shares.json')) {
        dataRestored = true
        mkdirSync(logDirForBackup, { recursive: true })
        for (const name of rootItems) {
          const src = join(tempExtractDir, name)
          if (statSync(src).isFile()) {
            copyFileSync(src, join(logDirForBackup, name))
          }
        }
      }
    }

    if (existsSync(file.path)) unlinkSync(file.path)
    const { rmSync } = await import('fs')
    if (tempExtractDir && existsSync(tempExtractDir)) {
      rmSync(tempExtractDir, { recursive: true, force: true })
    }

    res.json({ success: true, dataRestored })
  } catch (error) {
    if (tempExtractDir && existsSync(tempExtractDir)) {
      const { rmSync } = await import('fs')
      rmSync(tempExtractDir, { recursive: true, force: true })
    }
    res.status(500).json({ success: false, message: '恢复失败' })
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
})
