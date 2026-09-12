import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    application: "HeroPage Multi-Page Messenger SaaS",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.APP_ENV || "development",
  });
}
