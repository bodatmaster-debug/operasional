"use client"

import { useRouter } from "next/navigation"
import { LocalAuthScreen } from "@/components/local-auth-screen"

export default function SignupPage() {
  const router = useRouter()

  return (
    <LocalAuthScreen
      setupRequired={false}
      mode="register"
      onAuthenticated={() => router.replace("/")}
    />
  )
}
