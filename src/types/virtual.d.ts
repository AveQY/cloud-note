declare module 'virtual:file-list' {
  const files: Array<{
    filename: string
    title: string
    path: string
    lastModified: number
  }>
  export default files
}
