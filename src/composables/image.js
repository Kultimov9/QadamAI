// Ресайз и сжатие изображения (dataUrl) в jpeg Blob через canvas.
// Уменьшает по большей стороне до max px, чтобы не грузить тяжёлые фото.
export function resizeToJpegBlob(dataUrl, max = 512, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}
