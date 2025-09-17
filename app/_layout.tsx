import { Stack } from "expo-router";
import { tamaguiConfig } from "@/tamagui.config"
import {TamaguiProvider} from "tamagui"

export default function RootLayout() {
  return (
  <TamaguiProvider config={tamaguiConfig}>
    <Stack />
  </TamaguiProvider>
  )
}
