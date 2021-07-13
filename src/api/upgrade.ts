import { API_BASE } from '@/config'
import fly, { flyAny } from './index'
export async function latestRelease(current: string = '', mode: string = 'auto') {
    const { data } = await fly.get('/3rdparty/github/cocogoat/releases/latest', { current, mode })
    let fileName
    let githubUrl
    for (const i of data.assets) {
        if (i.content_type === 'application/x-gzip' && i.name.includes('.exe.gz')) {
            fileName = i.name.replace('.exe.gz', '.exe')
            githubUrl = i.browser_download_url
            break
        }
    }
    return {
        version: data.tag_name.replace('v', ''),
        name: data.name,
        file: fileName,
        content: data.body,
        url: {
            download: githubUrl,
            fullPackage: `${API_BASE}/v1/ascension/${fileName}`,
            diffPackage: `${API_BASE}/v1/ascension/diff/${fileName}/$HASH.cocomilk`,
            diffCheck: `${API_BASE}/v1/ascension/diff/${fileName}/$HASH.cocomilk?TC_check`,
        },
        _raw: data,
    }
}
export async function checkPatch(url: any, hash: string) {
    await flyAny.head(url.diffCheck.replace('$HASH', hash))
    return url.diffPackage.replace('$HASH', hash)
}
