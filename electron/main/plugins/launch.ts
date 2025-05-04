import type { Context } from 'cordis'
import AutoLaunch from 'auto-launch'

declare module 'cordis' {
  interface Events {
    'auto-launch-switch': (enable: boolean, isHidden: boolean) => void
  }
}

class Launch {
  static inject = ['app']
  launch: AutoLaunch

  constructor(ctx: Context) {
    ctx.on('auto-launch-switch', async (enable, isHidden) => {
      const launch = new AutoLaunch({
        name: 'aircraft-electron',
        path: ctx.app.app.getPath('exe'),
        isHidden,
      })
      if (enable) {
        await launch.enable()
      } else {
        launch.isEnabled().then(async (isEnabled) => {
          if (isEnabled) {
            await launch.disable()
          }
        })
      }
    })
  }
}

export { Launch }
