import { Plugin } from 'vite'
import { readdirSync, statSync, watch, writeFileSync, unlinkSync, existsSync, readFileSync, renameSync } from 'fs'
import { join } from 'path'

interface CaptchaData {
  code: string
  expires: number
}

interface ShareData {
  filename: string
  createdAt: number
  expiresAt: number | null
}

const captchaStore = new Map<string, CaptchaData>()

const generateCaptchaId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const generateShareId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 8)
  return `${timestamp}${random}`
}

const getSharesData = (): Record<string, ShareData> => {
  const sharesPath = join(process.cwd(), 'log', 'shares.json')
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

const saveSharesData = (data: Record<string, ShareData>) => {
  const sharesPath = join(process.cwd(), 'log', 'shares.json')
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
    console.log('已清理过期的分享记录')
  }
}

const generateCaptchaCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateCaptchaSVG = (code: string): string => {
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

export function fileListPlugin(): Plugin {
  const virtualModuleId = 'virtual:file-list'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  let fileList: any[] = []
  let fileWatcher: any = null

  const loadFileList = () => {
    const fileDir = join(process.cwd(), 'file')
    const files = readdirSync(fileDir)
      .filter(file => file.endsWith('.md'))
      .map(filename => {
        const filePath = join(fileDir, filename)
        const stats = statSync(filePath)
        return {
          filename,
          title: filename.replace(/\.md$/, ''),
          path: `/file/${filename}`,
          size: stats.size,
          lastModified: stats.mtime.getTime()
        }
      })
      .sort((a, b) => b.lastModified - a.lastModified)

    fileList = files
    return `export default ${JSON.stringify(files)}`
  }

  return {
    name: 'file-list-plugin',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return loadFileList()
      }
    },
    configureServer(server) {
      const fileDir = join(process.cwd(), 'file')
      const logDir = join(process.cwd(), 'log')
      
      fileWatcher = watch(fileDir, { recursive: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
          const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
          if (module) {
            server.moduleGraph.invalidateModule(module)
            server.ws.send({
              type: 'full-reload',
              path: '*'
            })
          }
        }
      })

      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/log/') && req.method === 'GET') {
          try {
            const urlWithoutQuery = req.url.split('?')[0]
            const filename = urlWithoutQuery.replace('/log/', '')
            const filePath = join(logDir, filename)
            
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
              res.statusCode = 200
              res.end(content)
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: '文件不存在' }))
            }
          } catch (error) {
            console.error('读取文件失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '读取文件失败' }))
          }
        } else if (req.url?.startsWith('/api/file/') && req.method === 'GET') {
          try {
            const urlWithoutQuery = req.url.split('?')[0]
            const filename = decodeURIComponent(urlWithoutQuery.replace('/api/file/', ''))
            const filePath = join(fileDir, filename)
            
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({ content }))
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: '文件不存在' }))
            }
          } catch (error) {
            console.error('读取文件失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '读取文件失败' }))
          }
        } else if (req.url?.startsWith('/file/') && req.method === 'GET') {
          try {
            const urlWithoutQuery = req.url.split('?')[0]
            const filename = decodeURIComponent(urlWithoutQuery.replace('/file/', ''))
            const filePath = join(fileDir, filename)
            
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
              res.statusCode = 200
              res.end(content)
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ error: '文件不存在' }))
            }
          } catch (error) {
            console.error('读取文件失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '读取文件失败' }))
          }
        } else if (req.url?.startsWith('/api/files') && req.method === 'GET') {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`)
            const page = parseInt(url.searchParams.get('page') || '1', 10)
            const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)

            const files = loadFileList()
            const fileList = JSON.parse(files.match(/export default (.+)/)?.[1] || '[]')
            
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
            
            console.log('API /api/files 返回:', { page, pageSize, total, hasMore: responseData.hasMore, dataCount: paginatedFiles.length })
            
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify(responseData))
          } catch (error) {
            console.error('获取文件列表失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '获取文件列表失败' }))
          }
        } else if (req.url === '/api/captcha' && req.method === 'GET') {
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
            res.statusCode = 200
            res.end(svg)
          } catch (error) {
            console.error('生成验证码失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '生成验证码失败' }))
          }
        } else if (req.url === '/api/login' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { username, password, captchaId, captchaCode } = data
                
                if (!username || !password || !captchaId || !captchaCode) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, message: '缺少必要参数' }))
                  return
                }

                const captchaData = captchaStore.get(captchaId)
                if (!captchaData || captchaData.expires < Date.now()) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, message: '验证码已过期' }))
                  return
                }

                if (captchaData.code.toLowerCase() !== captchaCode.toLowerCase()) {
                  captchaStore.delete(captchaId)
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, message: '验证码错误' }))
                  return
                }

                captchaStore.delete(captchaId)

                const logDir = join(process.cwd(), 'log')
                const loginFilePath = join(logDir, 'login')
                
                if (!existsSync(loginFilePath)) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ success: false, message: '登录配置文件不存在' }))
                  return
                }

                const loginContent = readFileSync(loginFilePath, 'utf-8')
                const match = loginContent.match(/\[([^\]]+)\]:\[([^\]]+)\]/)
                
                if (!match) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ success: false, message: '登录配置格式错误' }))
                  return
                }

                const validUsername = match[1]
                const validPassword = match[2]
                
                if (username === validUsername && password === validPassword) {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, message: '登录成功' }))
                } else {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 401
                  res.end(JSON.stringify({ success: false, message: '账号或密码错误' }))
                }
              } catch (error) {
                console.error('登录验证失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ success: false, message: '登录验证失败' }))
              }
            })
          } catch (error) {
            console.error('登录 API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, message: '服务器错误' }))
          }
        } else if (req.url === '/api/save' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { path, content } = data
                
                if (!path || !content) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '缺少必要参数' }))
                  return
                }

                const filename = path.replace('/file/', '')
                const filePath = join(fileDir, filename)
                
                writeFileSync(filePath, content, 'utf-8')
                
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
              } catch (error) {
                console.error('保存文件失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '保存失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url === '/api/delete' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { path } = data
                
                if (!path) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '缺少必要参数' }))
                  return
                }

                const filename = path.replace('/file/', '')
                const filePath = join(fileDir, filename)
                
                unlinkSync(filePath)
                
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
              } catch (error) {
                console.error('删除文件失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '删除失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url === '/api/create' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { title } = data
                
                if (!title) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '缺少必要参数' }))
                  return
                }

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
                  lastModified: stats.mtime.getTime()
                }
                
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, note }))
              } catch (error) {
                console.error('创建文件失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '创建失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url === '/api/upload' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const body = Buffer.concat(chunks).toString()
                const boundary = body.match(/--(.+?)\r\n/)?.[1]
                
                if (!boundary) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '无效的请求' }))
                  return
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
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '无效的文件' }))
                  return
                }
                
                if (!filename.endsWith('.md')) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '只支持 .md 文件' }))
                  return
                }
                
                const filePath = join(fileDir, filename)
                
                if (existsSync(filePath)) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '文件已存在' }))
                  return
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
                
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, note }))
              } catch (error) {
                console.error('上传文件失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '上传失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url === '/api/rename' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { path, newTitle } = data
                
                if (!path || !newTitle) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '缺少必要参数' }))
                  return
                }

                const filename = path.replace('/file/', '')
                const oldFilePath = join(fileDir, filename)
                let newFilename = `${newTitle}.md`
                const newFilePath = join(fileDir, newFilename)
                
                if (!existsSync(oldFilePath)) {
                  res.statusCode = 404
                  res.end(JSON.stringify({ error: '文件不存在' }))
                  return
                }
                
                if (existsSync(newFilePath)) {
                  const timestamp = Date.now()
                  newFilename = `${newTitle}${timestamp}.md`
                }
                
                renameSync(oldFilePath, join(fileDir, newFilename))
                
                const stats = statSync(newFilePath)
                const note = {
                  id: `${stats.mtime.getTime()}`,
                  filename: newFilename,
                  title: newTitle,
                  path: `/file/${newFilename}`,
                  lastModified: stats.mtime.getTime()
                }
                
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, note }))
              } catch (error) {
                console.error('重命名文件失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '重命名失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url === '/api/share' && req.method === 'POST') {
          try {
            cleanExpiredShares()
            
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => {
              try {
                const data = JSON.parse(Buffer.concat(chunks).toString())
                const { path, expireDays } = data
                
                console.log('生成分享链接请求:', { path, expireDays, data })
                
                if (!path) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: '缺少必要参数' }))
                  return
                }

                const filename = path.replace('/file/', '')
                const filePath = join(fileDir, filename)
                
                console.log('文件路径检查:', { filename, filePath, exists: existsSync(filePath) })
                
                if (!existsSync(filePath)) {
                  res.statusCode = 404
                  res.end(JSON.stringify({ error: '文件不存在' }))
                  return
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
                
                const shareUrl = `${req.headers.host ? `http://${req.headers.host}` : ''}/share/${shareId}`
                
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, shareId, shareUrl }))
              } catch (error) {
                console.error('生成分享链接失败:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: '生成分享链接失败' }))
              }
            })
          } catch (error) {
            console.error('API 错误:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '服务器错误' }))
          }
        } else if (req.url?.startsWith('/api/share/') && req.method === 'GET') {
          try {
            const shareId = req.url.replace('/api/share/', '')
            const sharesData = getSharesData()
            const shareData = sharesData[shareId]
            
            if (!shareData) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: '分享链接不存在或已失效' }))
              return
            }
            
            if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
              res.statusCode = 410
              res.end(JSON.stringify({ error: '分享链接已过期' }))
              return
            }
            
            const filePath = join(fileDir, shareData.filename)
            
            if (!existsSync(filePath)) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: '文件不存在' }))
              return
            }
            
            const content = readFileSync(filePath, 'utf-8')
            
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ content, filename: shareData.filename }))
          } catch (error) {
            console.error('获取分享文件失败:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: '获取分享文件失败' }))
          }
        } else {
          next()
        }
      })

      server.httpServer?.on('close', () => {
        if (fileWatcher) {
          fileWatcher.close()
        }
      })
    }
  }
}
