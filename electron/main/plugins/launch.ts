import { Context } from 'cordis'
import AutoLaunch from 'auto-launch'
import type { } from '../service/win'

declare module 'cordis' {
  interface Events {
    'auto-launch-switch': (enable: boolean, isHidden: boolean) => void
  }
}

class Launch {
  static inject = ['app']
  launch: AutoLaunch
  constructor(ctx: Context) {
    ctx.on('auto-launch-switch', (enable, isHidden) => {
      const launch = new AutoLaunch({
        name: 'aircraft-electron',
        path: ctx.app.app.getPath('exe'),
        isHidden,
      })
      if (enable) {
        launch.enable()
      } else {
        launch.isEnabled().then((isEnabled) => {
          if (isEnabled) {
            launch.disable()
          }
        })
      }
    })
  }
}

export { Launch }
