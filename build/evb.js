/*
 * Packager script using enigma virtual box and gzip
 */
const path = require('path')
const dayjs = require('dayjs')
const fsex = require('fs-extra')
const { promisify } = require('util')
const { pipeline } = require('stream')
const { createGzip } = require('zlib')
const evb = require('enigmavirtualbox')
const { spawn } = require('child_process')
const generateEvb = require('generate-evb')
const pipe = promisify(pipeline)

exports.default = async function (context) {
    const baseDir = context.outDir
    const projDir = path.dirname(baseDir)
    const distDir = path.join(baseDir, 'win-unpacked')
    const ouptDir = path.join(projDir, 'dist')
    const builDir = path.join(projDir, 'build')
    const packageJSON = await fsex.readJSON(path.join(projDir, 'package.json'))
    const build = dayjs().format('YYMMDDHHmm')
    const buildData = {
        type: process.env.BUILD_TYPE === 'REL' ? 'REL' : 'TES',
        timestamp: Date.now(),
    }
    await fsex.writeJSON(path.join(distDir, 'resources', 'data', 'build.json'), buildData)
    await fsex.rename(path.join(distDir, '椰羊cocogoat.exe'), path.join(distDir, 'cocogoat.exe'))
    await fsex.ensureDir(ouptDir)
    console.log('preparing evb file')
    const evbFile = path.join(baseDir, 'build.evb')
    const ouptFile = path.join(
        ouptDir,
        `cocogoat-v${packageJSON.version}-win64-${buildData.type.toLowerCase()}${build}.exe`,
    )
    generateEvb(evbFile, path.join(distDir, 'cocogoat.exe'), ouptFile, path.join(baseDir, 'win-unpacked'), {
        filter(fullPath, name) {
            if (name === 'cocogoat.exe') return false
            return true
        },
        evbOptions: {
            compressFiles: false,
        },
        templatePath: {
            project: path.join(builDir, 'evb-templates', 'project-template.xml'),
            dir: path.join(builDir, 'evb-templates', 'dir-template.xml'),
            file: path.join(builDir, 'evb-templates', 'file-template.xml'),
        },
    })

    /* 为虚拟路径创建占位符，并替换至evb文件中 */
    const emptyFile = path.join(baseDir, 'empty')
    await fsex.writeFile(emptyFile, '')
    let evbContent = (
        await fsex.readFile(evbFile, {
            encoding: 'ucs2',
        })
    ).toString()
    evbContent = evbContent.replace(/{{empty}}/g, emptyFile)
    await fsex.writeFile(evbFile, evbContent, {
        encoding: 'ucs2',
    })

    console.log('start packaging ' + evbFile)
    const evbexe = evb.path('cli')
    const child = spawn(evbexe, [evbFile])
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
    await new Promise((resolve) => {
        child.on('exit', resolve)
    })
    console.log('compressing as gzip')
    const gzip = createGzip({
        level: 9,
    })
    const source = fsex.createReadStream(ouptFile)
    const destination = fsex.createWriteStream(`${ouptFile}.gz`)
    await pipe(source, gzip, destination)
    console.log('evb done, output file is', `${ouptFile}.gz`)
}
