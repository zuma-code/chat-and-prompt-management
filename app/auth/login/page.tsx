import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">ChatPrompt Manager</h1>
          <p className="text-muted-foreground mt-2">Professional AI conversation and prompt management</p>
        </div>

        <LoginForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
