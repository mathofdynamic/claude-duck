import { spawn } from 'child_process'

export async function askClaude(prompt) {
  return new Promise((resolve, reject) => {
    // Strip CLAUDECODE so the CLI doesn't refuse nested sessions
    const env = { ...process.env }
    delete env.CLAUDECODE

    // Pass prompt via stdin (not as a shell arg) — avoids escaping issues and hangs.
    // --dangerously-skip-permissions suppresses any interactive permission prompts.
    const proc = spawn(
      'claude',
      ['-p', '--output-format', 'json', '--dangerously-skip-permissions'],
      {
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    )

    // Write prompt to stdin and close it so claude knows input is done
    proc.stdin.write(prompt)
    proc.stdin.end()

    let output = ''
    let errorOutput = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString()
      console.error('[claude stderr]', data.toString())
    })

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          // --output-format json wraps the response: { result: "...", ... }
          const parsed = JSON.parse(output.trim())
          resolve(parsed.result ?? output.trim())
        } catch {
          // Fallback: return raw output if it's not JSON
          resolve(output.trim())
        }
      } else {
        reject(new Error(`claude exited with code ${code}: ${errorOutput.trim()}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn claude CLI: ${err.message}`))
    })
  })
}
