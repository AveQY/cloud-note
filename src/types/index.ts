export interface Note {
  id: string
  title: string
  filename: string
  path: string
  size?: number
  createdAt?: Date
  updatedAt?: Date | number
  categoryId?: string | null
  lastModified?: number
}
