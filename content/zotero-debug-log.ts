declare const Zotero: any
declare const Components: any

import { DebugLog as DebugLogSender } from 'zotero-plugin/debug-log'

const MB = 1024 * 1024 // eslint-disable-line @typescript-eslint/no-magic-numbers

class DebugLog {
  private memory = Components.classes['@mozilla.org/memory-reporter-manager;1'].getService(Components.interfaces.nsIMemoryReporterManager)

  public load(): void {
    DebugLogSender.register('Debug Log', [])

    this.memory.init()
    setInterval(() => { Zotero.debug(`Zotero memory use: ${this.memory.resident / MB}`) }, 10000) // eslint-disable-line @typescript-eslint/no-magic-numbers
  }
}

Zotero.DebugLog = Zotero.DebugLog || new DebugLog
