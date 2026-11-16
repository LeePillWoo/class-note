import { Capacitor } from '@capacitor/core'

/**
 * 글자 파일을 내보냅니다.
 * - 앱(APK): 앱 임시 폴더에 쓴 뒤 안드로이드 공유 창을 엽니다. (카카오톡 나에게 보내기, 드라이브 등) 저장 권한이 필요 없습니다.
 *   학생 정보가 든 파일이 임시 폴더에 쌓이지 않게, 쓰기 전에 지난번에 보낸 파일을 지웁니다.
 *   (방금 보낸 파일은 받는 앱이 나중에 읽을 수 있어서 바로 지우지 않습니다)
 * - 브라우저: 내려받기 폴더로 저장됩니다.
 */
export async function exportTextFile(fileName: string, text: string, title: string): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    try {
      const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache })
      await Promise.all(files.filter((file) => file.name.endsWith('.json')).map((file) => Filesystem.deleteFile({ path: file.name, directory: Directory.Cache })))
    } catch {
      // 지난 파일을 못 지워도 내보내기는 계속합니다.
    }
    const written = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title, files: [written.uri] })
    return 'shared'
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
