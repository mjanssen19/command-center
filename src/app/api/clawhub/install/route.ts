import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export async function POST(request: NextRequest) {
  const body = await request.json()
  const slug = body?.slug

  if (!slug || typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ success: false, error: 'Invalid skill slug' }, { status: 400 })
  }

  const workspace = process.env.OPENCLAW_WORKSPACE_PATH
  if (!workspace) {
    return NextResponse.json({ success: false, error: 'OPENCLAW_WORKSPACE_PATH not configured' }, { status: 500 })
  }

  return new Promise<NextResponse>((resolve) => {
    exec(
      `npx clawhub@latest install ${slug}`,
      { cwd: workspace, timeout: 60000, env: { ...process.env, HOME: process.env.HOME || '/home/ubuntu' } },
      (error, stdout, stderr) => {
        if (error) {
          resolve(NextResponse.json({
            success: false,
            error: stderr || error.message,
            output: stdout,
          }, { status: 500 }))
        } else {
          resolve(NextResponse.json({
            success: true,
            output: stdout,
          }))
        }
      }
    )
  })
}
