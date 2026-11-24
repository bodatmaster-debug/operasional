import { Suspense } from "react"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

async function TodosList() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos, error } = await supabase.from("todos").select()

  if (error) {
    const message =
      error.code === "PGRST205"
        ? "Tabel public.todos belum tersedia. Buat tabel todos di Supabase untuk menampilkan daftar ini."
        : "Data todos tidak dapat dimuat dari Supabase."

    return <p role="alert">{message}</p>
  }

  if (!todos?.length) {
    return <p>Belum ada todos.</p>
  }

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p>Memuat todos...</p>}>
      <TodosList />
    </Suspense>
  )
}
