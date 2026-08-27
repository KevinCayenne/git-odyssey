import type { NextConfig } from 'next'

/**
 * 一份設定，兩種輸出。
 *
 * 平常（含 Vercel）就是一般的 Next 應用。
 * 設了 STATIC_EXPORT=1 就吐出一包純靜態檔案，可以丟 GitHub Pages 或任何空間 ——
 * 這個站沒有後端、沒有 API route，所以兩種模式的內容完全一樣。
 *
 * BASE_PATH 是給「網址不在根目錄」的情況用的，
 * 例如 GitHub Pages 的 https://<帳號>.github.io/git-odyssey。
 */
const staticExport = process.env.STATIC_EXPORT === '1'
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport
    ? {
        output: 'export' as const,
        // 產生 play/index.html 而不是 play.html，
        // 這樣不管是哪一種靜態空間都送得出去
        trailingSlash: true,
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
}

export default nextConfig
