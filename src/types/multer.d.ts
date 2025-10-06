declare module 'multer' {
  const multer: any
  export = multer
  export default multer
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string
      originalname: string
      encoding: string
      mimetype: string
      size: number
      buffer: Buffer
    }
  }
}
