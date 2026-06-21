import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ru.stroycontrol.app',
  appName: 'СтройКонтроль',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
