declare const Zotero: any
declare const Components: any

import Tar from 'tar-js'
const monkey_patch_marker = 'DebugLogMonkeyPatched'

type FileIO = {
  success: boolean
  key: string
  link: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function patch(object, method, patcher) {
  if (object[method][monkey_patch_marker]) return
  object[method] = patcher(object[method])
  object[method][monkey_patch_marker] = true
}

function debug(msg) {
  Zotero.debug(`debug-log: ${msg}`)
}

class DebugLog { // tslint:disable-line:variable-name
  private initialized = false
  private strings: any

  public async load() {
    if (this.initialized) return

    await Zotero.Schema.schemaUpdatePromise
    this.initialized = true

    this.strings = document.getElementById('zotero-debug-log-strings')
    debug('started')
  }

  private alert(title, body) {
    const ps = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService)
    ps.alert(null, title, body)
  }

  public async send() {
    await Zotero.Schema.schemaUpdatePromise

    try {
      const tape = new Tar()
      const key = Zotero.Utilities.generateObjectKey()

      const log = [
        await this.info(),
        Zotero.getErrors(true).join('\n\n'),
        Zotero.Debug.getConsoleViewerOutput().slice(-250000).join('\n'), // eslint-disable-line no-magic-numbers
      ].filter((txt: string) => txt).join('\n\n').trim()
      if (log) tape.append(`${key}/${key}.txt`, log)

      const rdf = await this.rdf()
      if (rdf) tape.append(`${key}/${key}.rdf`, rdf)

      const blob = new Blob([tape.out], { type: 'application/x-tar'})
      const formData = new FormData()
      formData.append('file', blob, `${Zotero.Utilities.generateObjectKey()}.tar`)

      const response = await this.post('https://file.io', formData)
      this.alert('Debug log ID', `${response.key}-${key}`)
    }
    catch (err) {
      this.alert('Debug log submission error', err.message)
    }
  }

  private async post(url: string, data: FormData): Promise<FileIO> {
    const response = await fetch(url, { method: 'POST', body: data })
    return (await response.json()) as FileIO
  }

  // general state of Zotero
  private async info() {
    let info = ''

    const appInfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo)
    info += `Application: ${appInfo.name} ${appInfo.version} ${Zotero.locale}\n`
    info += `Platform: ${Zotero.platform} ${Zotero.oscpu}\n`

    const addons = await Zotero.getInstalledExtensions()
    if (addons.length) {
      info += 'Addons:\n'
      for (const addon of addons) {
        info += `  ${addon}\n`
      }
    }

    return info
  }

  private rdf(): Promise<string> {
    return new Promise((resolve, reject) => {
      const items = Zotero.getActiveZoteroPane().getSelectedItems()
      if (items.length === 0) return resolve('')

      const translation = new Zotero.Translate.Export()
      translation.setItems(items)
      translation.setTranslator('14763d24-8ba0-45df-8f52-b8d1108e7ac9') // rdf

      translation.setHandler('done', (obj, success) => {
        if (success) {
          resolve(obj ? obj.string : undefined)
        }
        else {
          reject('translation failed')
        }
      })

      translation.translate()
    })
  }
}

Zotero.DebugLog = new DebugLog
